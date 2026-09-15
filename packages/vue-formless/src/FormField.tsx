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
  cellBinding,
  mergedFieldFl,
  resolveDeclaredBinding,
} from './field-identity'
import { resolveFieldMode } from './field-mode'
import { FORM_FIELD_KEY } from './injection-keys'
import type { FormFieldTagProps, ItemFl } from './field-schema'
import { overlayProps, resolveProps } from './props-overlay'
import { useFormlessProps } from './attrs'
import { splitFallthrough } from './item-fallthrough'
import { splitSlots } from './slots'

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
 * One field: LayoutItem + optional host Item + control (ADR-020).
 *
 * FormField has **one** configuration surface — its own tag attrs. A namespaced
 * `<User.Xxx />` is just a `FormField` with the schema preset as a lower attr
 * layer (`fl:component` / `fl:prop` / `fl:model` / `fl:item` / `fl:field` /
 * `fl:label`…), so there is no private side channel (ADR-020 §16.3).
 *
 * It is the **identity root** when it hits no ancestor `FORM_FIELD_KEY`: it
 * resolves its own port ↔ location map and provides it, so nested
 * `<FormField fl:model="…" />` slices work with or without the
 * `createFormFields` shell (ADR-013 / ADR-021 §7). A hit only consumes.
 *
 * Prefix routing (§5.2): bare names → the control, `item:*` → the host Item.
 */
export const FormField = defineComponent({
  name: 'FormField',
  inheritAttrs: false,
  setup(_, { slots, attrs }) {
    const ctx = useFormContext()
    /** Ancestor identity: present = nested slice (consume only), absent = root. */
    const ancestor = inject(FORM_FIELD_KEY, null)

    const {
      props: hostProps,
      layoutProps,
      layoutItemProps,
      formlessProps,
    } = useFormlessProps(attrs as Record<string, unknown>)

    const declared = computed(() => resolveDeclaredBinding(formlessProps.value))

    if (ancestor == null) {
      // Only the identity root provides; nested slices never re-provide.
      provide(
        FORM_FIELD_KEY,
        reactive(
          createFieldLayer(
            () => declared.value,
            () => ctx.model,
            ctx.update,
          ),
        ),
      )
    }

    /** Inherited identity (slice) or our own declaration (root). */
    const binding = computed(() =>
      cellBinding(formlessProps.value, declared.value, ancestor),
    )

    /**
     * This cell's own accessor: port-keyed read/write over its resolved
     * locations. The `glue` to the page scope lives here, not in the consumer.
     */
    const layer = computed(() =>
      createFieldLayer(
        () => binding.value,
        () => ctx.model,
        ctx.update,
      ),
    )

    /** page < schema (preset attrs) < cell (tag). Near wins; undefined does not write. */
    const fl = computed(() => mergedFieldFl(ctx, formlessProps.value))

    const itemFl = computed((): ItemFl =>
      buildItemFl(fl.value, binding.value, layer.value.getValues),
    )

    const bindings = computed(() => modelBindings(layer.value))

    const itemOn = computed(() => ctx.Item != null && fl.value.item === true)

    const fallthrough = computed(() => splitFallthrough(hostProps.value))

    /** Bare names go to the control, never to the host Item (§5.2). */
    const controlAttrs = computed(() =>
      stripPortBindings(fallthrough.value.controlAttrs, binding.value.models),
    )

    const itemProps = computed(() => {
      const { itemAttrs, itemOn: itemListeners } = fallthrough.value
      return overlayProps(
        resolveProps(ctx.itemProps, itemFl.value),
        itemAttrs,
        itemListeners,
      )
    })

    return (): VNodeChild => {
      const { itemSlots, controlSlots } = splitSlots(slots)
      const fieldMode = resolveFieldMode(formlessProps.value.field)

      if (fieldMode !== 'wrap-embed' && Object.keys(layoutProps.value).length > 0) {
        console.warn('[vue-formless] :layout:* is ignored on a leaf field')
      }

      const control = formlessProps.value.component as Component | undefined
      const Control = control as JsxHost | undefined
      const controlProps = { ...controlAttrs.value, ...bindings.value }
      const inner: VNodeChild = Control
        ? <Control {...controlProps} v-slots={controlSlots} />
        : slots.default?.({ $bindings: bindings.value }) ?? null

      if (fieldMode === 'embed') return inner

      const HostLayoutView = ctx.LayoutView as JsxHost
      const windowProps = { ...layoutProps.value }
      const cellBody =
        fieldMode === 'wrap-embed'
          ? <HostLayoutView {...windowProps} v-slots={{ default: () => inner }} />
          : inner

      const HostItem = ctx.Item as JsxHost | undefined
      const body =
        itemOn.value && HostItem ? (
          <HostItem
            {...itemProps.value}
            v-slots={{
              ...itemSlots,
              default: () => cellBody,
            }}
          />
        ) : (
          cellBody
        )

      return <LayoutItem {...layoutItemProps.value}>{body}</LayoutItem>
    }
  },
}) as FormFieldComponent
