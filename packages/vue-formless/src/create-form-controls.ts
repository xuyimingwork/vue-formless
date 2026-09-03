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
  type ControlProp,
  type ResolvedControlBinding,
} from './control-model'
import { getIn } from './model-path'
import { useFormContext } from './context'
import { mergeInternalItem, resolveControlShell } from './control-shell'
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
import { splitFallthrough, splitFlAttrs, splitLayoutAttrs, splitSlots, toOptionalNumber } from './split-fallthrough'
import {
  provideControlRuntime,
  useFormItem,
  type ControlFrame,
} from './use-form-item'
import type { WidgetTagProps } from './widget-props'
import type { ColPlace, ColSpanRaw } from '@vue-formless/layout'

export type { ControlProp, ControlVModel } from './control-model'
export type {
  ControlSchema,
  FormControlProps,
  ItemFl,
} from './item-adapter'
export type { HostProps } from './overlay-props'
export type { WrapControl, WrapControlMeta } from './wrap-control'
export type {
  ComponentPublicProps,
  LockedVModelKeys,
  WidgetTagProps,
} from './widget-props'
export {
  mergeInternalItem,
  resolveControlShell,
  type ControlItemSetting,
  type ResolvedControlShell,
} from './control-shell'

export interface CreateFormControlsOptions {
  /** Defaults for every control in this cluster (static or from the cell snapshot). */
  props?: HostProps<ItemFl>
}

/** Loose schema bag. Prefer inferring `S` from an object literal via `createFormControls`. */
export type FormControlsSchema = Record<string, ControlSchema>

/**
 * Constraint for `createFormControls` only. `component` stays `unknown` so object
 * literals keep `typeof ElInput` instead of widening to Vue's `Component`.
 */
type ControlSchemaInput = Omit<ControlSchema, 'component'> & {
  component?: unknown
}

export type FormControlComponent<P = {}> = DefineComponent<FormControlProps & P>

/**
 * PascalCase control tags. `S` must not be `Record<string, _>` or `keyof` collapses
 * to `string` and Volar/TS lose `User.Name` / `User.IdCard` as named keys.
 * Tag props are `fl:*` plus the widget's public props (v-model ports locked).
 */
export type NamespacedControls<S> = {
  [K in keyof S & string as CamelToPascal<K>]: FormControlComponent<WidgetTagProps<S[K]>>
}

const controlFlProps = {
  'fl:prop': { type: [String, Array] as PropType<string | string[]>, default: undefined },
  'fl:item': { type: Boolean, default: undefined },
  'col:span': { type: [String, Number] as PropType<ColSpanRaw>, default: undefined },
  'col:place': { type: String as PropType<ColPlace>, default: undefined },
  'row:column': { type: Number, default: undefined },
  'row:gutter': { type: Number, default: undefined },
}

/**
 * Build a static namespaced control table (ADR-009).
 * Schema keys are camelCase control names → `<User.TimeRange />`.
 */
export function createFormControls<const S extends { [K in keyof S]: ControlSchemaInput }>(
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
  control: ControlSchemaInput,
  cluster?: CreateFormControlsOptions,
): FormControlComponent {
  const widgetFormless = readWidgetFormless(control.component)
  const lockedModel = widgetFormless.model ?? control.model
  const internalItem = mergeInternalItem(widgetFormless.item, control.item)

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
        const { fl: attrFl, rest: afterFl } = splitFlAttrs(attrs as Record<string, unknown>)
        const { row, col, rest } = splitLayoutAttrs(afterFl)
        const tagFl = { ...attrFl, ...declaredFl(controlProps as Record<string, unknown>) }
        const binding = resolveControlBinding(
          controlKey,
          { model: lockedModel, prop: control.prop },
          {
            prop: tagFl.prop as ControlProp | undefined,
          },
        )
        const widget = control.component as Component | undefined

        const { itemSlots, inputSlots } = splitSlots(slots)
        const { itemAttrs, itemOn, inputAttrs } = splitFallthrough(rest)

        const extras = schemaExtras(control as Record<string, unknown>)
        const tagItem =
          tagFl.item === true ? true : tagFl.item === false ? false : undefined
        const shell = resolveControlShell({
          pageItem: ctx.isItemEnabled(),
          pageLayoutOn: ctx.isLayoutEnabled(),
          internalItem,
          tagItem,
        })
        const snapshot = inputSnapshot(ctx, controlKey, binding, extras, tagFl)
        const mergedProps = overlayProps(
          resolveProps(cluster?.props, snapshot),
          resolveProps(control.props, snapshot),
          stripPortBindings(inputAttrs, binding.models),
        )
        const modelBindings = applyControlBinding(ctx.model, binding, ctx.update)
        const displayProp = binding.props[0] ?? controlKey
        const label = typeof snapshot.label === 'string' ? snapshot.label : undefined
        const colSpan = (controlProps['col:span'] ?? col.span) as ColSpanRaw | undefined
        const colPlace = (controlProps['col:place'] ?? col.place) as ColPlace | undefined
        const rowColumn = toOptionalNumber(controlProps['row:column'] ?? row.column)
        const rowGutter = toOptionalNumber(controlProps['row:gutter'] ?? row.gutter)

        if (!shell.extraRow && (rowColumn != null || rowGutter != null)) {
          console.warn('[vue-formless] :row:* is ignored on a leaf control')
        }

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
          wrapItem: shell.wrapItem,
          wrapCol: shell.wrapCol,
          extraRow: shell.extraRow,
          colSpan,
          colPlace,
          rowColumn,
          rowGutter,
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

function normalizeSchema<S extends { [K in keyof S]: ControlSchemaInput }>(schema: S): S {
  const out: Record<string, ControlSchemaInput> = {
    ...(schema as Record<string, ControlSchemaInput>),
  }
  for (const key of Object.keys(out)) {
    const item = out[key]
    if (!item) continue
    out[key] = {
      ...item,
      component: item.component && typeof item.component === 'object'
        ? markRaw(item.component)
        : item.component,
    }
  }
  return out as S
}
