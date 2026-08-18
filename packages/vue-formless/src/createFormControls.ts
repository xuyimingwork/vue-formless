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
  resolveFormItemProp,
  type ControlNavPath,
  type ControlProp,
  type ControlVModel,
} from './controlModel'
import { getIn } from './modelPath'
import { useFormContext } from './context'
import {
  resolveValidatePolicy,
  type IdentityRules,
} from './identityRules'
import { splitFallthrough, splitSlots } from './splitFallthrough'

export type { ControlNavPath, ControlProp, ControlVModel }
export type { IdentityRule, IdentityRules, ValidatePolicy, ToRules } from './identityRules'

export interface ControlSchema {
  label?: string
  /** Input widget only (no FormItem). Receives v-model bindings from formless. */
  component?: Component
  /** Default props merged into the input (not v-model). */
  props?: Record<string, unknown>
  /** Identity rules: empty / format. Not host RuleItem[]. */
  rules?: IdentityRules
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
}

/** Tag-side Formless config (ADR-012). Extensible; does not steal input prop names. */
export interface FormlessAttr {
  span?: number
  bare?: boolean
  label?: string
  required?: boolean
  novalidate?: boolean
  prop?: ControlProp
  path?: ControlNavPath
  component?: Component
  /** Escape: replace identity rules for this render. */
  rules?: IdentityRules
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

      return (): VNodeChild => {
        const fl = controlProps.formless ?? {}
        const binding = resolveControlBinding(
          controlKey,
          { model: control.model, prop: control.prop, path: control.path },
          { prop: fl.prop, path: fl.path },
        )
        const itemProp = resolveFormItemProp(binding, controlKey)
        const label = fl.label !== undefined ? fl.label : control.label
        const identityRules = fl.rules !== undefined ? fl.rules : control.rules
        const policy = resolveValidatePolicy(fl)
        const widget =
          (fl.component ? markRaw(fl.component) : undefined) ?? control.component

        const { itemSlots, inputSlots } = splitSlots(slots)
        const { itemOn, inputAttrs } = splitFallthrough(attrs as Record<string, unknown>)

        const mergedProps = {
          ...control.props,
          ...inputAttrs,
        }
        const modelBindings = applyControlBinding(ctx.model, binding, ctx.update)
        const displayProp = binding.props[0] ?? controlKey
        const disabled = Boolean(ctx.disabled || ctx.readonly || mergedProps.disabled)
        const readonly = Boolean(ctx.readonly || mergedProps.readonly)

        let body: VNodeChild = widget
          ? h(
              widget,
              {
                ...mergedProps,
                ...modelBindings,
                disabled,
                readonly,
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

        const item = ctx.item
        if (item?.Item) {
          const compiledRules = item.toRules?.(identityRules, policy)
          body = h(
            item.Item,
            {
              label,
              prop: itemProp,
              rules: compiledRules,
              required: policy === 'required',
              ...itemOn,
            },
            {
              ...itemSlots,
              default: () => body,
            },
          )
        }

        const grid = ctx.grid
        if (fl.bare || !grid?.layout || !grid.Col) return body

        const span = fl.span ?? ctx.defaultSpan ?? Math.floor(grid.total / 2)
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
