import { describe, expect, it } from 'vitest'
import { omitAttrs, pickAttrs, toAttrBoolean } from './attrs'

describe('pickAttrs', () => {
  it('strips the channel prefix and folds the listener form into the same bag', () => {
    const validate = () => {}
    expect(
      pickAttrs(
        {
          placeholder: 'x',
          'item:label-width': 123,
          'item:labelWidth': 96,
          'onItem:validate': validate,
        },
        'item',
      ),
    ).toEqual({ 'label-width': 123, labelWidth: 96, onValidate: validate })
  })

  it('maps onItem:update:modelValue to onUpdate:modelValue', () => {
    const fn = () => {}
    expect(pickAttrs({ 'onItem:update:modelValue': fn }, 'item')).toEqual({
      'onUpdate:modelValue': fn,
    })
  })

  it('derives the listener prefix per channel', () => {
    const gutter = () => {}
    const close = () => {}
    expect(
      pickAttrs({ 'layout:gutter': 16, 'onLayout:gutter': gutter }, 'layout'),
    ).toEqual({ gutter: 16, onGutter: gutter })
    expect(pickAttrs({ 'onLayout-item:close': close }, 'layout-item')).toEqual({
      onClose: close,
    })
  })

  it('keeps channels apart even when the peeled keys collide', () => {
    const attrs = { 'fl:span': 1, 'layout-item:span': 2 }
    expect(pickAttrs(attrs, 'fl')).toEqual({ span: 1 })
    expect(pickAttrs(attrs, 'layout-item')).toEqual({ span: 2 })
  })

  it('peels the listener form on every channel, fl: included', () => {
    const fn = () => {}
    expect(pickAttrs({ 'fl:prop': 'name', 'onFl:validate': fn }, 'fl')).toEqual({
      prop: 'name',
      onValidate: fn,
    })
  })

  it('leaves a bare key that merely contains a colon', () => {
    const fn = () => {}
    expect(pickAttrs({ 'onUpdate:modelValue': fn }, 'item')).toEqual({})
  })

  it('does not eat the bare channel name or an empty one', () => {
    expect(pickAttrs({ item: 'keep', 'item:': 'bare' }, 'item')).toEqual({})
  })

  it('lets a listener win over a prop on a key collision', () => {
    const prop = () => {}
    const listener = () => {}
    expect(pickAttrs({ 'item:onClick': prop, 'onItem:click': listener }, 'item')).toEqual({
      onClick: listener,
    })
  })
})

describe('omitAttrs', () => {
  it('drops the listed channels whole (props + listeners) and keeps the bare names', () => {
    const validate = () => {}
    const update = () => {}
    expect(
      omitAttrs(
        {
          'fl:layout': true,
          'fl:item': false,
          'onFl:validate': validate,
          'layout:column': '3',
          'layout-item:span': '2x',
          'item:label': 'x',
          'onItem:validate': validate,
          labelWidth: 96,
          'onUpdate:modelValue': update,
          item: 'bare',
        },
        ['fl', 'layout', 'layout-item'],
      ),
    ).toEqual({
      'item:label': 'x',
      'onItem:validate': validate,
      labelWidth: 96,
      'onUpdate:modelValue': update,
      item: 'bare',
    })
  })

  it('drops one channel and keeps the others', () => {
    expect(
      omitAttrs(
        { 'item:label': 'x', 'onItem:validate': () => {}, 'layout:gutter': 16 },
        ['item'],
      ),
    ).toEqual({ 'layout:gutter': 16 })
  })
})

describe('toAttrBoolean', () => {
  it('maps Vue boolean-attr shapes and falls back when missing', () => {
    expect(toAttrBoolean(undefined)).toBe(false)
    expect(toAttrBoolean(undefined, true)).toBe(true)
    expect(toAttrBoolean(null, true)).toBe(true)
    expect(toAttrBoolean(true)).toBe(true)
    expect(toAttrBoolean('')).toBe(true)
    expect(toAttrBoolean('true')).toBe(true)
    expect(toAttrBoolean(false)).toBe(false)
    expect(toAttrBoolean('false')).toBe(false)
    expect(toAttrBoolean('nope', true)).toBe(true)
  })
})
