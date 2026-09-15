import { upperFirst } from './utils'

/**
 * Channel vocabulary (design.md §5.1): a prefix names the target component, a
 * bare name goes to the primary host. Spelled verbatim, so a channel name is
 * exactly its tag prefix minus the colon — one name, no second table to sync.
 */
const CHANNELS = ['fl', 'layout-item', 'layout', 'item'] as const

export type Channel = (typeof CHANNELS)[number]

export type ChannelBuckets<T, C extends Channel> = {
  readonly [K in C]: Record<string, T>
} & {
  /** Keys no listed channel claimed: the bare-name residual, values untouched. */
  readonly default: Record<string, T>
}

export function dispatch<T, C extends Channel>(
  bag: Record<string, T>,
  channels: readonly C[],
): ChannelBuckets<T, C> {
  const buckets: Record<string, Record<string, T>> = { default: {} }
  for (const channel of channels) buckets[channel] = {}

  const entries = Object.entries(bag)
    .map(([key, value]) => ({  ...resolveKey(key, channels as any), value }))
    .sort(
      (a, b) =>
        (a.type === 'listener' ? 1 : 0) -
        (b.type === 'listener' ? 1 : 0),
    )

  
  for (const { key, value, channel } of entries) {
    buckets[channel || 'default'][key!] = value
  }

  return buckets as ChannelBuckets<T, C>
}

type KeyMeta<C extends Channel> = { channel: C; type: 'prop' | 'listener' }


export function resolveKey<K extends string, C extends Channel>(
  key: K,
  channels: C[],
): {
  raw: K,
  key: string
} & Partial<KeyMeta<C>> {
  const colon = key.indexOf(':'); 
  if (colon === -1) return { raw: key, key }

  const PREFIX = new Map<string, { channel: C, type: 'prop' | 'listener'  }>(
    channels.map((channel) => {
      const camel = channel.replace(/-([a-z])/g, (_, c) => c.toUpperCase())
      return [
        [`${channel}:`, { channel, type: 'prop' }],
        [`${camel}:`, { channel, type: 'prop' }],
        [`on${upperFirst(channel)}:`, { channel, type: 'listener' }],
        [`on${upperFirst(camel)}:`, { channel, type: 'listener' }],
      ]
    }).flat() as []
  )

  const prefix = key.substring(0, colon + 1)
  const meta: { channel: C, type: 'prop' | 'listener' } | undefined = 
    key.length > prefix.length 
      ? PREFIX.get(prefix)
      : undefined

  return {
    raw: key,
    channel: meta?.channel,
    type: meta?.type,
    key: !meta ? key
      : meta.type === 'listener'
        ? `on${upperFirst(key.replace(prefix, ''))}`
        : key.replace(prefix, '')
  }
}
