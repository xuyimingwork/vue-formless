import { toCamel, upperFirst } from './utils'

/**
 * The closed set of channels. A channel name *is* a tag prefix minus its colon
 * (`item` ↔ `item:`), so there is no second table to keep in sync (design.md §5.1).
 *
 * The order carries no meaning: `resolveKey` looks a prefix up whole, colon
 * included, so `layout-item:` can never be answered by `layout:`.
 */
const CHANNELS = ['fl', 'layout-item', 'layout', 'item'] as const

/** The channel names the kernel knows about, as a union of string literals. */
export type Channel = (typeof CHANNELS)[number]

/**
 * What a prefix means: which channel claims it, and in which of the two forms it
 * arrived. `type` describes the *input* spelling (a `:`-prefixed prop vs. an
 * `on…:`-prefixed listener), not the resolved key it produces.
 */
type KeyMeta<C extends Channel> = { channel: C; type: 'prop' | 'listener' }

/**
 * Every spelling a channel is allowed to use, derived rather than typed out —
 * four entries per channel in `CHANNELS`:
 *
 * - `item:` / `onItem:` — the channel name as written
 * - `layoutItem:` / `onLayoutItem:` — its camelCase spelling, for hyphenated names
 *
 * Both the camelCase form and the listener form are computed from the channel
 * name (`on` + PascalCase), so adding a channel above teaches the table all four
 * spellings. Vue compiles `@item:validate` to the attr `onItem:validate`, which is
 * why the listener spelling has to be accepted here at all (design.md §5.1).
 *
 * The table itself is *global* — it knows every channel. Whether a channel is
 * actually claimed for a given call is decided later, per call, in `resolveKey`
 * by checking the caller's `channels`.
 */
const CHANNEL_PREFIX_TABLE = new Map<string, KeyMeta<Channel>>(
  CHANNELS.map((channel) => {
    // kebab-case → camelCase: `layout-item` → `layoutItem`.
    const camel = toCamel(channel)
    const entries: [string, KeyMeta<Channel>][] = [
      [`${channel}:`, { channel, type: 'prop' }],
      [`${camel}:`, { channel, type: 'prop' }],
      [`on${upperFirst(channel)}:`, { channel, type: 'listener' }],
      [`on${upperFirst(camel)}:`, { channel, type: 'listener' }],
    ]
    return entries
  }).flat(),
)

/**
 * The result of one dispatch: one bucket per claimed channel, plus a `default`
 * bucket for every key no claimed channel answered for. `T` is whatever the bag
 * carried — prop values when dispatching attrs, slot functions when dispatching
 * slot names (design.md §5.2).
 */
export type ChannelBuckets<T, C extends Channel> = {
  readonly [K in C]: Record<string, T>
} & {
  readonly default: Record<string, T>
}

/**
 * Which key shape a bucket carries (design.md §5.2):
 *
 * - `drop` — the normalized key: channel prefix stripped, listener tail renamed
 *   back to Vue's `onXxx` (`onItem:validate` → `onValidate`).
 * - `keep` — the input spelling, verbatim: prefix and listener spelling kept
 *   (`onItem:validate` stays `onItem:validate`). Buckets are then re-claimable by
 *   the same channel table downstream, which is what a forwarding call site
 *   needs; see the round-trip law in dispatch.test.ts.
 */
export type PrefixMode = 'keep' | 'drop'

export interface DispatchOptions {
  /** Key shape of the bucket. Default `'drop'`. */
  prefix?: PrefixMode
}

/**
 * One pass over `bag`, one bucket per channel (design.md §5.2):
 *
 * - `item:label-width` → `item` bucket, key `label-width`
 * - `onItem:validate` → `item` bucket, key `onValidate`
 * - anything no claimed channel answers for keeps its own shape, colon included,
 *   and lands in `default` (`foo:bar` is a name here, not a channel prefix)
 *
 * Values are copied exactly as they are — `undefined` included, no filtering and
 * no merging. Channel identity comes from the key spelling alone, so a bare name
 * and a prefixed name stay distinct entries even when their tails collide.
 *
 * `options.prefix` picks the key shape:
 *
 * - `'drop'` (default) — the key the target component actually wants: prefix
 *   stripped, listener tail renamed to `onXxx`.
 * - `'keep'` — the key as written: prefix and listener spelling intact, so the
 *   bucket can be re-dispatched by the *same* channel table downstream. The
 *   channel's own bucket then comes back unchanged
 *   (`dispatch(dispatch(bag, ch, { prefix: 'keep' })[ch], ch)[ch]` equals
 *   `dispatch(bag, ch)[ch]`; the slice carries no residual, so its `default` is
 *   empty by construction). Only claimed channels are affected: `default` carries
 *   unclaimed keys, which were never stripped, and is therefore identical in both
 *   modes. `resolveKey` keeps no mode branch — `keep` uses its channel answer and
 *   discards the `key` / `type` it computed.
 *
 * @param bag      merged props / listeners (or slot names) to split
 * @param channels the channels this call site claims; anything else falls to `default`
 * @param options  key shape (`prefix: 'keep' | 'drop'`, default `'drop'`)
 */
export function dispatch<T, C extends Channel>(
  bag: Record<string, T>,
  channels: readonly C[],
  options: DispatchOptions = {},
): ChannelBuckets<T, C> {
  const keep = options.prefix === 'keep'

  // `Object.create(null)` on purpose: a bag may carry keys like `constructor` or
  // `__proto__`, which have to become ordinary own entries, not prototype hits.
  const buckets: Record<string, Record<string, T>> = {}
  for (const channel of [...channels, 'default']) buckets[channel] = Object.create(null)

  // Resolve every key once, up front: the two passes below then share the results,
  // and `resolveKey` never runs twice for the same key. `rawKey` rides along for
  // the `keep` shape only; `default` never needs it (its keys are already raw).
  const entries = Object.entries(bag)
    .map(([rawKey, value]) => ({ ...resolveKey(rawKey, channels), rawKey, value }))

  // Two passes, props first: a listener overwrites a prop when both resolve to the
  // same key in the same bucket (`item:onClick` and `onItem:click` both become
  // `onClick`), because the explicit listener spelling is the stronger intent.
  // This precedence is the whole reason the loops are split — see the
  // "lets a listener win over a prop on a key collision" case in dispatch.test.ts.
  for (const { rawKey, key, value, channel, type } of entries) {
    if (type === 'listener') continue
    buckets[channel || 'default'][keep && channel ? rawKey : key] = value
  }

  for (const { rawKey, key, value, channel, type } of entries) {
    if (type !== 'listener') continue
    buckets[channel || 'default'][keep && channel ? rawKey : key] = value
  }

  return buckets as ChannelBuckets<T, C>
}

/**
 * Reads a single key against the channels a call site claims.
 *
 * A claimed key comes back as `{ key, channel, type }`: the prefix stripped, and
 * for a listener the tail renamed back to Vue's `onXxx` (`onItem:validate` →
 * `onValidate`; the tail is carried over verbatim, colons included, so
 * `onItem:update:modelValue` → `onUpdate:modelValue`). `upperFirst` is what turns
 * `validate` into `Validate`.
 *
 * Any key that is not claimed whole comes back as `{ key }` alone — `channel` and
 * `type` left undefined, the key byte-for-byte unchanged. That covers four cases:
 * no colon at all, a prefix with an empty tail (`item:`, `onItem:`), an unknown
 * prefix (`onUpdate:modelValue` is not any channel's listener prefix), and a known
 * prefix whose channel this caller did not list.
 *
 * @param key      a raw attr / listener / slot name
 * @param channels the channels the caller claims; a channel not listed never claims
 */
export function resolveKey<K extends string, C extends Channel>(
  key: K,
  channels: readonly C[],
): {
  key: string
} & Partial<KeyMeta<C>> {
  const colon = key.indexOf(':')
  // No colon (`plain`): nothing can be claimed, keep the key as it is.
  if (colon === -1) return { key }

  // The prefix keeps its colon, so it can be looked up as a whole and a longer
  // channel name never answers to a shorter one.
  const prefix = key.substring(0, colon + 1)
  // A prefix with an empty tail (`item:`): a bare prefix is not a key name.
  if (key.length === prefix.length) return { key }

  const meta = CHANNEL_PREFIX_TABLE.get(prefix)
  // Unknown prefix, or a channel this caller does not claim: both leave the key
  // untouched, colons and all, for `dispatch` to send to `default`.
  if (!meta || !channels.includes(meta.channel as C)) return { key }

  return {
    key: meta.type === 'listener'
        // `onItem:validate` → `onValidate`; `on` + upperFirst(tail).
        ? `on${upperFirst(key.replace(prefix, ''))}`
        : key.replace(prefix, ''),
    channel: meta.channel as C,
    type: meta.type,
  }
}
