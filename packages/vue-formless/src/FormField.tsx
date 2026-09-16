import {
  computed,
  defineComponent,
  inject,
  provide,
  reactive,
  type Component,
  type DefineComponent,
  type VNodeChild,
} from 'vue'
import { LayoutItem } from '@vue-formless/layout'
import {
  createFieldLayer,
  modelBindings,
  stripPortBindings,
} from './control-binding'
import {
  buildItemFl,
  fieldBinding,
  mergedFieldFl,
  resolveDeclaredBinding,
} from './field-identity'
import { normalizeField as normalizeField } from './field-mode'
import { FORM_FIELD_KEY, FORM_VIEW_KEY } from './injection-keys'
import type { FormFieldTagProps, ItemFl } from './field-schema'
import { overlayProps, resolveProps } from './props-overlay'
import { FIELD_SLOT_CHANNELS, useFormFieldAttrs } from './use-form-attrs'
import { dispatch } from '@/dispatch'

/** `Component` is a union; JSX needs a constructable host. */
type JsxHost = new () => { $props: Record<string, unknown> }

export type { FormFieldTagProps } from './field-schema'

export interface FormFieldSlotProps {
  $bindings: Record<string, unknown>
}

export type FormFieldProps = FormFieldTagProps

export type FormFieldComponent<P = {}> = DefineComponent<FormFieldProps & P>

export const FormField = defineComponent({
  name: 'FormField',
  inheritAttrs: false,
  setup(_, { slots, attrs }) {
    const formViewContext = inject(FORM_VIEW_KEY, null)
    const formFieldContext = inject(FORM_FIELD_KEY, null)

    // 当前 attrs
    const { 
      fl: fieldFormlessOptions, 
      layoutItem: fieldLayoutItemAttrs,
      item: fieldItemAttrs,
      layout: fieldLayoutAttrs, 
      default: fieldControlAttrs,
    } = useFormFieldAttrs(attrs as Record<string, unknown>)

    const declared = computed(() => resolveDeclaredBinding(fieldFormlessOptions.value))

    if (formFieldContext == null) {
      // Only the identity root provides; nested slices never re-provide.
      provide(
        FORM_FIELD_KEY,
        reactive(
          createFieldLayer(
            () => declared.value,
            () => formViewContext.model,
            formViewContext.update,
          ),
        ),
      )
    }

    /** Inherited identity (slice) or our own declaration (root). */
    const binding = computed(() =>
      fieldBinding(fieldFormlessOptions.value, declared.value, formFieldContext),
    )

    /**
     * This field's own accessor: port-keyed read/write over its resolved
     * locations. The `glue` to the page scope lives here, not in the consumer.
     */
    const layer = computed(() =>
      createFieldLayer(
        () => binding.value,
        () => formViewContext.model,
        formViewContext.update,
      ),
    )

    /** page < schema (preset attrs) < field (tag). Near wins; undefined does not write. */
    const fieldFl = computed(() => mergedFieldFl(formViewContext, fieldFormlessOptions.value))

    const itemFl = computed((): ItemFl =>
      buildItemFl(fieldFl.value, binding.value, layer.value.getValues),
    )

    const bindings = computed(() => modelBindings(layer.value))

    const itemOn = computed(
      () => formViewContext.Item != null && fieldFl.value.item === true,
    )

    /** Bare names go to the control, never to the host Item (§5.2). */
    const controlAttrs = computed(() =>
      stripPortBindings(fieldControlAttrs.value, binding.value.models),
    )

    const itemProps = computed(() =>
      overlayProps(
        resolveProps(formViewContext.itemProps, itemFl.value),
        fieldItemAttrs.value,
      ),
    )

    return (): VNodeChild => {
      const { item: itemSlots, default: controlSlots } = dispatch(slots, FIELD_SLOT_CHANNELS)
      const fieldMode = normalizeField(fieldFormlessOptions.value.field)

      const Control = fieldFormlessOptions.value.component as unknown as JsxHost | undefined

      const inner: VNodeChild = Control
        ? <Control {...{
          ...controlAttrs.value, 
          ...bindings.value 
        }} v-slots={controlSlots} />
        : slots.default?.({ $bindings: bindings.value }) ?? null

      if (fieldMode === 'embed') return inner

      const HostLayoutView = formViewContext.LayoutView as JsxHost
      const windowProps = { ...fieldLayoutAttrs.value }
      const fieldBody =
        fieldMode === 'wrap-embed'
          ? <HostLayoutView {...windowProps} v-slots={{ default: () => inner }} />
          : inner

      const HostItem = formViewContext.Item as JsxHost | undefined
      const body =
        itemOn.value && HostItem ? (
          <HostItem
            {...itemProps.value}
            v-slots={{
              ...itemSlots,
              default: () => fieldBody,
            }}
          />
        ) : (
          fieldBody
        )

      return <LayoutItem {...fieldLayoutItemAttrs.value}>{body}</LayoutItem>
    }
  },
}) as FormFieldComponent
