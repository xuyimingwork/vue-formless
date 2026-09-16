import { upperFirst } from './utils'

const CHANNELS = ['fl', 'layout-item', 'layout', 'item'] as const
type KeyMeta<C extends Channel> = { channel: C; type: 'prop' | 'listener' }
const CHANNEL_PREFIX_TABLE = new Map<string, KeyMeta<Channel>>(
  CHANNELS.map((channel) => {
    const camel = channel.replace(/-([a-z])/g, (_, c) => c.toUpperCase())
    const entries: [string, KeyMeta<Channel>][] = [
      [`${channel}:`, { channel, type: 'prop' }],
      [`${camel}:`, { channel, type: 'prop' }],
      [`on${upperFirst(channel)}:`, { channel, type: 'listener' }],
      [`on${upperFirst(camel)}:`, { channel, type: 'listener' }],
    ]
    return entries
  }).flat(),
)


export type Channel = (typeof CHANNELS)[number]

export type ChannelBuckets<T, C extends Channel> = {
  readonly [K in C]: Record<string, T>
} & {
  readonly default: Record<string, T>
}

export function dispatch<T, C extends Channel>(
  bag: Record<string, T>,
  channels: readonly C[],
): ChannelBuckets<T, C> {
  const buckets: Record<string, Record<string, T>> = Object.create(null)
  buckets['default'] = {}
  for (const channel of channels) buckets[channel] = {}

  const entries = Object.entries(bag)
    .map(([key, value]) => ({  ...resolveKey(key, channels as any), value }))

  
  for (const { key, value, channel, type } of entries) {
    if (type === 'listener') continue
    buckets[channel || 'default'][key] = value
  }

  for (const { key, value, channel, type } of entries) {
    if (type !== 'listener') continue
    buckets[channel || 'default'][key] = value
  }

  return buckets as ChannelBuckets<T, C>
}


export function resolveKey<K extends string, C extends Channel>(
  key: K,
  channels: C[],
): {
  key: string
} & Partial<KeyMeta<C>> {
  const colon = key.indexOf(':'); 
  if (colon === -1) return { key }

  const prefix = key.substring(0, colon + 1)
  if (key.length === prefix.length) return { key }

  const meta = CHANNEL_PREFIX_TABLE.get(prefix)
  if (!meta || !channels.includes(meta.channel as C)) return { key }

  return {
    key: meta.type === 'listener'
        ? `on${upperFirst(key.replace(prefix, ''))}`
        : key.replace(prefix, ''),
    channel: meta.channel as C,
    type: meta.type,
  }
}
