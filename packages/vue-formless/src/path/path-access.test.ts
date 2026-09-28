import { nextTick, ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import {
  bindPathAccess,
  getIn,
  setIn,
  type WritableSource,
} from './path-access'

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

describe('bindPathAccess', () => {
  /**
   * A writable source standing in for the FormView v-model port: reads the
   * backing value and records every write (the `update:modelValue` report).
   */
  function writableSource(initial: unknown): {
    source: WritableSource
    emitted: unknown[]
  } {
    let current = initial
    const emitted: unknown[] = []
    const source: WritableSource = {
      get value(): unknown {
        return current
      },
      set value(next: unknown) {
        current = next
        emitted.push(next)
      },
    }
    return { source, emitted }
  }

  it('reads a path relative to the bound source', () => {
    const { source } = writableSource({ buyers: [{ name: 'Ada' }] })
    const { getIn: getInBound } = bindPathAccess(source)

    expect(getInBound('buyers[0].name')).toBe('Ada')
    expect(getInBound('missing')).toBeUndefined()
  })

  it('does not mutate the source object', async () => {
    const root: Record<string, unknown> = { name: 'Ada' }
    const { source, emitted } = writableSource(root)
    const { setIn: setInBound } = bindPathAccess(source)

    setInBound('name', 'Bob')
    await nextTick()

    expect(root).toEqual({ name: 'Ada' })
    expect(emitted).toHaveLength(1)
    expect(emitted[0]).toEqual({ name: 'Bob' })
    expect(emitted[0]).not.toBe(root)
  })

  it('merges same-tick root writes into one write', async () => {
    const { source, emitted } = writableSource({})
    const { setIn: setInBound } = bindPathAccess(source)

    setInBound('start', 1)
    setInBound('end', 2)
    await nextTick()

    expect(emitted).toHaveLength(1)
    expect(emitted[0]).toEqual({ start: 1, end: 2 })
  })

  it('merges same-tick nested path writes into one write', async () => {
    const order = { buyers: [{ name: 'Ada', gender: 'f' }] }
    const { source, emitted } = writableSource(order)
    const { setIn: setInBound } = bindPathAccess(source)

    setInBound('buyers[0].name', 'Bob')
    setInBound('buyers[0].gender', 'm')
    await nextTick()

    expect(emitted).toHaveLength(1)
    expect(emitted[0]).toEqual({ buyers: [{ name: 'Bob', gender: 'm' }] })
    expect(order.buyers[0]).toEqual({ name: 'Ada', gender: 'f' })
  })

  it('writes separately across ticks', async () => {
    const { source, emitted } = writableSource({ a: 0 })
    const { setIn: setInBound } = bindPathAccess(source)

    setInBound('a', 1)
    await nextTick()
    setInBound('a', 2)
    await nextTick()

    expect(emitted).toHaveLength(2)
    expect(emitted[0]).toEqual({ a: 1 })
    expect(emitted[1]).toEqual({ a: 2 })
  })

  it('writes back into a plain ref source', async () => {
    const model = ref<unknown>({ name: 'Ada' })
    const { setIn: setInBound } = bindPathAccess(model)

    setInBound('name', 'Bob')
    await nextTick()

    expect(model.value).toEqual({ name: 'Bob' })
  })

  it('recovers after a flush throws instead of wedging `setIn`', async () => {
    const emitted: unknown[] = []
    let current: unknown = { name: 'Ada' }
    let failNextFlush = true
    const source: WritableSource = {
      get value(): unknown {
        if (failNextFlush) {
          failNextFlush = false
          throw new Error('boom while resolving the source')
        }
        return current
      },
      set value(next: unknown) {
        current = next
        emitted.push(next)
      },
    }
    const { setIn: setInBound } = bindPathAccess(source)

    // The flush error is no longer swallowed: it rejects the nextTick promise.
    // Capture it so the runner does not report it as an unhandled rejection.
    const rejections: unknown[] = []
    const onRejection = (reason: unknown) => rejections.push(reason)
    process.on('unhandledRejection', onRejection)

    try {
      // The first flush fails while resolving the source.
      setInBound('name', 'Bob')
      await nextTick()
      await new Promise((resolve) => setImmediate(resolve))

      expect(emitted).toHaveLength(0)
      expect(rejections).toHaveLength(1)
      expect(rejections[0]).toBeInstanceOf(Error)

      // The failed flush must not wedge `setIn`: a later write still
      // schedules a fresh flush and emits.
      setInBound('name', 'Bob')
      await nextTick()

      expect(emitted).toHaveLength(1)
      expect(emitted[0]).toEqual({ name: 'Bob' })
    } finally {
      process.off('unhandledRejection', onRejection)
    }
  })

  it('keeps a write made synchronously from the flush', async () => {
    const emitted: Record<string, unknown>[] = []
    let current: Record<string, unknown> = { a: 0 }
    const source: WritableSource = {
      get value(): unknown {
        return current
      },
      set value(next: unknown) {
        current = next as Record<string, unknown>
        emitted.push(current)
        // Re-enter `setIn` while this flush is still on the stack: the write
        // must land in a fresh batch, not the one this flush is about to drop.
        if (current.a === 1 && current.b === undefined) setInBound('b', 2)
      },
    }
    const { setIn: setInBound } = bindPathAccess(source)

    setInBound('a', 1)
    await nextTick()
    await nextTick()

    expect(emitted).toHaveLength(2)
    expect(emitted[0]).toEqual({ a: 1 })
    expect(emitted[1]).toEqual({ a: 1, b: 2 })
  })
})
