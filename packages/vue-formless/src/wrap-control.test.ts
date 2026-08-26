import { describe, expect, it } from 'vitest'
import { defineComponent, h, isReactive, reactive, type VNode } from 'vue'
import type { ItemFl } from './item-adapter'
import { createControlWrap } from './wrap-control'

const Item = defineComponent({
  name: 'DummyItem',
  props: { label: { type: String, default: '' } },
  setup: () => () => null,
})

const Col = defineComponent({
  name: 'DummyCol',
  props: { span: { type: Number, default: 12 } },
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
  it('returns body when Item and layout are off', () => {
    const wrap = createControlWrap({
      isLayoutEnabled: () => false,
      getDefaultSpan: () => undefined,
    })
    const body = h('input')
    expect(wrap(body, emptyMeta)).toBe(body)
  })

  it('wraps Item with resolved props, without capturing the Item vnode in default', () => {
    const wrap = createControlWrap({
      Item,
      itemProps: (cell) => ({ label: String(cell.controlKey) }),
      isLayoutEnabled: () => false,
      getDefaultSpan: () => undefined,
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
      isLayoutEnabled: () => false,
      getDefaultSpan: () => undefined,
    })
    const out = wrap(h('input'), { ...emptyMeta, itemAttrs: { label: 'from-tag' } }) as VNode
    expect(out.props?.label).toBe('from-tag')
  })

  it('skips Item when isItemEnabled is false', () => {
    const wrap = createControlWrap({
      Item,
      isLayoutEnabled: () => false,
      isItemEnabled: () => false,
      getDefaultSpan: () => undefined,
    })
    const body = h('input')
    expect(wrap(body, emptyMeta)).toBe(body)
  })

  it('skips Item this wrap when meta.item is false', () => {
    const wrap = createControlWrap({
      Item,
      isLayoutEnabled: () => false,
      getDefaultSpan: () => undefined,
    })
    const body = h('input')
    expect(wrap(body, { ...emptyMeta, item: false })).toBe(body)
  })

  it('skips Col this wrap when meta.layout is false', () => {
    const wrap = createControlWrap({
      Col,
      Item,
      isLayoutEnabled: () => true,
      getDefaultSpan: () => 8,
    })
    const input = h('input')
    const out = wrap(input, { ...emptyMeta, layout: false }) as VNode
    expect(out.type).toBe(Item)
  })

  it('wraps Col → Item → input when layout is on', () => {
    const wrap = createControlWrap({
      Col,
      Item,
      isLayoutEnabled: () => true,
      getDefaultSpan: () => 12,
    })
    const input = h('input')
    const col = wrap(input, { ...emptyMeta, span: 8 }) as VNode
    expect(col.type).toBe(Col)
    expect(col.props?.span).toBe(8)
    const item = slotDefault(col)
    expect(item.type).toBe(Item)
    expect(slotDefault(item)).toBe(input)
  })

  it('falls back to defaultSpan then half row (12)', () => {
    const wrap = createControlWrap({
      Col,
      isLayoutEnabled: () => true,
      getDefaultSpan: () => 12,
    })
    const withDefault = wrap(h('input'), emptyMeta) as VNode
    expect(withDefault.props?.span).toBe(12)

    const wrapNoDefault = createControlWrap({
      Col,
      isLayoutEnabled: () => true,
      getDefaultSpan: () => undefined,
    })
    const half = wrapNoDefault(h('input'), emptyMeta) as VNode
    expect(half.props?.span).toBe(12)
  })

  it('keeps host components non-reactive even on a reactive ctx', () => {
    const wrap = createControlWrap({
      Col,
      Item,
      isLayoutEnabled: () => true,
      getDefaultSpan: () => 12,
    })
    const ctx = reactive({ wrap })
    const col = ctx.wrap(h('input'), emptyMeta) as VNode
    expect(isReactive(col.type)).toBe(false)
    expect(isReactive(slotDefault(col).type)).toBe(false)
  })
})
