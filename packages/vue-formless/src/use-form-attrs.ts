import { computed, type ComputedRef } from 'vue'
import type { Slot, Slots } from 'vue'
import { dispatch } from './dispatch'

/**
 * Channel dispatch at the two component call sites: which channels each one
 * claims (design.md §5.3). A channel shows up on tag attrs **and** on slot
 * names, so the slot side of FormField lives here too.
 */

/**
 * The channels a page FormView claims. `item:*` is deliberately absent: it is
 * not a FormView channel, so it stays in the default bag and keeps falling
 * through to the host Form.
 */
const VIEW_CHANNELS = ['fl', 'layout', 'layout-item'] as const

/** The channels a FormField claims, the host Item shell included. */
const FIELD_CHANNELS = ['fl', 'layout', 'layout-item', 'item'] as const

/** The one channel a slot name can carry. */
const SLOT_CHANNELS = ['item'] as const

/** One channel's attrs; a ref, so call sites read `fl.value` as before. */
type Bag = ComputedRef<Record<string, unknown>>

/**
 * Page attrs, one bucket per channel (design.md §5.2): `fl` is the kernel
 * semantic source, `layout` the page window's props. `layout-item` is claimed
 * but never consumed — a page window has no LayoutItem, so it must not reach
 * the host Form. `item:*` falls through in `default` (§5.3).
 */
export function useFormViewAttrs(attrs: Record<string, unknown>): {
  fl: Bag
  layout: Bag
  'layout-item': Bag
  default: Bag
} {
  const bags = computed(() => dispatch(attrs, VIEW_CHANNELS))
  return {
    fl: computed(() => bags.value.fl),
    layout: computed(() => bags.value.layout),
    'layout-item': computed(() => bags.value['layout-item']),
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
  'layout-item': Bag
  item: Bag
  default: Bag
} {
  const bags = computed(() => dispatch(attrs, FIELD_CHANNELS))
  return {
    fl: computed(() => bags.value.fl),
    layout: computed(() => bags.value.layout),
    'layout-item': computed(() => bags.value['layout-item']),
    item: computed(() => bags.value.item),
    default: computed(() => bags.value.default),
  }
}

/**
 * Slot names take the same channel path as attrs: `item:label` → the host
 * Item's `label` slot, everything else (the bare `default` included) → the
 * control.
 *
 * Plain rather than reactive, on purpose: Vue's slots object is not tracked, so
 * a `computed` over it would go stale. Call it where slots are read — in the
 * render function — exactly as `splitSlots` was called before.
 */
export function useFormFieldSlots(slots: Slots): {
  itemSlots: Record<string, Slot | undefined>
  controlSlots: Record<string, Slot | undefined>
} {
  const { item, default: controlSlots } = dispatch(slots, SLOT_CHANNELS)
  return { itemSlots: item, controlSlots }
}
