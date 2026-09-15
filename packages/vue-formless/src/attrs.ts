import { channelPrefix, listenerPrefix, type Channel } from './channels'
import { upperFirst } from './utils'

/**
 * Vue attr / boolean-attr → boolean.
 * `true` / `''` (bare attr) → true; `false` / `'false'` → false; missing → `defaultValue`.
 */
export function toAttrBoolean(value: unknown, defaultValue = false): boolean {
  if (value === undefined || value === null) return defaultValue
  if (value === true || value === '') return true
  if (value === false || value === 'false') return false
  if (value === 'true') return true
  return defaultValue
}

/**
 * One channel's attrs, prefix-stripped: `item:label-width` → `label-width`,
 * `@item:validate` (attr `onItem:validate`) → `onValidate`.
 *
 * Props are laid down first and listeners second, so a listener wins on a key
 * collision (`item:onClick` vs `@item:click`) — the same order the old
 * `overlayProps(itemAttrs, itemListeners)` produced.
 *
 * One channel only: different channels can peel the **same** key
 * (`fl:span` → `span` and `layout-item:span` → `span`), so merging picks would
 * silently mix kernel semantics with layout values.
 */
export function pickAttrs(
  attrs: Record<string, unknown>,
  channel: Channel,
): Record<string, unknown> {
  const propPrefix = channelPrefix(channel)
  const onPrefix = listenerPrefix(channel)
  const props: Record<string, unknown> = {}
  const listeners: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(attrs)) {
    if (key.startsWith(onPrefix) && key.length > onPrefix.length) {
      listeners[toOnKey(key.slice(onPrefix.length))] = value
    } else if (key.startsWith(propPrefix) && key.length > propPrefix.length) {
      props[key.slice(propPrefix.length)] = value
    }
  }
  return { ...props, ...listeners }
}

/**
 * The bare-name residual: every key claimed by any of `channels` (props **and**
 * listener forms) is dropped, the rest passes through untouched — unknown
 * prefixes included, so the host can ignore them (design.md §5.2).
 *
 * A bare key that merely contains a colon (`onUpdate:modelValue`) is not a
 * channel and stays.
 */
export function omitAttrs(
  attrs: Record<string, unknown>,
  channels: readonly Channel[],
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(attrs)) {
    if (channels.some((channel) => claims(key, channel))) continue
    out[key] = value
  }
  return out
}

function claims(key: string, channel: Channel): boolean {
  const propPrefix = channelPrefix(channel)
  if (key.startsWith(propPrefix) && key.length > propPrefix.length) return true
  const onPrefix = listenerPrefix(channel)
  return key.startsWith(onPrefix) && key.length > onPrefix.length
}

/**
 * The handler prop for an event name: `validate` → `onValidate`,
 * `update:modelValue` → `onUpdate:modelValue` (Vue's `v-on` naming).
 */
function toOnKey(event: string): string {
  const colon = event.indexOf(':')
  if (colon === -1) return `on${upperFirst(event)}`
  return `on${upperFirst(event.slice(0, colon))}:${event.slice(colon + 1)}`
}
