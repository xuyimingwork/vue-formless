import {
  defineComponent,
  h,
  markRaw,
  type DefineComponent,
  type PropType,
  type VNodeChild,
} from 'vue'
import { camelToPascal, type CamelToPascal } from './case'
import {
  applyControlBinding,
  resolveControlBinding,
  type ControlProp,
  type ResolvedControlBinding,
} from './control-model'
import { getIn } from './model-path'
import { useFormContext } from './context'
import {
  declaredFl,
  omitShellKeys,
  readWidgetFormless,
  schemaExtras,
  stripPortBindings,
} from './fl-config'
import type {
  ControlSchema,
  FormControlProps,
  ItemFl,
} from './item-adapter'
import { overlayProps, resolveProps, type HostProps } from './overlay-props'
import { splitFallthrough, splitFlAttrs, splitSlots } from './split-fallthrough'
import {
  provideControlRuntime,
  useFormItem,
  type ControlFrame,
} from './use-form-item'

export type { ControlProp, ControlVModel } from './control-model'
export type {
  ControlSchema,
  FormControlProps,
  ItemFl,
} from './item-adapter'
export type { HostProps } from './overlay-props'
export type { WrapControl, WrapControlMeta } from './wrap-control'

export interface CreateFormControlsOptions {
  /** Defaults for every control in this cluster (static or from the cell snapshot). */
  props?: HostProps<ItemFl>
}

/** Loose schema bag. Prefer inferring `S` from an object literal via `createFormControls`. */
export type FormControlsSchema = Record<string, ControlSchema>

export type FormControlComponent = DefineComponent<FormControlProps>

/**
 * PascalCase control tags. `S` must not be `Record<string, _>` or `keyof` collapses
 * to `string` and Volar/TS lose `User.Name` / `User.IdCard` as named keys.
 */
export type NamespacedControls<S> = {
  [K in keyof S & string as CamelToPascal<K>]: FormControlComponent
}

const controlFlProps = {
  'fl:prop': { type: [String, Array] as PropType<string | string[]>, default: undefined },
  'fl:span': { type: Number, default: undefined },
}

/**
 * Build a static namespaced control table (ADR-009).
 * Schema keys are camelCase control names → `<User.TimeRange />`.
 */
export function createFormControls<S extends { [K in keyof S]: ControlSchema }>(
  schema: S,
  options?: CreateFormControlsOptions,
): NamespacedControls<S> {
  const normalized = normalizeSchema(schema)
  const result = {} as NamespacedControls<S>

  for (const controlKey of Object.keys(normalized) as (keyof S & string)[]) {
    const item = normalized[controlKey]
    if (!item) continue
    const pascalKey = camelToPascal(controlKey) as CamelToPascal<typeof controlKey> &
      keyof NamespacedControls<S>
    result[pascalKey] = createNamespacedControl(
      controlKey,
      item,
      options,
    ) as NamespacedControls<S>[typeof pascalKey]
  }

  return result
}

function createNamespacedControl(
  controlKey: string,
  control: ControlSchema,
  cluster?: CreateFormControlsOptions,
): FormControlComponent {
  const widgetFormless = readWidgetFormless(control.component)
  const lockedModel = widgetFormless.model ?? control.model
  const schemaSkipItem = control.item === false || widgetFormless.item === false
  const schemaSkipLayout = control.layout === false || widgetFormless.layout === false

  return defineComponent({
    name: `Control_${camelToPascal(controlKey)}`,
    inheritAttrs: false,
    props: controlFlProps,
    setup(controlProps, { attrs, slots }) {
      const ctx = useFormContext()
      let frame!: ControlFrame
      provideControlRuntime({
        controlKey,
        getFrame: () => frame,
      })
      const Cell = useFormItem()

      return (): VNodeChild => {
        const { fl: attrFl, rest } = splitFlAttrs(attrs as Record<string, unknown>)
        const tagFl = { ...attrFl, ...declaredFl(controlProps as Record<string, unknown>) }
        const binding = resolveControlBinding(
          controlKey,
          { model: lockedModel, prop: control.prop },
          {
            prop: tagFl.prop as ControlProp | undefined,
          },
        )
        const widget = control.component

        const { itemSlots, inputSlots } = splitSlots(slots)
        const { itemAttrs, itemOn, inputAttrs } = splitFallthrough(rest)

        const extras = schemaExtras(control as Record<string, unknown>)
        const snapshot = inputSnapshot(ctx, controlKey, binding, extras, tagFl)
        const mergedProps = overlayProps(
          resolveProps(cluster?.props, snapshot),
          resolveProps(control.props, snapshot),
          stripPortBindings(inputAttrs, binding.models),
        )
        const modelBindings = applyControlBinding(ctx.model, binding, ctx.update)
        const displayProp = binding.props[0] ?? controlKey
        const label = typeof snapshot.label === 'string' ? snapshot.label : undefined

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
                label ? h('label', { class: 'vue-formless-control__label' }, String(label)) : null,
                String(getIn(ctx.model, displayProp) ?? ''),
              ],
            )

        frame = {
          fl: {
            ...extras,
            ...omitShellKeys(tagFl),
          },
          binding,
          skipOuterItem: schemaSkipItem || tagFl.item === false,
          skipOuterLayout: schemaSkipLayout || tagFl.layout === false,
          itemAttrs,
          itemOn,
          itemSlots,
        }

        return h(Cell, null, () => body)
      }
    },
  }) as FormControlComponent
}

function inputSnapshot(
  ctx: ReturnType<typeof useFormContext>,
  controlKey: string,
  binding: ResolvedControlBinding,
  extras: Record<string, unknown>,
  tagFl: Record<string, unknown>,
): ItemFl {
  return {
    ...extras,
    ...omitShellKeys(tagFl),
    controlKey,
    binding,
    getValues: () => binding.props.map((p) => getIn(ctx.model, p)),
  }
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
