import {
  defineComponent,
  markRaw,
  type Component,
  type PropType,
  type VNodeChild,
} from 'vue'
import type { FormFieldFormless, FormFieldFormlessRaw, HostProps } from './field-schema'

/** `Component` is a union; JSX needs a constructable host. */
type JsxHost = new () => { $props: Record<string, unknown> }

export interface CreateFormItemOptions {
  /** Host Item (e.g. ElFormItem). Omit = only passthrough children. */
  component?: Component
  /** Host Item default props: static, or derived from the field snapshot. */
  props?: HostProps<FormFieldFormless>
}

/**
 * Assemble the host Item once (kernel-private; design.md §16). FormFieldCore
 * passes the **already normalized** snapshot plus the `item` channel bucket and
 * this component projects `props` onto the host. Unbound → passthrough children.
 *
 * No page level here: the page `fl:item` default is folded into the snapshot by
 * `FormFieldCore` (design.md §9), so `props.fl.item` is a plain boolean and both
 * consumers of the snapshot read the same value.
 */
export function createFormItem(options: CreateFormItemOptions = {}): Component {
  const Host = options.component ? markRaw(options.component) : undefined

  return defineComponent({
    name: 'FormItem',
    inheritAttrs: false,
    props: {
      fl: { type: Object as PropType<FormFieldFormlessRaw>, required: true },
      item: { type: Object as PropType<Record<string, unknown>>, required: true },
    },
    setup(props, { slots }) {
      return (): VNodeChild => {
        if (!Host || !props.fl?.item) return slots.default?.() ?? null
        const HostItem = Host as JsxHost
        // `fl` is the normalized snapshot (FormFieldCore hands it down); FormItem
        // is the last hop and cannot prove that, so the type is asserted here.
        const base = typeof options.props === 'function'
          ? options.props(props.fl as unknown as FormFieldFormless)
          : options.props
        return (
          <HostItem
            {...{
              ...base,
              ...props.item
            }}
            v-slots={slots}
          />
        )
      }
    },
  })
}
