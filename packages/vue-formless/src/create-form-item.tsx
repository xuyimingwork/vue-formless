import {
  computed,
  defineComponent,
  markRaw,
  toValue,
  type Component,
  type MaybeRefOrGetter,
  type PropType,
  type VNodeChild,
} from 'vue'
import type { ItemFl } from './field-schema'
import { mergeAttrs, resolveProps, type HostProps } from './props-overlay'
import { toAttrBoolean } from './utils'

/** `Component` is a union; JSX needs a constructable host. */
type JsxHost = new () => { $props: Record<string, unknown> }

export interface CreateFormItemOptions {
  /** Host Item (e.g. ElFormItem). Omit = only passthrough children. */
  component?: Component
  /** Host Item default props: static, or derived from the field snapshot. */
  props?: HostProps<ItemFl>
  /** This FormView layer's `fl` bag (page default; `fl:item` is the shell switch). Lazy. */
  fl?: MaybeRefOrGetter<Record<string, unknown>>
}

/**
 * Assemble the host Item once (kernel-private; design.md §16). FormField passes
 * the raw `fl` bag and the `item` channel bucket; this component merges the
 * page-level `fl:item` default and projects `props` onto the host. Unbound →
 * passthrough children.
 */
export function createFormItem(options: CreateFormItemOptions = {}): Component {
  const Host = options.component ? markRaw(options.component) : undefined
  const propsSpec = options.props
  // Option `fl` is the page's; prop `fl` is the field's — rename to avoid confusion.
  const pageFl = options.fl

  return defineComponent({
    name: 'FormItem',
    inheritAttrs: false,
    props: {
      fl: { type: Object as PropType<Record<string, unknown>>, required: true },
      item: { type: Object as PropType<Record<string, unknown>>, required: true },
    },
    setup(props, { slots }) {
      /** Page < field layer merge + boolean normalization (§9 / §12.1). */
      const formlessOptions = computed(() => {
        const pageItem = pageFl ? toValue(pageFl).item : undefined
        const fl = mergeAttrs({ item: pageItem }, props.fl)
        return { ...fl, item: toAttrBoolean(fl.item, true) }
      })

      return (): VNodeChild => {
        if (!Host || !formlessOptions.value.item) return slots.default?.() ?? null
        const HostItem = Host as JsxHost
        return (
          <HostItem
            // Snapshot normalization is deferred; the raw `fl` bucket stands in
            // for `ItemFl` until that lands (see plan "遗留问题").
            {...mergeAttrs(resolveProps(propsSpec, formlessOptions.value as unknown as ItemFl), props.item)}
            v-slots={slots}
          />
        )
      }
    },
  })
}
