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
  resolveControlBinding,
  type ControlNavPath,
  type ControlProp,
  type ControlVModel,
} from './control-model'
import { getIn } from './model-path'
import { useFormContext } from './context'
import { resolveValidatePolicy, type ControlValidation } from './identity-rules'
import type { FormlessAttr } from './item-adapter'
import { splitFallthrough, splitSlots } from './split-fallthrough'
import {
  provideControlRuntime,
  useFormItem,
  type ControlFrame,
} from './use-form-item'

export type { ControlNavPath, ControlProp, ControlVModel }
export type { FormlessAttr, ItemRenderInput } from './item-adapter'
export type { WrapControl, WrapControlMeta } from './wrap-control'
export type {
  IdentityRule,
  ControlValidation,
  ValidatePolicy,
} from './identity-rules'

export interface ControlSchema {
  label?: string
  /** Input widget only (no FormItem). Receives v-model bindings from formless. */
  component?: Component
  /** Default props merged into the input (not v-model). */
  props?: Record<string, unknown>
  /** How this value is checked. Not host FormItem rules. Not overridable on the tag. */
  validation?: ControlValidation
  /**
   * v-model names on the widget (ADR-011). Default `'modelValue'`.
   * Not overridable on the tag.
   */
  model?: ControlVModel
  /**
   * Leaf key(s) on the node reached by `path` (ADR-011). Default: control key.
   * Overridable via `:formless.prop`.
   */
  prop?: ControlProp
  /**
   * Navigation path from FormView root (ADR-011). Scalar string, e.g. `buyers[0]`, `[2]`.
   * Overridable via `:formless.path`.
   */
  path?: ControlNavPath
  /**
   * Outer wrap only: skip Item even when FormView `item` is on.
   * Same name as FormView; FormView is the default, this can only turn off.
   * Composites that call `useFormItem('start')` set `item: false` and `layout: false`.
   */
  item?: boolean
  /**
   * Outer wrap only: skip Col even when FormView `layout` is on.
   * Inner `useFormItem(port)` still follows FormView `layout`.
   */
  layout?: boolean
}

/** Loose schema bag. Prefer inferring `S` from an object literal via `createFormControls`. */
export type FormControlsSchema = Record<string, ControlSchema>

export interface FormControlProps {
  formless?: FormlessAttr
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
      formless: {
        type: Object as PropType<FormlessAttr>,
        default: undefined,
      },
    },
    setup(controlProps, { attrs, slots }) {
      const ctx = useFormContext()
      let frame!: ControlFrame
      provideControlRuntime({
        controlKey,
        skipOuterItem: control.item === false,
        skipOuterLayout: control.layout === false,
        getFrame: () => frame,
      })
      const Cell = useFormItem()

      return (): VNodeChild => {
        const fl = controlProps.formless ?? {}
        const binding = resolveControlBinding(
          controlKey,
          { model: control.model, prop: control.prop, path: control.path },
          { prop: fl.prop, path: fl.path },
        )
        const label = fl.label !== undefined ? fl.label : control.label
        const validate = resolveValidatePolicy(fl.validate)
        const widget = control.component

        const { itemSlots, inputSlots } = splitSlots(slots)
        const { itemAttrs, itemOn, inputAttrs } = splitFallthrough(
          attrs as Record<string, unknown>,
        )

        const mergedProps = {
          ...control.props,
          ...inputAttrs,
        }
        const modelBindings = applyControlBinding(ctx.model, binding, ctx.update)
        const displayProp = binding.props[0] ?? controlKey

        const body: VNodeChild = widget
          ? h(
              widget,
              {
                ...mergedProps,
                ...modelBindings,
              },
              inputSlots,
            )
          : h(
              'div',
              { class: 'vue-formless-control', 'data-control': controlKey },
              [
                label ? h('label', { class: 'vue-formless-control__label' }, label) : null,
                String(getIn(ctx.model, binding.path, displayProp) ?? ''),
              ],
            )

        frame = {
          formless: fl,
          binding,
          label,
          validate,
          validation: control.validation,
          itemAttrs,
          itemOn,
          itemSlots,
        }

        return h(Cell, null, () => body)
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
