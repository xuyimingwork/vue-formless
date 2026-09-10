import { describe, expect, it, vi } from 'vitest'
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

    it("returns undefined when reading 'a.b.c' where 'a' is missing", () => {
      expect(getIn({}, 'a.b.c')).toBeUndefined()
    })

    it("returns undefined when reading 'a.b.c' where 'a' is an empty object", () => {
      expect(getIn({ a: {} }, 'a.b.c')).toBeUndefined()
    })

    it("returns undefined when the root is null", () => {
      expect(getIn(null, 'a.b')).toBeUndefined()
    })

    it("returns undefined when the root is undefined", () => {
      expect(getIn(undefined, 'a.b.c')).toBeUndefined()
    })

    it("returns undefined when reading the key 'name' on an array root", () => {
      expect(getIn([{ name: 'Ada' }], 'name')).toBeUndefined()
    })

    it("returns undefined when reading '[5].name' on a 1-item array", () => {
      expect(getIn([{ name: 'Ada' }], '[5].name')).toBeUndefined()
    })

    it("returns undefined when reading an invalid prop like 'a..b'", () => {
      expect(getIn({ name: 'Ada' }, 'a..b')).toBeUndefined()
    })
  })

  it('stays silent on a shape mismatch instead of warning', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      expect(getIn([{ name: 'Ada' }], 'email')).toBeUndefined()
      expect(getIn({ m: { '0': { name: 'Ada' } } }, 'm[0]')).toBeUndefined()
      expect(getIn([{ name: 'Ada' }], 'email.foo')).toBeUndefined()
      expect(spy).not.toHaveBeenCalled()
    } finally {
      spy.mockRestore()
    }
  })

  describe('reads own properties only (the prototype chain is not data)', () => {
    it("returns undefined when reading the inherited key 'constructor'", () => {
      expect(getIn({ name: 'Ada' }, 'constructor')).toBeUndefined()
    })

    it("returns undefined when reading the inherited key 'toString'", () => {
      expect(getIn({ name: 'Ada' }, 'toString')).toBeUndefined()
    })

    it("returns undefined when reading the inherited key '__proto__'", () => {
      expect(getIn({}, '__proto__')).toBeUndefined()
      expect(getIn({}, '["__proto__"]')).toBeUndefined()
    })

    it('returns undefined for a default that lives on the prototype', () => {
      const model = Object.create({ nickname: 'anon' }) as Record<string, unknown>
      model.name = 'Ada'
      expect(getIn(model, 'name')).toBe('Ada') // an own key still reads
      expect(getIn(model, 'nickname')).toBeUndefined() // an inherited one does not
    })

    it('reads back a key that shadows an Object.prototype member once written', () => {
      expect(getIn(setIn({}, 'toString', 'field'), 'toString')).toBe('field')
    })

    it("reads the 'hasOwnProperty' key without calling the shadowed method", () => {
      expect(getIn(setIn({}, 'hasOwnProperty', 'field'), 'hasOwnProperty')).toBe('field')
    })

    it('writes and reads the quoted "__proto__" key as plain data, not as a prototype', () => {
      const next = setIn({}, '["__proto__"]', 'x') as Record<string, unknown>
      expect(getIn(next, '["__proto__"]')).toBe('x')
      expect(Object.getPrototypeOf(next)).toBe(Object.prototype)
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

  describe('leaves the root unchanged on an invalid or empty prop', () => {
    it("returns the root unchanged when setting '' to 'Bob'", () => {
      const root = { name: 'Ada' }
      expect(setIn(root, '', 'Bob')).toEqual({ name: 'Ada' })
    })

    it("returns the root unchanged when setting an invalid prop like 'a..b'", () => {
      const root = { name: 'Ada' }
      expect(setIn(root, 'a..b', 'Bob')).toEqual({ name: 'Ada' })
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

describe('shape mismatch on write (merge when the shape matches, overwrite when it does not)', () => {
  it("overwrites an array with an object when a key lands on it: setIn(['Ada'], 'length', 2)", () => {
    expect(setIn(['Ada'], 'length', 2)).toEqual({ length: 2 })
  })

  it("overwrites an object with an array when an index lands on it: 'm[0].name' over a keyed map", () => {
    expect(setIn({ m: { '0': { name: 'Ada' } } }, 'm[0].name', 'Bob')).toEqual({
      m: [{ name: 'Bob' }],
    })
  })

  it('stays silent on every overwrite instead of warning', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      // Non-empty containers dropped by a mismatch — previously warned.
      expect(setIn(['Ada'], 'length', 2)).toEqual({ length: 2 })
      expect(setIn({ m: { '0': { name: 'Ada' } } }, 'm[0].name', 'Bob')).toEqual({
        m: [{ name: 'Bob' }],
      })
      // Empty containers and missing nodes grow silently.
      expect(setIn({}, 'buyers[0].name', 'Bob')).toEqual({ buyers: [{ name: 'Bob' }] })
      expect(setIn({ a: {} }, 'a[0].name', 'Bob')).toEqual({ a: [{ name: 'Bob' }] })
      expect(setIn({ a: 1 }, 'a.b', 'Bob')).toEqual({ a: { b: 'Bob' } })
      expect(spy).not.toHaveBeenCalled()
    } finally {
      spy.mockRestore()
    }
  })
})
