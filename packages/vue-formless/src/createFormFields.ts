import {
  defineComponent,
  h,
  markRaw,
  type Component,
  type PropType,
  type VNodeChild,
} from 'vue'
import { camelToPascal, pascalToCamel, type CamelToPascal } from './case'
import { useFormContext } from './context'

export interface FieldSchema {
  label?: string
  /** Default field UI (may include FormItem + control). Receives label/rules/prop from formless. */
  component?: Component
  /** Default props merged into the field component. */
  props?: Record<string, unknown>
  /** Default validation rules; passed through to `component`. */
  rules?: unknown
}

export type FormFieldsSchema = Record<string, FieldSchema>

/** Template namespace: schema `name` → `<User.Name />`. */
export type NamespacedFields<S extends FormFieldsSchema> = {
  [K in keyof S & string as CamelToPascal<K>]: Component
}

/**
 * Build static namespaced field components from a camelCase schema (ADR-003 / ADR-004).
 *
 * - Schema keys are camelCase (align with model); exposed components are PascalCase.
 * - Establishes default bindings (component / props / label / rules); render-time bindings override them.
 * - `markRaw` is applied inside the factory — callers need not wrap components.
 * - label / rules / prop are passed into `field.component` (FormItem lives inside that component).
 * - When FormView was created with Col and layout is on, wraps with Col(span).
 */
export function createFormFields<S extends FormFieldsSchema>(schema: S): NamespacedFields<S> {
  const normalized = normalizeSchema(schema)
  const cache = new Map<string, Component>()

  const handler: ProxyHandler<object> = {
    get(_target, rawKey) {
      if (typeof rawKey === 'symbol') return undefined
      const pascalKey = String(rawKey)
      if (pascalKey === '__vccOpts' || pascalKey === 'constructor') return undefined

      // Only expose PascalCase names (User.Name), not User.name
      if (pascalKey.length === 0 || pascalKey === pascalToCamel(pascalKey)) {
        return undefined
      }

      const fieldKey = pascalToCamel(pascalKey)
      const field = normalized[fieldKey as keyof S] as FieldSchema | undefined
      if (!field) return undefined

      const cached = cache.get(fieldKey)
      if (cached) return cached

      const Field = defineComponent({
        name: `Field_${camelToPascal(fieldKey)}`,
        inheritAttrs: false,
        props: {
          span: { type: Number as PropType<number>, default: undefined },
          bare: { type: Boolean, default: false },
          label: { type: String as PropType<string>, default: undefined },
          rules: { type: [Array, Object] as PropType<unknown>, default: undefined },
          component: {
            type: [Object, Function] as PropType<Component>,
            default: undefined,
          },
          props: {
            type: Object as PropType<Record<string, unknown>>,
            default: undefined,
          },
        },
        setup(fieldProps, { attrs, slots }) {
          const ctx = useFormContext()

          return (): VNodeChild => {
            const label = fieldProps.label !== undefined ? fieldProps.label : field.label
            const rules = fieldProps.rules !== undefined ? fieldProps.rules : field.rules
            const control =
              (fieldProps.component ? markRaw(fieldProps.component) : undefined) ?? field.component
            const mergedProps = {
              ...field.props,
              ...fieldProps.props,
              ...attrs,
            }

            const value = ctx.model[fieldKey]
            const onUpdate = (next: unknown) => {
              ctx.model[fieldKey] = next
            }

            const body = control
              ? h(
                  control,
                  {
                    ...mergedProps,
                    label,
                    rules,
                    prop: fieldKey,
                    name: fieldKey,
                    modelValue: value,
                    'onUpdate:modelValue': onUpdate,
                    disabled: ctx.disabled || ctx.readonly,
                    readonly: ctx.readonly,
                  },
                  slots,
                )
              : h(
                  'div',
                  { class: 'vue-formless-field', 'data-field': fieldKey },
                  [
                    label ? h('label', { class: 'vue-formless-field__label' }, label) : null,
                    String(value ?? ''),
                  ],
                )

            const grid = ctx.grid
            if (fieldProps.bare || !grid?.layout || !grid.Col) return body

            const span = fieldProps.span ?? ctx.defaultSpan ?? Math.floor(grid.total / 2)
            return h(grid.Col, { span }, () => body)
          }
        },
      })

      cache.set(fieldKey, Field)
      return Field
    },
  }

  return new Proxy({}, handler) as NamespacedFields<S>
}

function normalizeSchema<S extends FormFieldsSchema>(schema: S): S {
  const out = { ...schema }
  for (const key of Object.keys(out)) {
    const field = out[key]
    if (!field) continue
    out[key as keyof S] = {
      ...field,
      component: field.component ? markRaw(field.component) : field.component,
    } as S[keyof S]
  }
  return out
}
