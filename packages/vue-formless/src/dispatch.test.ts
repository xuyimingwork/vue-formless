import { describe, expect, it } from 'vitest'
import { dispatch, resolveKey } from './dispatch'

/**
 * Re-declared rather than imported on purpose: `Channel` is derived from
 * `CHANNELS` in dispatch.ts, so a channel dropped upstream stops typechecking
 * here instead of quietly shrinking the exhaustive cases below.
 */
const CHANNELS = ['fl', 'layout-item', 'layout', 'item'] as const

describe('resolveKey', () => {
  describe('a claimed key', () => {
    it('strips the channel prefix', () => {
      expect(resolveKey('item:label-width', ['item'])).toEqual({
        raw: 'item:label-width',
        channel: 'item',
        key: 'label-width',
        type: 'prop'
      })
    })

    it('derives the listener prefix from the channel name', () => {
      expect(resolveKey('onLayout-item:close', ['layout-item'])).toEqual({
        raw: 'onLayout-item:close',
        channel: 'layout-item',
        key: 'onClose',
        type: 'listener'
      })
    })

    it('leaves the tail after a listener prefix alone, colons included', () => {
      expect(resolveKey('onItem:update:modelValue', ['item']).key).toBe('onUpdate:modelValue')
    })

    it('accepts the camelCase spelling of a hyphenated channel', () => {
      expect(resolveKey('layoutItem:span', ['layout-item']).channel).toBe('layout-item')
      expect(resolveKey('onLayoutItem:close', ['layout-item']).key).toBe('onClose')
    })

    it('claims a channel name whole, so a longer sibling never answers to a shorter one', () => {
      expect(resolveKey('layout-item:span', ['layout']).channel).toBeUndefined()
    })

    it('only answers for the channels it was handed', () => {
      expect(resolveKey('item:label', ['fl']).channel).toBeUndefined()
    })
  })

  describe('an unclaimed key', () => {
    it.each([
      ['item', 'the bare channel name'],
      ['item:', 'the channel prefix on its own'],
      ['onItem:', 'the listener prefix on its own'],
      ['onUpdate:modelValue', 'a colon from another vocabulary'],
      ['plain', 'no colon at all'],
    ])('leaves %s (%s) exactly as it was', (key) => {
      expect(resolveKey(key, ['item'])).toEqual({ raw: key, channel: undefined, key })
    })
  })
})

describe('dispatch', () => {
  it('gives every listed channel a bucket, empty ones included', () => {
    expect(dispatch({}, ['fl', 'layout-item'])).toEqual({
      fl: {},
      'layout-item': {},
      default: {},
    })
  })

  it('sends each key to its own channel, and the unclaimed ones to default', () => {
    const validate = () => {}
    const bags = dispatch(
      {
        'fl:prop': 'name',
        'onFl:validate': validate,
        'layout:gutter': 16,
        'layout-item:span': 2,
        'item:label': 'x',
        'onItem:validate': validate,
        labelWidth: 96,
        'onUpdate:modelValue': validate,
        item: 'bare',
      },
      CHANNELS,
    )
    expect(bags.fl).toEqual({ prop: 'name', onValidate: validate })
    expect(bags.layout).toEqual({ gutter: 16 })
    expect(bags['layout-item']).toEqual({ span: 2 })
    expect(bags.item).toEqual({ label: 'x', onValidate: validate })
    expect(bags.default).toEqual({
      labelWidth: 96,
      'onUpdate:modelValue': validate,
      item: 'bare',
    })
  })

  it('keeps channels apart even when the resolved keys collide', () => {
    const bags = dispatch({ 'fl:span': 1, 'layout-item:span': 2 }, ['fl', 'layout-item'])
    expect(bags.fl).toEqual({ span: 1 })
    expect(bags['layout-item']).toEqual({ span: 2 })
  })

  it('lets a listener win over a prop on a key collision', () => {
    const prop = () => {}
    const listener = () => {}
    expect(
      dispatch({ 'onItem:click': listener, 'item:onClick': prop }, ['item']).item,
    ).toEqual({ onClick: listener })
  })

  it('preserves values untouched, undefined included', () => {
    const bags = dispatch({ 'item:label': undefined, bare: undefined }, ['item'])
    expect(bags.item).toEqual({ label: undefined })
    expect(bags.default).toEqual({ bare: undefined })
  })

  it('loses nothing and doubles nothing', () => {
    const bag = {
      'fl:prop': 'a',
      'onFl:validate': 1,
      'layout:gutter': 2,
      'layout-item:span': 3,
      'item:label': 4,
      'onItem:validate': 5,
      'onUpdate:modelValue': 6,
      'foo:bar': 7,
      item: 8,
      plain: 9,
      'item:': 10,
      'onItem:': 11,
    }
    const bags = dispatch(bag, CHANNELS)
    const flattened = Object.values(bags).flatMap((bucket) => Object.values(bucket))
    expect(flattened).toHaveLength(Object.keys(bag).length)
    expect(new Set(flattened).size).toBe(flattened.length)
    expect(new Set(flattened)).toEqual(new Set(Object.values(bag)))
  })
})

describe('the default bag', () => {
  it('drops a claimed channel whole: props and listeners alike', () => {
    const validate = () => {}
    expect(
      dispatch(
        {
          'fl:layout': true,
          'fl:item': false,
          'onFl:validate': validate,
          'layout:column': '3',
          'layout-item:span': '2x',
        },
        ['fl', 'layout', 'layout-item'],
      ).default,
    ).toEqual({})
  })

  it('keeps every unclaimed key, bare and colon-carrying alike', () => {
    const validate = () => {}
    const update = () => {}
    expect(
      dispatch(
        {
          'fl:layout': true,
          'onFl:validate': validate,
          'layout:column': '3',
          'layout-item:span': '2x',
          'item:label': 'x',
          'onItem:validate': validate,
          labelWidth: 96,
          'onUpdate:modelValue': update,
          item: 'bare',
          'item:': 'bare-prefix',
        },
        ['fl', 'layout', 'layout-item'],
      ).default,
    ).toEqual({
      'item:label': 'x',
      'onItem:validate': validate,
      labelWidth: 96,
      'onUpdate:modelValue': update,
      item: 'bare',
      'item:': 'bare-prefix',
    })
  })

  it('drops one channel and keeps the others', () => {
    expect(
      dispatch(
        { 'item:label': 'x', 'onItem:validate': () => {}, 'layout:gutter': 16 },
        ['item'],
      ).default,
    ).toEqual({ 'layout:gutter': 16 })
  })
})
