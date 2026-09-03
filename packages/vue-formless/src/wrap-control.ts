import { h, markRaw, type Component, type Slot, type VNodeChild } from 'vue'
import type { ItemFl } from './item-adapter'
import { overlayProps, resolveProps, type HostProps } from './overlay-props'

/** Input Control hands to FormView's wrap: Item snapshot + host fallthrough. */
export interface WrapControlMeta {
  /**
   * This wrap only. `false` skips Item even when FormView `item` is on.
   * `true` forces Item even when FormView `item` is off. Omit = follow FormView.
   */
  item?: boolean
  fl: ItemFl
  itemAttrs: Record<string, unknown>
  itemOn: Record<string, unknown>
  itemSlots: Record<string, Slot>
}

/** FormView-owned Item shell. Col is owned by LayoutView / LayoutItem. */
export type WrapControl = (body: VNodeChild, meta: WrapControlMeta) => VNodeChild

export function createControlWrap(options: {
  Item?: Component
  itemProps?: HostProps<ItemFl>
  isItemEnabled?: () => boolean
}): WrapControl {
  const Item = options.Item ? markRaw(options.Item) : undefined

  return (body, meta) => {
    const wrapItem =
      Item &&
      meta.item !== false &&
      (meta.item === true || (options.isItemEnabled?.() ?? true))

    if (!wrapItem) return body

    return h(
      Item,
      overlayProps(
        resolveProps(options.itemProps, meta.fl),
        meta.itemAttrs,
        meta.itemOn,
      ),
      {
        ...meta.itemSlots,
        default: () => body,
      },
    )
  }
}
