import { describe, expect, it } from 'vitest'
import { formItemProp, getIn, parsePath, setIn } from './model-path'

describe('parsePath', () => {
  it('parses object keys and array indices', () => {
    expect(parsePath('buyers[0]')).toEqual([
      { type: 'key', key: 'buyers' },
      { type: 'index', index: 0 },
    ])
    expect(parsePath('[2]')).toEqual([{ type: 'index', index: 2 }])
    expect(parsePath('buyer')).toEqual([{ type: 'key', key: 'buyer' }])
    expect(parsePath('buyers[0].name')).toEqual([
      { type: 'key', key: 'buyers' },
      { type: 'index', index: 0 },
      { type: 'key', key: 'name' },
    ])
  })

  it('throws on invalid paths', () => {
    expect(() => parsePath('buyers[abc]')).toThrow(/index/)
    expect(() => parsePath('buyers[')).toThrow(/unclosed/)
  })
})

describe('getIn / setIn', () => {
  it('reads and writes at root prop', () => {
    const root = { name: 'Ada' }
    expect(getIn(root, 'name')).toBe('Ada')
    expect(setIn(root, 'name', 'Bob')).toEqual({ name: 'Bob' })
    expect(root.name).toBe('Ada')
  })

  it('reads and writes nested object paths', () => {
    const root = { buyers: [{ name: 'Ada' }] }
    expect(getIn(root, 'buyers[0].name')).toBe('Ada')
    expect(setIn(root, 'buyers[0].name', 'Bob')).toEqual({
      buyers: [{ name: 'Bob' }],
    })
  })

  it('clones arrays when writing through index segments', () => {
    const buyers = [{ name: 'Ada' }]
    const root = { buyers }
    const next = setIn(root, 'buyers[0].name', 'Bob') as { buyers: typeof buyers }
    expect(next.buyers).not.toBe(buyers)
    expect(buyers[0]!.name).toBe('Ada')
    expect(next.buyers[0]!.name).toBe('Bob')
  })

  it('supports array root with [index] prop', () => {
    const users = [{ name: 'Ada' }]
    expect(getIn(users, '[0].name')).toBe('Ada')
    expect(setIn(users, '[0].name', 'Bob')).toEqual([{ name: 'Bob' }])
  })

  it('merges multiple prop writes on the same node', () => {
    const root = { buyers: [{ name: 'Ada', gender: 'f' }] }
    let next = setIn(root, 'buyers[0].name', 'Bob') as typeof root
    next = setIn(next, 'buyers[0].gender', 'm') as typeof root
    expect(next.buyers[0]).toEqual({ name: 'Bob', gender: 'm' })
    expect(root.buyers[0]).toEqual({ name: 'Ada', gender: 'f' })
  })
})

describe('formItemProp', () => {
  it('encodes a full prop for ElFormItem', () => {
    expect(formItemProp('name')).toBe('name')
    expect(formItemProp('buyers[0].name')).toBe('buyers.0.name')
    expect(formItemProp('[2].title')).toBe('2.title')
  })
})
