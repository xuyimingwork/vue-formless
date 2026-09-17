import { describe, expect, it } from 'vitest'
import { reactive } from 'vue'
import {
  FIELD_ATTR_CHANNELS,
  VIEW_ATTR_CHANNELS,
  useDispatch,
} from './use-form-attrs'

describe('useDispatch', () => {
  it('claims fl / layout and leaves layout-item:* / item:* to the host Form', () => {
    const validate = () => {}
    const bags = useDispatch(
      {
        'fl:layout': true,
        'layout:gutter': 16,
        'layout-item:span': 2,
        'item:label': 'x',
        'onItem:validate': validate,
        labelWidth: 96,
      },
      VIEW_ATTR_CHANNELS,
    )
    expect(bags.fl.value).toEqual({ layout: true })
    expect(bags.layout.value).toEqual({ gutter: 16 })
    expect(bags).not.toHaveProperty('layoutItem')
    expect(bags).not.toHaveProperty('item')
    expect(bags.default.value).toEqual({
      'layout-item:span': 2,
      'item:label': 'x',
      'onItem:validate': validate,
      labelWidth: 96,
    })
  })

  it('names each bucket after the camelCase spelling of its channel', () => {
    const bags = useDispatch({ 'layout-item:span': 2 }, FIELD_ATTR_CHANNELS)
    expect(bags.layoutItem.value).toEqual({ span: 2 })
    // Only the claimed channels get a bucket, and empty ones are still there.
    expect(Object.keys(bags)).toEqual(['fl', 'layout', 'layoutItem', 'item', 'default'])
    expect(bags.fl.value).toEqual({})
    expect(bags.layout.value).toEqual({})
    expect(bags.item.value).toEqual({})
    expect(bags.default.value).toEqual({})
  })

  it('keeps the input key shape when prefix is keep', () => {
    const bags = useDispatch({ 'item:label-width': 96 }, ['item'], { prefix: 'keep' })
    expect(bags.item.value).toEqual({ 'item:label-width': 96 })
  })

  it('follows the attrs as they change', () => {
    const attrs = reactive<Record<string, unknown>>({ 'fl:label': 'a', bare: 1 })
    const bags = useDispatch(attrs, ['fl'])
    expect(bags.fl.value).toEqual({ label: 'a' })
    expect(bags.default.value).toEqual({ bare: 1 })

    attrs['fl:label'] = 'b'
    attrs.bare = 2
    expect(bags.fl.value).toEqual({ label: 'b' })
    expect(bags.default.value).toEqual({ bare: 2 })
  })
})
