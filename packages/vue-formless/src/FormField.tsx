import {
  computed,
  defineComponent,
  h,
  inject,
  provide,
  type Component,
  type DefineComponent,
  type VNodeChild,
} from 'vue'
import { LayoutItem } from '@vue-formless/layout'
import { camelToPascal } from './case'
import {
  applyControlBinding,
  bindingForPort,
  resolveControlBinding,
  type ControlProp,
  type ResolvedControlBinding,
} from './control-model'
import { useFormContext } from './context'
import {
  omitShellKeys,
  readWidgetFormless,
  schemaExtras,
  stripPortBindings,
} from './fl-config'
import { FIELD_RUNTIME_KEY, type FieldRuntime } from './injection-keys'
import type {
  FieldCell,
  FieldSchema,
  FormFieldTagProps,
  ItemFl,
} from './item-adapter'
import { getIn } from './model-path'
import { overlayProps, resolveProps, type HostProps } from './overlay-props'
import { splitFallthrough, splitSlots, useFormlessProps } from './split-fallthrough'
import type { ColPlace, ColSpanRaw } from '@vue-formless/layout'

/** `Component` is a union; JSX needs a constructable host. */
type JsxHost = new () => { $props: Record<string, unknown> }

export type { FormFieldTagProps } from './item-adapter'

export interface FormFieldSlotProps {
  field: Record<string, unknown>
}

/**
 * Kernel `fl:` / `col:` / `row:` keys on `<FormField>` / `<User.Xxx />`,
 * plus schema extras (`fl:label`…). `FormFieldTagProps` stays internal.
 */
export type FormFieldProps = FormFieldTagProps

export type FormFieldComponent<P = {}> = DefineComponent<FormFieldProps & P>

function resolveAdHocBinding(tagFl: Record<string, unknown>): {
  fieldKey: string
  binding: ResolvedControlBinding
} {
  const prop = tagFl.prop
  if (prop === '') {
    throw new Error('[vue-formless] fl:prop cannot be an empty string')
  }
  const fieldKey =
    typeof prop === 'string'
      ? prop
      : Array.isArray(prop) && prop[0]
        ? String(prop[0])
        : ''
  const binding =
    prop === undefined
      ? { models: ['modelValue'] as string[], props: [] as string[] }
      : resolveControlBinding(fieldKey || 'field', {
          prop: prop as ControlProp,
        })
  return { fieldKey, binding }
}

/**
 * One field cell: always LayoutItem, optional host Item (ADR-020).
 *
 * Bare `<FormField>` is a page-level / slot field. Inside a namespaced Field it
 * inherits the ancestor identity and `fl:model` selects one declared v-model
 * port (ADR-021 §7).
 */
export const FormField = defineComponent({
  name: 'FormField',
  inheritAttrs: false,
  setup(_, { slots, attrs }) {
    const ctx = useFormContext()
    const runtime = inject(FIELD_RUNTIME_KEY, null)

    const { props, rowProps, colProps, formlessProps } = useFormlessProps(
      attrs as Record<string, unknown>,
    )

    /** page < field (schema/widget) < cell (tag). Near wins; undefined does not write. */
    const fl = computed(() =>
      overlayProps(
        { item: ctx.item },
        runtime
          ? overlayProps(runtime.extras, { item: runtime.item })
          : undefined,
        formlessProps.value,
      ),
    )

    const wiring = computed(() => {
      if (runtime) {
        const port = formlessProps.value.model
        const binding =
          typeof port === 'string' && port !== ''
            ? bindingForPort(runtime.binding, port)
            : runtime.binding
        return { fieldKey: runtime.fieldKey, binding }
      }
      return resolveAdHocBinding(formlessProps.value)
    })

    const itemFl = computed((): ItemFl => {
      const { fieldKey, binding } = wiring.value
      return {
        ...omitShellKeys(fl.value),
        fieldKey,
        binding,
        getValues: () => binding.props.map((p) => getIn(ctx.model, p)),
      }
    })

    const field = computed(() =>
      applyControlBinding(ctx.model, wiring.value.binding, ctx.update),
    )

    const itemOn = computed(() => ctx.Item != null && fl.value.item === true)

    const itemProps = computed(() => {
      const { itemAttrs, itemOn: itemListeners, inputAttrs } = splitFallthrough(props.value)
      return overlayProps(
        resolveProps(ctx.itemProps, itemFl.value),
        { ...itemAttrs, ...inputAttrs },
        itemListeners,
      )
    })

    return (): VNodeChild => {
      if (Object.keys(rowProps.value).length > 0) {
        console.warn('[vue-formless] :row:* is ignored on a leaf field')
      }
      const { itemSlots } = splitSlots(slots)
      const inner = slots.default?.({ field: field.value }) ?? null
      const HostItem = ctx.Item as JsxHost | undefined
      const body =
        itemOn.value && HostItem ? (
          <HostItem
            {...itemProps.value}
            v-slots={{
              ...itemSlots,
              default: () => inner,
            }}
          />
        ) : (
          inner
        )

      return <LayoutItem {...colProps.value}>{body}</LayoutItem>
    }
  },
}) as FormFieldComponent

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
    setup(_, { attrs, slots }) {
      const ctx = useFormContext()
      const runtime: FieldRuntime = {
        fieldKey,
        binding: { models: ['modelValue'], props: [fieldKey] },
        extras: {},
        item: internalItem,
      }
      provide(FIELD_RUNTIME_KEY, runtime)

      const { props, rowProps, colProps, formlessProps } = useFormlessProps(
        attrs as Record<string, unknown>,
      )

      return (): VNodeChild => {
        const tagFl = formlessProps.value
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
        const { itemAttrs, itemOn, inputAttrs } = splitFallthrough(props.value)
        const snapshot = fieldSnapshot(ctx, fieldKey, binding, extras, tagFl)
        const mergedProps = overlayProps(
          resolveProps(cluster?.props, snapshot),
          resolveProps(schema.props, snapshot),
          stripPortBindings(inputAttrs, binding.models),
        )
        const modelBindings = applyControlBinding(ctx.model, binding, ctx.update)

        const colSpan = colProps.value.span as ColSpanRaw | undefined
        const colPlace = colProps.value.place as ColPlace | undefined
        const { column: rowColumn, ...rowHostAttrs } = rowProps.value

        if (cell !== 'wrap-embed' && (rowColumn != null || Object.keys(rowHostAttrs).length > 0)) {
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
          : null

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
                  ...(rowColumn != null ? { column: rowColumn } : {}),
                  ...rowHostAttrs,
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

        return h(FormField, cellAttrs, cellSlots)
      }
    },
  }) as FormFieldComponent
}
