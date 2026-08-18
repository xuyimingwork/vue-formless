import {
  defineComponent,
  h,
  markRaw,
  type Component,
  type PropType,
  type VNodeChild,
} from 'vue'
import { camelToPascal, pascalToCamel, type CamelToPascal } from './case'
import {
  applyControlModel,
  primaryModelKey,
  resolveControlModel,
  type ControlModel,
} from './controlModel'
import { useFormContext } from './context'

export type { ControlModel }

export interface ControlSchema {
  label?: string
  /** Control UI (may include FormItem). Receives label/rules/prop and v-model bindings from formless. */
  component?: Component
  /** Default props merged into the control (not v-model). */
  props?: Record<string, unknown>
  rules?: unknown
  /**
   * How this control maps onto the FormView model.
   * - omit: `{ modelValue: <controlKey> }`
   * - string: `{ modelValue: thatKey }`  e.g. `model: 'name'`
   * - object: v-model name → form key, e.g. `{ title: 'name' }` or `{ start: 'startTime', end: 'endTime' }`
   */
  model?: ControlModel
}

export type FormControlsSchema = Record<string, ControlSchema>

export type NamespacedControls<S extends FormControlsSchema> = {
  [K in keyof S & string as CamelToPascal<K>]: Component
}

/**
 * Build a static namespaced control table (ADR-009).
 * Schema keys are camelCase control names → `<User.TimeRange />`.
 */
export function createFormControls<S extends FormControlsSchema>(schema: S): NamespacedControls<S> {
  const normalized = normalizeSchema(schema)
  const cache = new Map<string, Component>()

  const handler: ProxyHandler<object> = {
    get(_target, rawKey) {
      if (typeof rawKey === 'symbol') return undefined
      const pascalKey = String(rawKey)
      if (pascalKey === '__vccOpts' || pascalKey === 'constructor') return undefined

      if (pascalKey.length === 0 || pascalKey === pascalToCamel(pascalKey)) {
        return undefined
      }

      const controlKey = pascalToCamel(pascalKey)
      const control = normalized[controlKey as keyof S] as ControlSchema | undefined
      if (!control) return undefined

      const cached = cache.get(controlKey)
      if (cached) return cached

      const mapping = resolveControlModel(controlKey, control.model)
      const propKey = primaryModelKey(mapping, controlKey)

      const Control = defineComponent({
        name: `Control_${camelToPascal(controlKey)}`,
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
        setup(controlProps, { attrs, slots }) {
          const ctx = useFormContext()

          return (): VNodeChild => {
            const label = controlProps.label !== undefined ? controlProps.label : control.label
            const rules = controlProps.rules !== undefined ? controlProps.rules : control.rules
            const widget =
              (controlProps.component ? markRaw(controlProps.component) : undefined) ??
              control.component
            const mergedProps = {
              ...control.props,
              ...controlProps.props,
              ...attrs,
            }
            const modelBindings = applyControlModel(ctx.model, mapping)

            const body = widget
              ? h(
                  widget,
                  {
                    ...mergedProps,
                    ...modelBindings,
                    label,
                    rules,
                    prop: propKey,
                    name: propKey,
                    disabled: ctx.disabled || ctx.readonly,
                    readonly: ctx.readonly,
                  },
                  slots,
                )
              : h(
                  'div',
                  { class: 'vue-formless-control', 'data-control': controlKey },
                  [
                    label ? h('label', { class: 'vue-formless-control__label' }, label) : null,
                    String(ctx.model[propKey] ?? ''),
                  ],
                )

            const grid = ctx.grid
            if (controlProps.bare || !grid?.layout || !grid.Col) return body

            const span = controlProps.span ?? ctx.defaultSpan ?? Math.floor(grid.total / 2)
            return h(grid.Col, { span }, () => body)
          }
        },
      })

      cache.set(controlKey, Control)
      return Control
    },
  }

  return new Proxy({}, handler) as NamespacedControls<S>
}

function normalizeSchema<S extends FormControlsSchema>(schema: S): S {
  const out = { ...schema }
  for (const key of Object.keys(out)) {
    const item = out[key]
    if (!item) continue
    out[key as keyof S] = {
      ...item,
      component: item.component ? markRaw(item.component) : item.component,
    } as S[keyof S]
  }
  return out
}
