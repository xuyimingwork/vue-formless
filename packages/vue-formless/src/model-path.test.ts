import { afterEach, describe, expect, it, vi } from 'vitest'
import { getIn, setIn } from './model-path'

describe('getIn', () => {
  describe('returns the value when the prop resolves', () => {
    it("returns 'Ada' when reading 'name'", () => {
      expect(getIn({ name: 'Ada' }, 'name')).toBe('Ada')
    })

    it("returns 'Ada' when reading 'buyers[0].name'", () => {
      expect(getIn({ buyers: [{ name: 'Ada' }] }, 'buyers[0].name')).toBe('Ada')
    })

    it("returns 'Ada' when reading '[0].name' on an array root", () => {
      expect(getIn([{ name: 'Ada' }], '[0].name')).toBe('Ada')
    })
  })

  describe('returns undefined when the prop does not resolve', () => {
    it("returns undefined when reading an empty prop ''", () => {
      expect(getIn({ name: 'Ada' }, '')).toBeUndefined()
    })

    it("returns undefined when reading the missing key 'age'", () => {
      expect(getIn({ name: 'Ada' }, 'age')).toBeUndefined()
    })

    it("returns undefined when reading 'a.b' where 'a' is a number", () => {
      expect(getIn({ a: 1 }, 'a.b')).toBeUndefined()
    })

    it("returns undefined when reading the key 'name' on an array root", () => {
      expect(getIn([{ name: 'Ada' }], 'name')).toBeUndefined()
    })

    it("returns undefined when reading '[5].name' on a 1-item array", () => {
      expect(getIn([{ name: 'Ada' }], '[5].name')).toBeUndefined()
    })
  })
})

describe('setIn', () => {
  describe('returns the next state', () => {
    it("returns { name: 'Bob' } when setting 'name' to 'Bob'", () => {
      expect(setIn({ name: 'Ada' }, 'name', 'Bob')).toEqual({ name: 'Bob' })
    })

    it("returns { buyers: [{ name: 'Bob' }] } when setting 'buyers[0].name' to 'Bob'", () => {
      expect(setIn({ buyers: [{ name: 'Ada' }] }, 'buyers[0].name', 'Bob')).toEqual({
        buyers: [{ name: 'Bob' }],
      })
    })

    it("returns [{ name: 'Bob' }] when setting '[0].name' to 'Bob' on an array root", () => {
      expect(setIn([{ name: 'Ada' }], '[0].name', 'Bob')).toEqual([{ name: 'Bob' }])
    })

    it("returns { buyers: [{ name: 'Bob' }] } when setting 'buyers[0].name' to 'Bob' on {}", () => {
      expect(setIn({}, 'buyers[0].name', 'Bob')).toEqual({
        buyers: [{ name: 'Bob' }],
      })
    })
  })

  describe('does not mutate the previous state', () => {
    it("returns a new root object when setting 'name' to 'Bob'", () => {
      const root = { name: 'Ada' }
      const next = setIn(root, 'name', 'Bob')
      expect(next).not.toBe(root)
      expect(root).toEqual({ name: 'Ada' })
    })

    it("clones the array and keeps its items untouched when setting 'buyers[0].name' to 'Bob'", () => {
      const buyers = [{ name: 'Ada' }]
      const root = { buyers }
      const next = setIn(root, 'buyers[0].name', 'Bob') as { buyers: typeof buyers }
      expect(next.buyers).not.toBe(buyers)
      expect(buyers[0]!.name).toBe('Ada')
      expect(next.buyers[0]!.name).toBe('Bob')
    })

    it("keeps sibling fields when setting 'buyers[0].gender' to 'm' after 'buyers[0].name' to 'Bob'", () => {
      const root = { buyers: [{ name: 'Ada', gender: 'f' }] }
      let next = setIn(root, 'buyers[0].name', 'Bob') as typeof root
      next = setIn(next, 'buyers[0].gender', 'm') as typeof root
      expect(next.buyers[0]).toEqual({ name: 'Bob', gender: 'm' })
      expect(root.buyers[0]).toEqual({ name: 'Ada', gender: 'f' })
    })
  })

  describe('throws on an invalid prop', () => {
    it("throws 'Cannot set an empty path' when setting '' to 'Bob'", () => {
      expect(() => setIn({ name: 'Ada' }, '', 'Bob')).toThrow(/empty path/)
    })

    it("throws when setting the key 'length' on an array root", () => {
      expect(() => setIn(['Ada'], 'length', 2)).toThrow(/array/)
    })
  })
})

describe('keyed-map models (B-track: dot numerals and ["…"] are object keys)', () => {
  const model = { m: { '0': { name: 'Ada' }, keep: 1 } }

  describe('getIn', () => {
    it("reads a dot-numeric key in 'm.0.name'", () => {
      expect(getIn(model, 'm.0.name')).toBe('Ada')
    })

    it("reads a quoted numeric key in 'm[\"0\"].name' identically", () => {
      expect(getIn(model, 'm["0"].name')).toBe('Ada')
    })

    it("reads a digit-leading id key in 'm.5f8a' as undefined when missing", () => {
      expect(getIn(model, 'm.5f8a')).toBeUndefined()
    })
  })

  describe('setIn', () => {
    it("writes 'm.0.name' on {} and builds an object, not an array", () => {
      expect(setIn({}, 'm.0.name', 'Bob')).toEqual({ m: { '0': { name: 'Bob' } } })
    })

    it("writes through a quoted numeric key and keeps sibling keys", () => {
      const next = setIn(model, 'm["0"].name', 'Bob')
      expect(next).toEqual({ m: { '0': { name: 'Bob' }, keep: 1 } })
      expect(model.m['0']).toEqual({ name: 'Ada' }) // immutable
    })

    it("writes a digit-leading id key in 'm.5f8a.nick'", () => {
      expect(setIn({}, 'm.5f8a.nick', 'x')).toEqual({ m: { '5f8a': { nick: 'x' } } })
    })
  })
})

describe('quoted keys that are not identifiers (reachability: any string key)', () => {
  it("reads the empty-string key in '[\"\"]'", () => {
    expect(getIn({ '': 'Ada' }, '[""]')).toBe('Ada')
  })

  it("reads a blank key in '[\"  \"]' without trimming it", () => {
    const model = { '  ': 'blank', '': 'empty' }
    expect(getIn(model, '["  "]')).toBe('blank')
    expect(getIn(model, '[""]')).toBe('empty')
  })

  it("reads a key containing dots in '[\"a.b\"]', not the nested path", () => {
    expect(getIn({ 'a.b': 'flat', a: { b: 'nested' } }, '["a.b"]')).toBe('flat')
  })

  it("reads a key containing brackets in '[\"a[b]\"]'", () => {
    expect(getIn({ 'a[b]': 'Ada' }, '["a[b]"]')).toBe('Ada')
  })

  it("writes the empty-string key in '[\"\"]' as an own property", () => {
    expect(setIn({ keep: 1 }, '[""]', 'Bob')).toEqual({ keep: 1, '': 'Bob' })
  })

  it("writes a blank key in 'a[\"  \"].name' and keeps siblings", () => {
    expect(setIn({ a: { '  ': { name: 'Ada' }, keep: 1 } }, 'a["  "].name', 'Bob')).toEqual({
      a: { '  ': { name: 'Bob' }, keep: 1 },
    })
  })

  it("writes a dotted key in '[\"a.b\"]' alongside the nested 'a.b' path", () => {
    const next = setIn({ a: { b: 'nested' } }, '["a.b"]', 'flat')
    expect(next).toEqual({ a: { b: 'nested' }, 'a.b': 'flat' })
  })
})

describe('shape-mismatch guards', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('reads warn once per path instead of returning wrong data silently', () => {
    it('warns when a key segment reads from an array', () => {
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      expect(getIn([{ name: 'Ada' }], 'email')).toBeUndefined()
      expect(getIn([{ name: 'Ada' }], 'email')).toBeUndefined() // deduped
      expect(spy).toHaveBeenCalledTimes(1)
      expect(spy.mock.calls[0]![0]).toMatch(/reading object key "email" from an array/)
    })

    it('warns when an index segment reads from an object', () => {
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      expect(getIn({ m: { '0': { name: 'Ada' } } }, 'm[0]')).toBeUndefined()
      expect(spy).toHaveBeenCalledTimes(1)
      expect(spy.mock.calls[0]![0]).toMatch(/reading array index "\[0\]" from an object/)
    })
  })

  it("throws when an index segment lands on a non-empty object in 'm[0].name'", () => {
    expect(() => setIn({ m: { '0': { name: 'Ada' } } }, 'm[0].name', 'Bob')).toThrow(
      /object node/,
    )
  })
})
