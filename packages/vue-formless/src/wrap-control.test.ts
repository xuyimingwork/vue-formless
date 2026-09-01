import { describe, expect, it } from 'vitest'
import { defineComponent, h, isReactive, reactive, type VNode } from 'vue'
import type { ItemFl } from './item-adapter'
import { createControlWrap } from './wrap-control'

const Item = defineComponent({
  name: 'DummyItem',
  props: { label: { type: String, default: '' } },
  setup: () => () => null,
})

const fl: ItemFl = {
  controlKey: 'name',
  binding: { models: ['modelValue'], props: ['name'] },
  getValues: () => [undefined],
}

const emptyMeta = {
  fl,
  itemAttrs: {},
  itemOn: {},
  itemSlots: {},
}

function slotDefault(vnode: VNode): VNode {
  const children = vnode.children as { default?: () => VNode }
  const inner = children.default?.()
  if (!inner) throw new Error('expected default slot')
  return inner
}

describe('createControlWrap', () => {
  it('returns body when Item is off', () => {
    const wrap = createControlWrap({})
    const body = h('input')
    expect(wrap(body, emptyMeta)).toBe(body)
  })

  it('wraps Item with resolved props, without capturing the Item vnode in default', () => {
    const wrap = createControlWrap({
      Item,
      itemProps: (cell) => ({ label: String(cell.controlKey) }),
    })
    const input = h('input')
    const out = wrap(input, emptyMeta) as VNode
    expect(out.type).toBe(Item)
    expect(out.props?.fl).toBeUndefined()
    expect(out.props?.label).toBe('name')
    expect(slotDefault(out)).toBe(input)
  })

  it('lets itemAttrs overlay itemProps', () => {
    const wrap = createControlWrap({
      Item,
      itemProps: { label: 'from-fl' },
    })
    const out = wrap(h('input'), { ...emptyMeta, itemAttrs: { label: 'from-tag' } }) as VNode
    expect(out.props?.label).toBe('from-tag')
  })

  it('skips Item when isItemEnabled is false', () => {
    const wrap = createControlWrap({
      Item,
      isItemEnabled: () => false,
    })
    const body = h('input')
    expect(wrap(body, emptyMeta)).toBe(body)
  })

  it('skips Item this wrap when meta.item is false', () => {
    const wrap = createControlWrap({
      Item,
    })
    const body = h('input')
    expect(wrap(body, { ...emptyMeta, item: false })).toBe(body)
  })

  it('forces Item when meta.item is true even if the page left it off', () => {
    const wrap = createControlWrap({
      Item,
      isItemEnabled: () => false,
    })
    const out = wrap(h('input'), { ...emptyMeta, item: true }) as VNode
    expect(out.type).toBe(Item)
  })

  it('keeps host components non-reactive even on a reactive ctx', () => {
    const wrap = createControlWrap({ Item })
    const ctx = reactive({ wrap })
    const item = ctx.wrap(h('input'), emptyMeta) as VNode
    expect(isReactive(item.type)).toBe(false)
  })
})
