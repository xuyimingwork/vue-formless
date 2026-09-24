import {
  defineComponent,
  markRaw,
  type Component,
  type MaybeRefOrGetter,
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
  /** This FormView layer's `fl` bag (page default; `fl:item` is the shell switch). Lazy. */
  fl?: MaybeRefOrGetter<FormFieldFormlessRaw>
}

/**
 * Assemble the host Item once (kernel-private; design.md §16). FormField passes
 * the raw `fl` bag and the `item` channel bucket; this component merges the
 * page-level `fl:item` default and projects `props` onto the host. Unbound →
 * passthrough children.
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
        // `fl` arrives already normalized from `FormFieldCore` (the FormView
        // wrapper only re-merges `item` into it); FormItem is the last hop and
        // cannot prove that, so the snapshot type is asserted here.
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
