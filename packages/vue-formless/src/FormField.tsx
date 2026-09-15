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
import { useFormContext } from './context'
import {
  buildItemFl,
  fieldBinding,
  mergedFieldFl,
  resolveDeclaredBinding,
} from './field-identity'
import { resolveFieldMode } from './field-mode'
import { FORM_FIELD_KEY } from './injection-keys'
import type { FormFieldTagProps, ItemFl } from './field-schema'
import { overlayProps, resolveProps } from './props-overlay'
import { useFormFieldAttrs, useFormFieldSlots } from './use-form-attrs'

/** `Component` is a union; JSX needs a constructable host. */
type JsxHost = new () => { $props: Record<string, unknown> }

export type { FormFieldTagProps } from './field-schema'

export interface FormFieldSlotProps {
  $bindings: Record<string, unknown>
}

/**
 * Kernel `fl:` / `item:` / `layout:` / `layout-item:` keys on `<FormField>` / `<User.Xxx />`,
 * plus schema extras (`fl:label`…). `FormFieldTagProps` stays internal.
 */
export type FormFieldProps = FormFieldTagProps

export type FormFieldComponent<P = {}> = DefineComponent<FormFieldProps & P>

/**
 * One field: LayoutItem + optional host Item + control (design.md §8).
 *
 * FormField has **one** configuration surface — its own tag attrs. A namespaced
 * `<User.Xxx />` is just a `FormField` with the schema preset as a lower attr
 * layer (`fl:component` / `fl:prop` / `fl:model` / `fl:item` / `fl:field` /
 * `fl:label`…), so there is no private side channel (design.md §16.3).
 *
 * It is the **identity root** when it hits no ancestor `FORM_FIELD_KEY`: it
 * resolves its own port ↔ location map and provides it, so nested
 * `<FormField fl:model="…" />` slices work with or without the
 * `createFormFields` shell (design.md §7.2 / §16.2). A hit only consumes.
 *
 * Channel dispatch (§5.2): bare names → the control, `item:*` → the host Item.
 */
export const FormField = defineComponent({
  name: 'FormField',
  inheritAttrs: false,
  setup(_, { slots, attrs }) {
    const formViewContext = useFormContext()
    /** Ancestor identity: present = nested slice (consume only), absent = root. */
    const formFieldContext = inject(FORM_FIELD_KEY, null)

    /**
     * One dispatch pass over the tag attrs, one bucket per channel: `fl:*` is the
     * kernel semantic source, `layout:*` / `layout-item:*` the window / this cell,
     * `item:*` the host Item shell, and the bare names the control (design.md §5.2).
     */
    const bags = useFormFieldAttrs(attrs as Record<string, unknown>)
    const fl = bags.fl
    const layoutProps = bags.layout
    const layoutItemProps = bags['layout-item']

    const declared = computed(() => resolveDeclaredBinding(fl.value))

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
      fieldBinding(fl.value, declared.value, formFieldContext),
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
    const fieldFl = computed(() => mergedFieldFl(formViewContext, fl.value))

    const itemFl = computed((): ItemFl =>
      buildItemFl(fieldFl.value, binding.value, layer.value.getValues),
    )

    const bindings = computed(() => modelBindings(layer.value))

    const itemOn = computed(
      () => formViewContext.Item != null && fieldFl.value.item === true,
    )

    /** Host Item channel: `item:*` props and `@item:*` listeners in one bag. */
    const itemAttrs = bags.item

    /** Bare names go to the control, never to the host Item (§5.2). */
    const controlAttrs = computed(() =>
      stripPortBindings(bags.default.value, binding.value.models),
    )

    const itemProps = computed(() =>
      overlayProps(
        resolveProps(formViewContext.itemProps, itemFl.value),
        itemAttrs.value,
      ),
    )

    return (): VNodeChild => {
      const { itemSlots, controlSlots } = useFormFieldSlots(slots)
      const fieldMode = resolveFieldMode(fl.value.field)

      if (fieldMode !== 'wrap-embed' && Object.keys(layoutProps.value).length > 0) {
        console.warn('[vue-formless] :layout:* is ignored on a leaf field')
      }

      const control = fl.value.component as Component | undefined
      const Control = control as JsxHost | undefined
      const inputProps = { ...controlAttrs.value, ...bindings.value }
      const inner: VNodeChild = Control
        ? <Control {...inputProps} v-slots={controlSlots} />
        : slots.default?.({ $bindings: bindings.value }) ?? null

      if (fieldMode === 'embed') return inner

      const HostLayoutView = formViewContext.LayoutView as JsxHost
      const windowProps = { ...layoutProps.value }
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

      return <LayoutItem {...layoutItemProps.value}>{body}</LayoutItem>
    }
  },
}) as FormFieldComponent
