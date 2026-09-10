import { describe, expect, it } from 'vitest'
import { parsePath } from './parse-model-path'

describe('parsePath', () => {
  describe('parses a valid prop into segments', () => {
    it("parses 'name' into a single key segment", () => {
      expect(parsePath('name')).toEqual([{ type: 'key', key: 'name' }])
    })

    it("parses '[2]' into a single index segment", () => {
      expect(parsePath('[2]')).toEqual([{ type: 'index', index: 2 }])
    })

    it("parses 'buyers[0]' into a key segment and an index segment", () => {
      expect(parsePath('buyers[0]')).toEqual([
        { type: 'key', key: 'buyers' },
        { type: 'index', index: 0 },
      ])
    })

    it("parses 'buyers[0].name' into key, index and key segments", () => {
      expect(parsePath('buyers[0].name')).toEqual([
        { type: 'key', key: 'buyers' },
        { type: 'index', index: 0 },
        { type: 'key', key: 'name' },
      ])
    })

    it("returns undefined for the empty path '' (not a legal location)", () => {
      expect(parsePath('')).toBeUndefined()
    })
  })

  describe('returns undefined for an invalid prop instead of throwing', () => {
    it("returns undefined for a non-integer index in 'buyers[abc]'", () => {
      expect(parsePath('buyers[abc]')).toBeUndefined()
    })

    it("returns undefined for an unclosed bracket in 'buyers['", () => {
      expect(parsePath('buyers[')).toBeUndefined()
    })

    it("returns undefined for a doubled dot in 'a..b'", () => {
      expect(parsePath('a..b')).toBeUndefined()
    })

    it("returns undefined for a leading dot in '.a'", () => {
      expect(parsePath('.a')).toBeUndefined()
    })

    it("returns undefined for a trailing dot in 'a.'", () => {
      expect(parsePath('a.')).toBeUndefined()
    })

    it("returns undefined for a dots-only path in '..'", () => {
      expect(parsePath('..')).toBeUndefined()
    })

    it("returns undefined for a dot after a bracket in '[0].'", () => {
      expect(parsePath('[0].')).toBeUndefined()
    })

    it("returns undefined for an empty bracket in 'buyers[]' instead of an empty key", () => {
      expect(parsePath('buyers[]')).toBeUndefined()
    })

    it("returns undefined for unquoted whitespace in a bracket in 'buyers[ ]'", () => {
      expect(parsePath('buyers[ ]')).toBeUndefined()
    })

    it("returns undefined for a whitespace-only unquoted path in '  '", () => {
      expect(parsePath('  ')).toBeUndefined()
    })
  })

  describe('numeric object keys (B-track: dot numerals and quotes are keys, only [n] is an index)', () => {
    it("parses 'map.0.name' into three key segments, not an index", () => {
      expect(parsePath('map.0.name')).toEqual([
        { type: 'key', key: 'map' },
        { type: 'key', key: '0' },
        { type: 'key', key: 'name' },
      ])
    })

    it("parses '0.name' on a numeric-keyed root", () => {
      expect(parsePath('0.name')).toEqual([
        { type: 'key', key: '0' },
        { type: 'key', key: 'name' },
      ])
    })

    it("parses a digit-leading id key in 'map.5f8a.name'", () => {
      expect(parsePath('map.5f8a.name')).toEqual([
        { type: 'key', key: 'map' },
        { type: 'key', key: '5f8a' },
        { type: 'key', key: 'name' },
      ])
    })
  })

  describe('quoted object keys', () => {
    it.each(['map.0.name', 'map["0"].name', "map['0'].name"])(
      "parses '%s' as key 'map', key '0', key 'name'",
      (input) => {
        expect(parsePath(input)).toEqual([
          { type: 'key', key: 'map' },
          { type: 'key', key: '0' },
          { type: 'key', key: 'name' },
        ])
      },
    )

    it("parses a quoted key containing dots and brackets ('map[\"a.b[c]\"].name')", () => {
      expect(parsePath('map["a.b[c]"].name')).toEqual([
        { type: 'key', key: 'map' },
        { type: 'key', key: 'a.b[c]' },
        { type: 'key', key: 'name' },
      ])
    })

    it('parses escaped quotes inside a quoted key', () => {
      expect(parsePath('map["he said \\"hi\\""].name')).toEqual([
        { type: 'key', key: 'map' },
        { type: 'key', key: 'he said "hi"' },
        { type: 'key', key: 'name' },
      ])
    })

    it("keeps '[0]' an index while '[\"0\"]' is an object key", () => {
      expect(parsePath('[0]')).toEqual([{ type: 'index', index: 0 }])
      expect(parsePath('["0"]')).toEqual([{ type: 'key', key: '0' }])
    })

    it("returns undefined for an unclosed quoted key in 'map[\"x'", () => {
      expect(parsePath('map["x')).toBeUndefined()
    })

    // A quoted segment is the total escape hatch: any string key a JS object
    // can hold is reachable, including '' (`obj['']` is legal) and blanks —
    // nothing is trimmed or rejected (ADR-011). Only the *unquoted* form is
    // restricted, and only because it is sugar.
    it("parses an empty quoted key in 'map[\"\"]' as the empty-string key", () => {
      expect(parsePath('map[""]')).toEqual([
        { type: 'key', key: 'map' },
        { type: 'key', key: '' },
      ])
      expect(parsePath("map['']")).toEqual([
        { type: 'key', key: 'map' },
        { type: 'key', key: '' },
      ])
    })

    it("parses a root empty quoted key in '[\"\"]'", () => {
      expect(parsePath('[""]')).toEqual([{ type: 'key', key: '' }])
      expect(parsePath("['']")).toEqual([{ type: 'key', key: '' }])
    })

    it("keeps an empty and a blank key distinct in 'map[\"\"].name' / 'map[\"  \"].name'", () => {
      expect(parsePath('map[""].name')).toEqual([
        { type: 'key', key: 'map' },
        { type: 'key', key: '' },
        { type: 'key', key: 'name' },
      ])
      expect(parsePath('map["  "].name')).toEqual([
        { type: 'key', key: 'map' },
        { type: 'key', key: '  ' },
        { type: 'key', key: 'name' },
      ])
    })

    it("parses a whitespace-only root quoted key in '[\"  \"]'", () => {
      expect(parsePath('["  "]')).toEqual([{ type: 'key', key: '  ' }])
      expect(parsePath("['  ']")).toEqual([{ type: 'key', key: '  ' }])
    })

    it('keeps tabs and mixed whitespace literal inside a quoted key', () => {
      expect(parsePath('map[" \t "]')).toEqual([
        { type: 'key', key: 'map' },
        { type: 'key', key: ' \t ' },
      ])
    })

    it("returns undefined when the bracket does not close right after the quote in 'map[\"x\"y]'", () => {
      expect(parsePath('map["x"y]')).toBeUndefined()
    })

    it("returns undefined for an unclosed bracket after a closing quote in 'map[\"x\"'", () => {
      expect(parsePath('map["x"')).toBeUndefined()
    })
  })
})
