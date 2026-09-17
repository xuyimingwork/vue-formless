import { computed, type ComputedRef } from 'vue'
import { dispatch, type Channel, type DispatchOptions } from './dispatch'
import { toCamel, type ToCamel } from './utils'

/**
 * Channel dispatch at the component call sites: which channels each one claims
 * (design.md §5.3). A channel shows up on tag attrs **and** on slot names, so the
 * slot side of FormField lives here too.
 */

/**
 * The channels a page FormView claims. `item:*` and `layout-item:*` are both
 * deliberately absent: neither is a FormView channel, so both stay in the
 * default bag and fall through to the host Form.
 */
export const VIEW_ATTR_CHANNELS = ['fl', 'layout'] as const

/**
 * The channels a FormField claims, the host Item shell included (design.md §5.2):
 * `fl` / `layout` / `layout-item` go to the kernel, the page window and this
 * cell; `item` to the host Item shell; `default` — the bare names — to the
 * control, never to the Item.
 */
export const FIELD_ATTR_CHANNELS = ['fl', 'layout', 'layout-item', 'item'] as const

/** The one channel a slot name can carry. */
export const FIELD_SLOT_CHANNELS = ['item'] as const

/** One channel's attrs. */
type Bag = ComputedRef<Record<string, unknown>>

/**
 * The one bag ref per claimed channel, keyed by the channel's camelCase spelling
 * (`layout-item` → `layoutItem`), plus `default`. Derived from `Channel` through
 * `ToCamel`, so adding a channel to `CHANNELS` teaches the bucket names too.
 */
export type BucketRefs<C extends Channel> = {
  readonly [K in C as ToCamel<K>]: Bag
} & {
  readonly default: Bag
}

/**
 * Reactive attrs → one ref per claimed channel (design.md §5.2). The entry point
 * for component attrs; `dispatch` stays the plain primitive for bags that are not
 * a component's own attrs (`slots`, the factory shell's merged preset).
 *
 * `C` is inferred from `channels`, never widened to `Channel`: only the claimed
 * channels get a bucket, so a widened type would promise refs that do not exist.
 *
 * `options.prefix` is forwarded as-is (`'drop'` by default; `'keep'` keeps the
 * input key spelling so a call site can hand the slice to a child component that
 * re-claims the same channel).
 */
export function useDispatch<C extends Channel>(
  attrs: Record<string, unknown>,
  channels: readonly C[],
  options?: DispatchOptions,
): BucketRefs<C> {
  const bags = computed(() => dispatch(attrs, channels, options))
  const refs: Record<string, Bag> = {}
  for (const channel of channels) {
    refs[toCamel(channel)] = computed(() => bags.value[channel])
  }
  refs.default = computed(() => bags.value.default)
  return refs as BucketRefs<C>
}
