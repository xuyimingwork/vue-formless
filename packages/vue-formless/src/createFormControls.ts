import {
  defineComponent,
  h,
  markRaw,
  type Component,
  type DefineComponent,
  type PropType,
  type VNodeChild,
} from 'vue'
import { camelToPascal, type CamelToPascal } from './case'
import {
  applyControlBinding,
  primaryPath,
  resolveControlBinding,
  type ControlPath,
  type ControlVModel,
} from './controlModel'
import { useFormContext } from './context'

export type { ControlPath, ControlVModel }

export interface ControlSchema {
  label?: string
  /** Control UI (may include FormItem). Receives label/rules/prop and v-model bindings from formless. */
  component?: Component
  /** Default props merged into the control (not v-model). */
  props?: Record<string, unknown>
  rules?: unknown
  /**
   * v-model names on the widget (ADR-011). Default `'modelValue'`.
   * Not overridable on the tag. Path binds a prefix of these ports.
   */
  model?: ControlVModel
  /**
   * Keys on the current FormView object (ADR-011). Default: control key.
   * Overridable on the tag via `path`. May be shorter than `model`.
   */
  path?: ControlPath
}

/** Loose schema bag. Prefer inferring `S` from an object literal via `createFormControls`. */
export type FormControlsSchema = Record<string, ControlSchema>

export interface FormControlProps {
  span?: number
  bare?: boolean
  label?: string
  rules?: unknown
  path?: ControlPath
  component?: Component
  props?: Record<string, unknown>
}

export type FormControlComponent = DefineComponent<FormControlProps>

/**
 * PascalCase control tags. `S` must not be `Record<string, _>` or `keyof` collapses
 * to `string` and Volar/TS lose `User.Name` / `User.IdCard` as named keys.
 */
export type NamespacedControls<S> = {
  [K in keyof S & string as CamelToPascal<K>]: FormControlComponent
}

/**
 * Build a static namespaced control table (ADR-009).
 * Schema keys are camelCase control names → `<User.TimeRange />`.
 */
export function createFormControls<S extends { [K in keyof S]: ControlSchema }>(
  schema: S,
): NamespacedControls<S> {
  const normalized = normalizeSchema(schema)
  const result = {} as NamespacedControls<S>

  for (const controlKey of Object.keys(normalized) as (keyof S & string)[]) {
    const item = normalized[controlKey]
    if (!item) continue
    const pascalKey = camelToPascal(controlKey) as CamelToPascal<typeof controlKey> &
      keyof NamespacedControls<S>
    result[pascalKey] = createNamespacedControl(controlKey, item) as NamespacedControls<S>[typeof pascalKey]
  }

  return result
}

function createNamespacedControl(controlKey: string, control: ControlSchema): FormControlComponent {
  return defineComponent({
    name: `Control_${camelToPascal(controlKey)}`,
    inheritAttrs: false,
    props: {
      span: { type: Number as PropType<number>, default: undefined },
      bare: { type: Boolean, default: false },
      label: { type: String as PropType<string>, default: undefined },
      rules: { type: [Array, Object] as PropType<unknown>, default: undefined },
      path: { type: [String, Array] as PropType<ControlPath>, default: undefined },
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
        const binding = resolveControlBinding(
          controlKey,
          { model: control.model, path: control.path },
          controlProps.path,
        )
        const propKey = primaryPath(binding, controlKey)
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
        const modelBindings = applyControlBinding(ctx.model, binding, ctx.update)

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
  }) as FormControlComponent
}

function normalizeSchema<S extends { [K in keyof S]: ControlSchema }>(schema: S): S {
  const out: Record<string, ControlSchema> = { ...(schema as Record<string, ControlSchema>) }
  for (const key of Object.keys(out)) {
    const item = out[key]
    if (!item) continue
    out[key] = {
      ...item,
      component: item.component ? markRaw(item.component) : item.component,
    }
  }
  return out as S
}
