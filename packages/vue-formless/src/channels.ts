import { upperFirst } from './utils'

/**
 * Channel prefixes on a FormField tag / slot name (design.md §5.2).
 * The kernel peels these once; the remainder is host fallthrough.
 *
 * `layout:`      → LayoutView (page window on FormView; wrap-embed inner on a field)
 * `layout-item:` → LayoutItem (this field)
 * `item:`        → host Item shell (e.g. ElFormItem)
 * `fl:`          → the formless kernel itself
 *
 * Every channel is peeled in **both** forms: props (`item:label-width`) and
 * listeners (`@item:validate` → attr `onItem:validate`). This is uniform — the
 * listener prefix is always derived (`on` + PascalCase channel + `:`), never a
 * hand-written constant. `fl:` gets one too even though the kernel currently
 * emits nothing: "no listener today" is not a channel-level property.
 */
const CHANNELS = {
  fl: 'fl:',
  'layout-item': 'layout-item:',
  layout: 'layout:',
  item: 'item:',
} as const

export type Channel = keyof typeof CHANNELS

/** `fl:` / `layout:` / `layout-item:` / `item:`. */
export function channelPrefix(channel: Channel): string {
  return CHANNELS[channel]
}

/** `item` → `onItem:`; `layout-item` → `onLayout-item:` (Vue's v-on compile convention). */
export function listenerPrefix(channel: Channel): string {
  return `on${upperFirst(channel)}:`
}
