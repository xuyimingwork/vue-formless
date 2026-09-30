import {
  defineComponent,
  markRaw,
  type Component,
  type DefineComponent,
  type PropType,
  type VNodeChild,
} from 'vue'
import type { FormFieldFormless, HostProps } from '../shared/form-field-types'
import type { JsxHost } from '../shared/utils'

export interface CreateFormItemOptions {
  /** Host Item (e.g. ElFormItem). Omit = only passthrough children. */
  component?: Component
  /** Host Item default props: static, or derived from the field snapshot. */
  props?: HostProps<FormFieldFormless>
}

/**
 * Props of the host Item shell `createFormItem` builds. Naming them is what
 * makes the `FormFieldCore` → `FormItem` handoff compile-checked: both sides
 * now name the same contract, so the normalized snapshot needs no assertion.
 */
export interface FormItemProps {
  /** The **normalized** snapshot, straight from `FormFieldCore`. */
  fl: FormFieldFormless
  /** This cell's `item:*` bucket. */
  item: Record<string, unknown>
}

export type FormItemComponent = DefineComponent<FormItemProps>

/**
 * Assemble the host Item once (kernel-private; design.md §16). FormFieldCore
 * passes the **already normalized** snapshot plus the `item` channel bucket and
 * this component projects `props` onto the host. Unbound → passthrough children.
 *
 * No page level here: the page `fl:item` default is folded into the snapshot by
 * `FormFieldCore` (design.md §9), so `props.fl.item` is a plain boolean and both
 * consumers of the snapshot read the same value.
 */
export function createFormItem(options: CreateFormItemOptions = {}): FormItemComponent {
  const Host = options.component ? markRaw(options.component) : undefined

  return defineComponent({
    name: 'FormItem',
    inheritAttrs: false,
    props: {
      fl: { type: Object as PropType<FormFieldFormless>, required: true },
      item: { type: Object as PropType<Record<string, unknown>>, required: true },
    },
    setup(props, { slots }) {
      return (): VNodeChild => {
        if (!Host || !props.fl?.item) return slots.default?.() ?? null
        const HostItem = Host as JsxHost
        // `fl` is the normalized snapshot (FormFieldCore hands it down); the prop
        // type above says so, so no assertion is needed here.
        const base = typeof options.props === 'function'
          ? options.props(props.fl)
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
