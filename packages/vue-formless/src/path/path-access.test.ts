import { nextTick, ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import {
  bindPathAccess,
  getIn,
  setIn,
  type WritableSource,
} from './path-access'

/**
 * `describe` split (MECE): the *first* level divides by the contract surface
 * under test — the three exports — so each case drives exactly one of them:
 * `getIn` (the pure read), `setIn` (the pure write), and `bindPathAccess` (the
 * bound façade, root captured once).
 *
 * `getIn` re-splits on the *read outcome*: `a read that resolves` vs `a read
 * that resolves to undefined` — every path lands in exactly one. The resolving
 * half re-splits on arity (a single segment / a multi-segment path); the single
 * segment on the segment kind (`a key` / `an array index`), and the
 * multi-segment on its segment mix (`key segments only` / `with an index
 * segment`). A quoted key is not a group of its own — the parser folds it into a
 * `key` segment (cf. path-parse.test.ts) — so a quoted-key path reads with the
 * key-only paths; a collision with an `Object.prototype` member likewise is not
 * a group of its own, so an own key that shadows one still reads in the key
 * branch. The undefined half re-splits by the *first* step that stops the walk,
 * so every case maps to exactly one state: `a path that is not parseable`
 * (parsePath folded — one representative; the grammar belongs to
 * path-parse.test.ts), `the root is not a container` (null / undefined /
 * primitive), `a node on the way is not a container` (a primitive mid-path),
 * `a segment meets the wrong shape` (key over array, index over object —
 * silent), `the key is not an own property` (`an absent key` / `an inherited
 * key`), and `the index is out of range`.
 *
 * `setIn` re-splits on *what the write does to the addressed node* — the branch
 * `writeSegment` takes: `not the addressed shape` (grown when absent, overwritten
 * — contents dropped — when present) vs `of the addressed shape` (merged, siblings
 * kept), plus the `not parseable` early return. Purity (`the input root` is never
 * mutated; every level is cloned on the way) is an orthogonal obligation asserted
 * *inside* those leaves, not a sibling group, so no input is split across two.
 *
 * `bindPathAccess` re-splits by member — `the bound read` vs `the bound write` —
 * and the write by lifecycle phase: `batching` (how many flushes a tick's writes
 * collapse into), `the write-back` (one `source.value = next` per flush, into a
 * plain `ref` too, never mutating the source object, carrying every batched
 * write), `a flush that throws` (a throw does not wedge the next write), and `a
 * re-entrant write from the flush` (a write fired synchronously from the flush
 * lands in a fresh batch).
 *
 * `it` rules: a title names the *path* (in backticks) and the input shape, and
 * only echoes an expectation when that expectation is a spec value rather than
 * fixture data. A resolving read reads `should read \`<path>\` on <root shape>`
 * — the `'Ada'` it returns is fixture data, so it lives in the body, not the
 * title. A read that misses reads `should return undefined when reading
 * \`<path>\` (<reason>)` — `undefined` is the spec value, so it is echoed; a
 * root-level failure (null / undefined / primitive root) reads
 * `should return undefined when the root is <shape>` instead. The body
 * asserts only the export's return value or observable effect.
 */
describe('getIn', () => {
  describe('a read that resolves', () => {
    describe('a single segment', () => {
      describe('a key', () => {
        describe('a plain key', () => {
          it('should read `name` on an object root', () => {
            expect(getIn({ name: 'Ada' }, 'name')).toBe('Ada')
          })
        })

        describe('a key that collides with an Object.prototype member', () => {
          it('should read back an own key that shadows an Object.prototype member', () => {
            expect(getIn(setIn({}, 'toString', 'field'), 'toString')).toBe('field')
            expect(getIn(setIn({}, 'hasOwnProperty', 'field'), 'hasOwnProperty')).toBe('field')
          })

          it('should read the quoted "__proto__" key as plain data, not as a prototype', () => {
            const next = setIn({}, '["__proto__"]', 'x') as Record<string, unknown>
            expect(getIn(next, '["__proto__"]')).toBe('x')
            expect(Object.getPrototypeOf(next)).toBe(Object.prototype)
          })
        })
      })

      describe('an array index', () => {
        it('should read `[0]` on an array root', () => {
          expect(getIn(['Ada'], '[0]')).toBe('Ada')
        })
      })
    })

    describe('a multi-segment path', () => {
      describe('key segments only (plain or quoted)', () => {
        it('should read `a.b.c` on an object root', () => {
          expect(getIn({ a: { b: { c: 'x' } } }, 'a.b.c')).toBe('x')
        })

        // A quoted key is not a group of its own: the parser folds it into a
        // `key` segment (cf. path-parse.test.ts), so it reads as any other key.
        it('should read `map["0"].name` on an object root (a quoted key reads as a key)', () => {
          expect(getIn({ map: { '0': { name: 'Ada' } } }, 'map["0"].name')).toBe('Ada')
        })
      })

      describe('with an index segment', () => {
        it('should read `buyers[0].name` on an object root', () => {
          expect(getIn({ buyers: [{ name: 'Ada' }] }, 'buyers[0].name')).toBe('Ada')
        })

        it('should read `[0].name` on an array root', () => {
          expect(getIn([{ name: 'Ada' }], '[0].name')).toBe('Ada')
        })
      })
    })
  })

  describe('a read that resolves to undefined', () => {
    describe('a path that is not parseable', () => {
      // parsePath owns the grammar (path-parse.test.ts); here we only pin the
      // fold `segments ? readSegments(...) : undefined` on this export.
      it('should return undefined when reading an empty path', () => {
        expect(getIn({ name: 'Ada' }, '')).toBeUndefined()
      })
    })

    describe('the root is not a container', () => {
      it('should return undefined when the root is null', () => {
        expect(getIn(null, 'a.b')).toBeUndefined()
      })

      it('should return undefined when the root is undefined', () => {
        expect(getIn(undefined, 'a.b.c')).toBeUndefined()
      })

      it('should return undefined when the root is a primitive', () => {
        expect(getIn(5, 'a')).toBeUndefined()
        expect(getIn('x', '[0]')).toBeUndefined()
      })
    })

    describe('a node on the way is not a container', () => {
      it('should return undefined when reading `a.b` (`a` is a number)', () => {
        expect(getIn({ a: 1 }, 'a.b')).toBeUndefined()
      })
    })

    describe('a segment meets the wrong shape', () => {
      it('should return undefined when reading `name` on an array root (a key over an array)', () => {
        expect(getIn([{ name: 'Ada' }], 'name')).toBeUndefined()
      })

      it('should return undefined when reading `m[0]` (an index over an object)', () => {
        expect(getIn({ m: { '0': { name: 'Ada' } } }, 'm[0]')).toBeUndefined()
      })

      it('should stay silent instead of warning on a mismatch', () => {
        const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
        try {
          expect(getIn([{ name: 'Ada' }], 'email')).toBeUndefined()
          expect(getIn([{ name: 'Ada' }], 'email.foo')).toBeUndefined()
          expect(getIn({ m: { '0': { name: 'Ada' } } }, 'm[0]')).toBeUndefined()
          expect(spy).not.toHaveBeenCalled()
        } finally {
          spy.mockRestore()
        }
      })
    })

    describe('the key is not an own property', () => {
      describe('an absent key', () => {
        it('should return undefined when reading `age`', () => {
          expect(getIn({ name: 'Ada' }, 'age')).toBeUndefined()
        })

        it('should return undefined when reading `a.b.c` (`a` is missing)', () => {
          expect(getIn({}, 'a.b.c')).toBeUndefined()
        })

        it('should return undefined when reading `a.b.c` (`a` is an empty object)', () => {
          expect(getIn({ a: {} }, 'a.b.c')).toBeUndefined()
        })
      })

      describe('an inherited key (the prototype chain is not data)', () => {
        it('should return undefined when reading `constructor`', () => {
          expect(getIn({ name: 'Ada' }, 'constructor')).toBeUndefined()
        })

        it('should return undefined when reading `toString`', () => {
          expect(getIn({ name: 'Ada' }, 'toString')).toBeUndefined()
        })

        it('should return undefined when reading `__proto__` or `["__proto__"]`', () => {
          expect(getIn({}, '__proto__')).toBeUndefined()
          expect(getIn({}, '["__proto__"]')).toBeUndefined()
        })

        it('should return undefined when reading an inherited `nickname`', () => {
          const model = Object.create({ nickname: 'anon' }) as Record<string, unknown>
          model.name = 'Ada'
          expect(getIn(model, 'nickname')).toBeUndefined()
        })
      })
    })

    describe('the index is out of range', () => {
      it('should return undefined when reading `[5]` (a single-segment index)', () => {
        expect(getIn(['Ada'], '[5]')).toBeUndefined()
      })

      it('should return undefined when reading `[5].name` (an index out of range)', () => {
        expect(getIn([{ name: 'Ada' }], '[5].name')).toBeUndefined()
      })
    })
  })
})

describe('setIn', () => {
  describe('a path that is not parseable', () => {
    // parsePath owns the grammar (path-parse.test.ts); here we only pin the fold
    // `segments ? writeSegments(...) : root` on this export.
    it('should return the root unchanged at `` (the empty path)', () => {
      const root = { name: 'Ada' }
      expect(setIn(root, '', 'Bob')).toBe(root)
      expect(root).toEqual({ name: 'Ada' })
    })
  })

  describe('a node that is not the addressed shape', () => {
    describe('absent (the node grows into the shape the segment addresses)', () => {
      it("should write { buyers: [{ name: 'Bob' }] } at `buyers[0].name` on {}", () => {
        expect(setIn({}, 'buyers[0].name', 'Bob')).toEqual({
          buyers: [{ name: 'Bob' }],
        })
      })

      it("should write { a: [{ name: 'Bob' }] } at `a[0].name` on `{ a: {} }`", () => {
        expect(setIn({ a: {} }, 'a[0].name', 'Bob')).toEqual({ a: [{ name: 'Bob' }] })
      })

      it('should grow a null root into the shape the segment addresses', () => {
        expect(setIn(null, 'a', 'Bob')).toEqual({ a: 'Bob' })
        expect(setIn(null, '[0]', 'Bob')).toEqual(['Bob'])
      })

      it('should grow a primitive root into the shape the segment addresses', () => {
        expect(setIn(5, 'a', 'Bob')).toEqual({ a: 'Bob' })
        expect(setIn('x', 'a', 'Bob')).toEqual({ a: 'Bob' })
      })
    })

    describe('present (the node is overwritten, its old contents dropped)', () => {
      it("should write { a: { b: 'Bob' } } at `a.b` on `{ a: 1 }` (a key overwrites a primitive)", () => {
        expect(setIn({ a: 1 }, 'a.b', 'Bob')).toEqual({ a: { b: 'Bob' } })
      })

      it("should write { length: 2 } at `length` on `['Ada']` (a key overwrites an array)", () => {
        expect(setIn(['Ada'], 'length', 2)).toEqual({ length: 2 })
      })

      it("should write { m: [{ name: 'Bob' }] } at `m[0].name` (an index overwrites an object)", () => {
        expect(setIn({ m: { '0': { name: 'Ada' } } }, 'm[0].name', 'Bob')).toEqual({
          m: [{ name: 'Bob' }],
        })
      })

      it('should stay silent instead of warning on every overwrite', () => {
        const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
        try {
          expect(setIn(['Ada'], 'length', 2)).toEqual({ length: 2 })
          expect(setIn({ m: { '0': { name: 'Ada' } } }, 'm[0].name', 'Bob')).toEqual({
            m: [{ name: 'Bob' }],
          })
          expect(spy).not.toHaveBeenCalled()
        } finally {
          spy.mockRestore()
        }
      })
    })
  })

  describe('a node of the addressed shape (merged, siblings kept)', () => {
    it("should write { name: 'Bob' } at `name` and leave the input root untouched", () => {
      const root = { name: 'Ada' }
      const next = setIn(root, 'name', 'Bob')
      expect(next).toEqual({ name: 'Bob' })
      expect(next).not.toBe(root) // a fresh object, not the same reference
      expect(root).toEqual({ name: 'Ada' })
    })

    it("should write { buyers: [{ name: 'Bob' }] } at `buyers[0].name` and clone the array", () => {
      const buyers = [{ name: 'Ada' }]
      const root = { buyers }
      const next = setIn(root, 'buyers[0].name', 'Bob') as { buyers: typeof buyers }
      expect(next.buyers).not.toBe(buyers) // the array is cloned on the way
      expect(buyers[0]!.name).toBe('Ada') // the input array is untouched
      expect(next.buyers[0]!.name).toBe('Bob')
    })

    it("should write [{ name: 'Bob' }] at `[0].name` on an array root", () => {
      expect(setIn([{ name: 'Ada' }], '[0].name', 'Bob')).toEqual([{ name: 'Bob' }])
    })

    it("should keep siblings at `buyers[0].gender` after `buyers[0].name`", () => {
      const root = { buyers: [{ name: 'Ada', gender: 'f' }] }
      let next = setIn(root, 'buyers[0].name', 'Bob') as typeof root
      next = setIn(next, 'buyers[0].gender', 'm') as typeof root
      expect(next.buyers[0]).toEqual({ name: 'Bob', gender: 'm' })
      expect(root.buyers[0]).toEqual({ name: 'Ada', gender: 'f' }) // immutable
    })

    // A quoted key is not a group of its own: the parser folds it into a `key`
    // segment, so it writes as any other key.
    it("should write { m: { '0': { name: 'Bob' } } } at `m[\"0\"].name` (a quoted key writes as a key)", () => {
      expect(setIn({}, 'm["0"].name', 'Bob')).toEqual({
        m: { '0': { name: 'Bob' } },
      })
    })
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

  describe('the bound read', () => {
    it('should read a path relative to the bound source', () => {
      const { source } = writableSource({ buyers: [{ name: 'Ada' }] })
      const { getIn: getInBound } = bindPathAccess(source)

      expect(getInBound('buyers[0].name')).toBe('Ada')
      expect(getInBound('missing')).toBeUndefined()
    })
  })

  describe('the bound write', () => {
    describe('batching (how many flushes a tick collapses into)', () => {
      it('should flush same-tick root writes once', async () => {
        const { source, emitted } = writableSource({})
        const { setIn: setInBound } = bindPathAccess(source)

        setInBound('start', 1)
        setInBound('end', 2)
        await nextTick()

        expect(emitted).toHaveLength(1)
      })

      it('should flush same-tick nested path writes once', async () => {
        const order = { buyers: [{ name: 'Ada', gender: 'f' }] }
        const { source, emitted } = writableSource(order)
        const { setIn: setInBound } = bindPathAccess(source)

        setInBound('buyers[0].name', 'Bob')
        setInBound('buyers[0].gender', 'm')
        await nextTick()

        expect(emitted).toHaveLength(1)
      })

      it('should flush writes from separate ticks separately', async () => {
        const { source, emitted } = writableSource({ a: 0 })
        const { setIn: setInBound } = bindPathAccess(source)

        setInBound('a', 1)
        await nextTick()
        setInBound('a', 2)
        await nextTick()

        expect(emitted).toHaveLength(2)
      })
    })

    describe('the write-back (one `source.value = next` per flush)', () => {
      it('should carry every same-tick write in the single flush', async () => {
        const { source, emitted } = writableSource({})
        const { setIn: setInBound } = bindPathAccess(source)

        setInBound('start', 1)
        setInBound('end', 2)
        await nextTick()

        expect(emitted[0]).toEqual({ start: 1, end: 2 })
      })

      it('should carry every same-tick nested write and leave the input untouched', async () => {
        const order = { buyers: [{ name: 'Ada', gender: 'f' }] }
        const { source, emitted } = writableSource(order)
        const { setIn: setInBound } = bindPathAccess(source)

        setInBound('buyers[0].name', 'Bob')
        setInBound('buyers[0].gender', 'm')
        await nextTick()

        expect(emitted[0]).toEqual({ buyers: [{ name: 'Bob', gender: 'm' }] })
        expect(order.buyers[0]).toEqual({ name: 'Ada', gender: 'f' }) // immutable
      })

      it("should write each tick's value in its own flush", async () => {
        const { source, emitted } = writableSource({ a: 0 })
        const { setIn: setInBound } = bindPathAccess(source)

        setInBound('a', 1)
        await nextTick()
        setInBound('a', 2)
        await nextTick()

        expect(emitted[0]).toEqual({ a: 1 })
        expect(emitted[1]).toEqual({ a: 2 })
      })

      it('should clone from the current value and never mutate the source object', async () => {
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

      it('should write back into a plain ref source', async () => {
        const model = ref<unknown>({ name: 'Ada' })
        const { setIn: setInBound } = bindPathAccess(model)

        setInBound('name', 'Bob')
        await nextTick()

        expect(model.value).toEqual({ name: 'Bob' })
      })
    })

    describe('a flush that throws', () => {
      it('should recover after a flush throws instead of wedging `setIn`', async () => {
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
    })

    describe('a re-entrant write from the flush', () => {
      it('should keep a write made synchronously from the flush', async () => {
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
  })
})
