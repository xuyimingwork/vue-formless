import { describe, expect, it } from 'vitest'
import { reactive } from 'vue'
import {
  dispatch,
  resolveKey,
  FIELD_ATTR_CHANNELS,
  VIEW_ATTR_CHANNELS,
  useDispatch,
} from './use-dispatch'
import { toCamel } from './utils'

/**
 * Re-declared rather than imported on purpose: `Channel` is derived from
 * `CHANNELS` in use-dispatch.ts, so a channel dropped upstream stops typechecking
 * here instead of quietly shrinking the exhaustive cases below.
 */
const CHANNELS = ['fl', 'layout-item', 'layout', 'item'] as const

describe('resolveKey', () => {
  describe('a claimed key', () => {
    it('strips the channel prefix', () => {
      expect(resolveKey('item:label-width', ['item'])).toEqual({
        channel: 'item',
        key: 'label-width',
        type: 'prop'
      })
    })

    it('derives the listener prefix from the channel name', () => {
      expect(resolveKey('onLayout-item:close', ['layout-item'])).toEqual({
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
      expect(resolveKey(key, ['item'])).toEqual({ channel: undefined, key })
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

describe('dispatch with prefix: keep', () => {
  it('round-trips: a kept slice re-claims to the same buckets', () => {
    const change = () => {}
    const bag = {
      'fl:label': '名字',
      'fl:model': ['start'],
      'fl:item': true,
      'onFl:change': change,
      'item:label': 'x',
      'onItem:validate': change,
      'layout-item:span': 2,
      labelWidth: 96,
      'onUpdate:modelValue': change,
    }
    const kept = dispatch(bag, ['fl', 'item', 'layout-item'], { prefix: 'keep' })
    for (const channel of ['fl', 'item', 'layout-item'] as const) {
      // Compare the channel's own bucket: a slice carries no residual, so its
      // `default` is empty by construction while the original's is not.
      expect(dispatch(kept[channel], [channel])[channel]).toEqual(dispatch(bag, [channel])[channel])
    }
  })

  it('keeps the input spelling: prefix, camelCase and listener forms alike', () => {
    const close = () => {}
    const bags = dispatch(
      {
        'layout-item:span': 2,
        'layoutItem:place': 'end',
        'onLayoutItem:close': close,
        'onLayout-item:close': close,
      },
      ['layout-item'],
      { prefix: 'keep' },
    )
    expect(bags['layout-item']).toEqual({
      'layout-item:span': 2,
      'layoutItem:place': 'end',
      'onLayoutItem:close': close,
      'onLayout-item:close': close,
    })
  })

  it('does not rename a listener tail back to onXxx', () => {
    const validate = () => {}
    expect(
      dispatch({ 'onItem:update:modelValue': validate }, ['item'], { prefix: 'keep' }).item,
    ).toEqual({ 'onItem:update:modelValue': validate })
  })

  it('leaves the default bag byte-for-byte identical to drop mode', () => {
    const bag = {
      'fl:label': 'x',
      'item:label': 'y',
      labelWidth: 96,
      'onUpdate:modelValue': () => {},
      item: 'bare',
      'item:': 'bare-prefix',
    }
    expect(dispatch(bag, ['fl'], { prefix: 'keep' }).default)
      .toEqual(dispatch(bag, ['fl']).default)
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
    const bags = dispatch(bag, CHANNELS, { prefix: 'keep' })
    const flattened = Object.values(bags).flatMap((bucket) => Object.values(bucket))
    expect(flattened).toHaveLength(Object.keys(bag).length)
    expect(new Set(flattened).size).toBe(flattened.length)
    expect(new Set(flattened)).toEqual(new Set(Object.values(bag)))
  })
})

describe('the channel table', () => {
  it('derives bucket names that never collide, and never spell default', () => {
    const bucketNames = CHANNELS.map(toCamel)
    expect(new Set(bucketNames).size).toBe(bucketNames.length)
    expect(bucketNames).not.toContain('default')
  })
})

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
