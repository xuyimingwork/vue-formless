import { computed, type ComputedRef } from 'vue'
import { dispatch } from './dispatch'

/**
 * Channel dispatch at the two component call sites: which channels each one
 * claims (design.md §5.3). A channel shows up on tag attrs **and** on slot
 * names, so the slot side of FormField lives here too.
 */

/**
 * The channels a page FormView claims. `item:*` and `layout-item:*` are both
 * deliberately absent: neither is a FormView channel, so both stay in the
 * default bag and fall through to the host Form.
 */
const VIEW_ATTR_CHANNELS = ['fl', 'layout'] as const

/** The channels a FormField claims, the host Item shell included. */
const FIELD_ATTR_CHANNELS = ['fl', 'layout', 'layout-item', 'item'] as const

/** The one channel a slot name can carry. */
export const FIELD_SLOT_CHANNELS = ['item'] as const

/** One channel's attrs; a ref, so call sites read `fl.value` as before. */
type Bag = ComputedRef<Record<string, unknown>>

/**
 * Page attrs, one bucket per channel (design.md §5.2): `fl` is the kernel
 * semantic source, `layout` the page window's props. `layout-item:*` and
 * `item:*` are not FormView channels, so both fall through in `default` (§5.3).
 */
export function useFormViewAttrs(attrs: Record<string, unknown>): {
  fl: Bag
  layout: Bag
  default: Bag
} {
  const bags = computed(() => dispatch(attrs, VIEW_ATTR_CHANNELS))
  return {
    fl: computed(() => bags.value.fl),
    layout: computed(() => bags.value.layout),
    default: computed(() => bags.value.default),
  }
}

/**
 * Field attrs, one bucket per channel (design.md §5.2): `fl` / `layout` /
 * `layout-item` go to the kernel, the window and this cell; `item` to the host
 * Item shell; `default` — the bare names — to the control, never to the Item.
 */
export function useFormFieldAttrs(attrs: Record<string, unknown>): {
  fl: Bag
  layout: Bag
  layoutItem: Bag
  item: Bag
  default: Bag
} {
  const bags = computed(() => dispatch(attrs, FIELD_ATTR_CHANNELS))
  return {
    fl: computed(() => bags.value.fl),
    layout: computed(() => bags.value.layout),
    layoutItem: computed(() => bags.value['layout-item']),
    item: computed(() => bags.value.item),
    default: computed(() => bags.value.default),
  }
}