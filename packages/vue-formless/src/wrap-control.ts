import { h, markRaw, type Component, type Slot, type VNodeChild } from 'vue'
import type { ItemRenderInput, ToItemProps } from './item-adapter'
import { GRID_TOTAL } from './layout'

/** Input Control hands to FormView's wrap: identity snapshot + Item fallthrough. */
export interface WrapControlMeta {
  span?: number
  snapshot: ItemRenderInput
  itemAttrs: Record<string, unknown>
  itemOn: Record<string, unknown>
  itemSlots: Record<string, Slot>
}

/** FormView-owned shell: Col? → Item? → body. Control never `h()`s host components. */
export type WrapControl = (body: VNodeChild, meta: WrapControlMeta) => VNodeChild

export function createControlWrap(options: {
  Col?: Component
  Item?: Component
  toItemProps?: ToItemProps
  isLayoutEnabled: () => boolean
  getDefaultSpan: () => number | undefined
}): WrapControl {
  const Col = options.Col ? markRaw(options.Col) : undefined
  const Item = options.Item ? markRaw(options.Item) : undefined
  const toItemProps = options.toItemProps

  return (body, meta) => {
    const input = body
    const withItem =
      Item && toItemProps
        ? h(
            Item,
            {
              ...toItemProps(meta.snapshot),
              ...meta.itemAttrs,
              ...meta.itemOn,
            },
            {
              ...meta.itemSlots,
              default: () => input,
            },
          )
        : input

    if (!Col || !options.isLayoutEnabled()) return withItem

    const span = meta.span ?? options.getDefaultSpan() ?? Math.floor(GRID_TOTAL / 2)
    return h(Col, { span }, () => withItem)
  }
}
