import {
  defineComponent,
  h,
  provide,
  type Component,
  type DefineComponent,
  type PropType,
  type VNodeChild,
} from 'vue'
import { camelToPascal } from './case'
import {
  applyControlBinding,
  resolveControlBinding,
  type ControlProp,
  type ResolvedControlBinding,
} from './control-model'
import { useFormContext } from './context'
import {
  declaredFl,
  omitShellKeys,
  readWidgetFormless,
  schemaExtras,
  stripPortBindings,
} from './fl-config'
import { FormCell } from './FormCell'
import { FIELD_RUNTIME_KEY, type FieldRuntime } from './injection-keys'
import type {
  FieldCell,
  FieldSchema,
  FormFieldProps,
  ItemFl,
} from './item-adapter'
import { getIn } from './model-path'
import { overlayProps, resolveProps, type HostProps } from './overlay-props'
import {
  splitFallthrough,
  splitFlAttrs,
  splitLayoutAttrs,
  splitSlots,
  toOptionalNumber,
} from './split-fallthrough'
import type { ColPlace, ColSpanRaw } from '@vue-formless/layout'

export type { FormFieldProps } from './item-adapter'

export interface CreateFormFieldOptions {
  /** Defaults for every field in this cluster (static or from the cell snapshot). */
  props?: HostProps<ItemFl>
}

/**
 * Constraint for factories only. `component` stays `unknown` so object
 * literals keep `typeof ElInput` instead of widening to Vue's `Component`.
 */
export type FieldSchemaInput = Omit<FieldSchema, 'component'> & {
  component?: unknown
}

export type FormFieldComponent<P = {}> = DefineComponent<FormFieldProps & P>

const fieldFlProps = {
  'fl:prop': { type: [String, Array] as PropType<string | string[]>, default: undefined },
  'fl:item': { type: Boolean, default: undefined },
  'fl:cell': { type: String as PropType<FieldCell>, default: undefined },
  'col:span': { type: [String, Number] as PropType<ColSpanRaw>, default: undefined },
  'col:place': { type: String as PropType<ColPlace>, default: undefined },
  'row:column': { type: Number, default: undefined },
  'row:gutter': { type: Number, default: undefined },
}

function resolveCellMode(
  tagCell: unknown,
  widgetCell: FieldCell | undefined,
  schemaCell: FieldCell | undefined,
): FieldCell {
  if (tagCell === 'wrap' || tagCell === 'embed' || tagCell === 'wrap-embed') {
    return tagCell
  }
  return widgetCell ?? schemaCell ?? 'wrap'
}

function fieldSnapshot(
  ctx: ReturnType<typeof useFormContext>,
  fieldKey: string,
  binding: ResolvedControlBinding,
  extras: Record<string, unknown>,
  tagFl: Record<string, unknown>,
): ItemFl {
  return {
    ...extras,
    ...omitShellKeys(tagFl),
    fieldKey,
    binding,
    getValues: () => binding.props.map((p) => getIn(ctx.model, p)),
  }
}

/**
 * One namespaced Field: peel attrs once, provide FieldRuntime, `switch (cell)` (ADR-020).
 */
export function createFormFieldComponent(
  fieldKey: string,
  schema: FieldSchemaInput,
  cluster?: CreateFormFieldOptions,
): FormFieldComponent {
  const widgetFormless = readWidgetFormless(schema.component)
  const lockedModel = widgetFormless.model ?? schema.model
  const lockedProp = widgetFormless.prop ?? schema.prop
  const internalItem =
    widgetFormless.item !== undefined ? widgetFormless.item : schema.item
  const internalCell = widgetFormless.cell ?? schema.cell

  return defineComponent({
    name: `Field_${camelToPascal(fieldKey)}`,
    inheritAttrs: false,
    props: fieldFlProps,
    setup(fieldProps, { attrs, slots }) {
      const ctx = useFormContext()
      const runtime: FieldRuntime = {
        fieldKey,
        binding: { models: ['modelValue'], props: [fieldKey] },
        extras: {},
        item: internalItem,
      }
      provide(FIELD_RUNTIME_KEY, runtime)

      return (): VNodeChild => {
        const { fl: attrFl, rest: afterFl } = splitFlAttrs(attrs as Record<string, unknown>)
        const { row, col, rest } = splitLayoutAttrs(afterFl)
        const tagFl = { ...attrFl, ...declaredFl(fieldProps as Record<string, unknown>) }
        const binding = resolveControlBinding(
          fieldKey,
          { model: lockedModel, prop: lockedProp },
          {
            prop: tagFl.prop as ControlProp | undefined,
          },
        )
        const widget = schema.component as Component | undefined
        const extras = schemaExtras(schema as Record<string, unknown>)
        const cell = resolveCellMode(tagFl.cell, internalCell, schema.cell)

        runtime.binding = binding
        runtime.extras = extras
        runtime.item = internalItem

        const { itemSlots, inputSlots } = splitSlots(slots)
        const { itemAttrs, itemOn, inputAttrs } = splitFallthrough(rest)
        const snapshot = fieldSnapshot(ctx, fieldKey, binding, extras, tagFl)
        const mergedProps = overlayProps(
          resolveProps(cluster?.props, snapshot),
          resolveProps(schema.props, snapshot),
          stripPortBindings(inputAttrs, binding.models),
        )
        const modelBindings = applyControlBinding(ctx.model, binding, ctx.update)
        const displayProp = binding.props[0] ?? fieldKey
        const label = typeof snapshot.label === 'string' ? snapshot.label : undefined

        const colSpan = (fieldProps['col:span'] ?? col.span) as ColSpanRaw | undefined
        const colPlace = (fieldProps['col:place'] ?? col.place) as ColPlace | undefined
        const rowColumn = toOptionalNumber(fieldProps['row:column'] ?? row.column)
        const rowGutter = toOptionalNumber(fieldProps['row:gutter'] ?? row.gutter)

        if (cell !== 'wrap-embed' && (rowColumn != null || rowGutter != null)) {
          console.warn('[vue-formless] :row:* is ignored on a leaf field')
        }

        const input: VNodeChild = widget
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
              { class: 'vue-formless-field', 'data-field': fieldKey },
              [
                label ? h('label', { class: 'vue-formless-field__label' }, String(label)) : null,
                String(getIn(ctx.model, displayProp) ?? ''),
              ],
            )

        if (cell === 'embed') {
          return input
        }

        const cellAttrs: Record<string, unknown> = {
          ...itemAttrs,
          ...itemOn,
          ...(tagFl.item !== undefined ? { 'fl:item': tagFl.item } : {}),
          ...(colSpan !== undefined ? { 'col:span': colSpan } : {}),
          ...(colPlace !== undefined ? { 'col:place': colPlace } : {}),
        }
        for (const [key, value] of Object.entries(omitShellKeys(tagFl))) {
          cellAttrs[`fl:${key}`] = value
        }

        const cellBody =
          cell === 'wrap-embed'
            ? h(
                ctx.LayoutView,
                {
                  disabled: !ctx.isLayoutEnabled(),
                  column: rowColumn ?? ctx.factoryColumn,
                  ...(rowGutter != null ? { gutter: rowGutter } : {}),
                },
                () => input,
              )
            : input

        const cellSlots: Record<string, unknown> = {
          default: () => cellBody,
        }
        for (const [name, slot] of Object.entries(itemSlots)) {
          cellSlots[`item:${name}`] = slot
        }

        return h(FormCell, cellAttrs, cellSlots)
      }
    },
  }) as FormFieldComponent
}
