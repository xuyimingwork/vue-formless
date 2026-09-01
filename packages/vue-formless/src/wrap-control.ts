import { h, markRaw, type Component, type Slot, type VNodeChild } from 'vue'
import type { ItemFl } from './item-adapter'
import { GRID_TOTAL } from './layout'
import { overlayProps, resolveProps, type HostProps } from './overlay-props'

/** Input Control hands to FormView's wrap: Item snapshot + host fallthrough. */
export interface WrapControlMeta {
  span?: number
  /**
   * This wrap only. `false` skips Item even when FormView `item` is on.
   * `true` forces Item even when FormView `item` is off. Omit = follow FormView.
   */
  item?: boolean
  /**
   * This wrap only. `false` skips Col even when FormView `layout` is on.
   * `true` forces Col when layout hosting is on. Omit = follow FormView.
   */
  layout?: boolean
  /**
   * Factory outer wrap only (ADR-017 gear 4): wrap `body` in the host Row
   * inside Item so inner cells' Cols have a row parent.
   */
  innerRow?: boolean
  fl: ItemFl
  itemAttrs: Record<string, unknown>
  itemOn: Record<string, unknown>
  itemSlots: Record<string, Slot>
}

/** FormView-owned shell: Col? → Item? → Row? → body. Control never `h()`s host components. */
export type WrapControl = (body: VNodeChild, meta: WrapControlMeta) => VNodeChild

export function createControlWrap(options: {
  Row?: Component
  Col?: Component
  Item?: Component
  itemProps?: HostProps<ItemFl>
  isLayoutEnabled: () => boolean
  isItemEnabled?: () => boolean
  getDefaultSpan: () => number | undefined
  getGutter?: () => number
}): WrapControl {
  const Row = options.Row ? markRaw(options.Row) : undefined
  const Col = options.Col ? markRaw(options.Col) : undefined
  const Item = options.Item ? markRaw(options.Item) : undefined

  return (body, meta) => {
    const input =
      meta.innerRow && Row
        ? h(Row, { gutter: options.getGutter?.() ?? 16 }, () => body)
        : body

    const wrapItem =
      Item &&
      meta.item !== false &&
      (meta.item === true || (options.isItemEnabled?.() ?? true))

    const withItem = wrapItem
      ? h(
          Item,
          overlayProps(
            resolveProps(options.itemProps, meta.fl),
            meta.itemAttrs,
            meta.itemOn,
          ),
          {
            ...meta.itemSlots,
            default: () => input,
          },
        )
      : input

    const wrapCol =
      Col &&
      options.isLayoutEnabled() &&
      meta.layout !== false &&
      (meta.layout === true || meta.layout === undefined)

    if (!wrapCol) return withItem

    const span = meta.span ?? options.getDefaultSpan() ?? Math.floor(GRID_TOTAL / 2)
    return h(Col, { span }, () => withItem)
  }
}
