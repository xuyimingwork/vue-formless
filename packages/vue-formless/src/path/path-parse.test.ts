import { describe, expect, it } from 'vitest'
import { parsePath } from './path-parse'

/**
 * `describe` split (MECE): the *first* level divides by contract outcome —
 * `a valid prop` (a `PathSegment[]`) vs `an invalid prop` (`undefined`) — so the
 * two groups never overlap and together cover the whole return type. Each half
 * then re-splits on a *single* criterion:
 *
 *   `a valid prop` — arity: `a single segment` vs `a multi-segment path`. Every
 *   parseable path has exactly one arity, so the split is a partition. A single
 *   segment is further split by its kind (unquoted key / array index / quoted
 *   key); a multi-segment path by the bracket it uses (names only / one or more
 *   indexes / one or more quoted keys) — no case mixes the two bracket kinds, and
 *   a `both` leaf is added only if one ever does. The `[0]` vs `["0"]` contrast
 *   lives *inside* these leaves as a `cf.` note, not as a cross-cutting group.
 *
 *   `an invalid prop` — the parse state that rejects the input, i.e. the *real*
 *   failure point in path-parse.ts, so every case maps to exactly one state: the
 *   `if (!path)` early return (`an empty prop`), then one leaf per state —
 *   `expectSegment` / `afterSegment` / `afterDot` / `inBracket` / `quotedBody`
 *   + `quotedEnd` (the last two share `a bad quoted key`). A dot numeral such as
 *   `map.0.name` therefore sits with the other `afterDot` failures rather than
 *   under "a malformed name": grouping is by state, not by what the input looks
 *   like.
 *
 * Every case lands in exactly one leaf: a valid case is never asserted under the
 * invalid half, and a repeated input goes to a single group rather than two (a
 * numeric object key is reachable only quoted, so `map["0"].name` lives under
 * "that uses a quoted key" while a dot numeral such as `map.0.name` is an
 * `afterDot` error).
 *
 * `it` rules: the title reads `should parse \`<input>\` as <expected>` — the
 * literal input in backticks, then what the caller gets back. The body asserts
 * only `parsePath`'s return value: `toEqual` a segment array for a valid prop or
 * `toBeUndefined` for an invalid one. No case asserts the *reason* it fails —
 * the parser folds every syntax error into `undefined` by design (path-parse.ts),
 * so `undefined` is the whole contract at this seam.
 *
 * The grammar is a subset of a JS member-access chain: a `.` is always followed
 * by a name, and a name never follows a `]` without a `.` first.
 */
describe('parsePath', () => {
  describe('a valid prop', () => {
    describe('a single segment', () => {
      describe('an unquoted key', () => {
        it('should parse `name` as $.name', () => {
          expect(parsePath('name')).toEqual([{ type: 'key', key: 'name' }])
        })

        // A digit is a `name` character as long as it is not the first one.
        it('should parse `a1` as $.a1', () => {
          expect(parsePath('a1')).toEqual([{ type: 'key', key: 'a1' }])
        })
      })

      describe('an array index', () => {
        it('should parse `[2]` as $[2]', () => {
          expect(parsePath('[2]')).toEqual([{ type: 'index', index: 2 }])
        })

        // `[0]` is always an array index; a numeric *object* key is reachable
        // only quoted (`["0"]`, the leaf below), so the two never collide.
        it('should parse `[0]` as $[0] (a bracket numeral is always an index; cf. `["0"]`)', () => {
          expect(parsePath('[0]')).toEqual([{ type: 'index', index: 0 }])
        })

        it('should parse `[10]` as $[10] (a canonical multi-digit index)', () => {
          expect(parsePath('[10]')).toEqual([{ type: 'index', index: 10 }])
        })
      })

      describe('a quoted key', () => {
        // A quoted segment is the escape hatch for keys that are not a plain
        // `name`; '' is the extreme case (`obj['']` is legal). Nothing is
        // trimmed or rejected (design.md §15).
        it("should parse `[\"\"]` as $['']", () => {
          expect(parsePath('[""]')).toEqual([{ type: 'key', key: '' }])
          expect(parsePath("['']")).toEqual([{ type: 'key', key: '' }])
        })

        it("should parse `[\"  \"]` as $['  '] (a blank key is not trimmed)", () => {
          expect(parsePath('["  "]')).toEqual([{ type: 'key', key: '  ' }])
          expect(parsePath("['  ']")).toEqual([{ type: 'key', key: '  ' }])
        })

        // The only spelling that reaches a numeric *object* key; the bracket
        // numeral `[0]` is an index instead (cf. the leaf above).
        it("should parse `[\"0\"]` as $['0'] (a numeric key is reachable only quoted; cf. `[0]`)", () => {
          expect(parsePath('["0"]')).toEqual([{ type: 'key', key: '0' }])
        })
      })
    })

    describe('a multi-segment path', () => {
      describe('names only', () => {
        // `$` and `_` are JS IdentifierName characters, so they are part of the
        // same key — never separators and never syntax errors.
        it('should parse `$store._id` as $.$store._id', () => {
          expect(parsePath('$store._id')).toEqual([
            { type: 'key', key: '$store' },
            { type: 'key', key: '_id' },
          ])
        })

        it('should parse `a.b.c` as $.a.b.c', () => {
          expect(parsePath('a.b.c')).toEqual([
            { type: 'key', key: 'a' },
            { type: 'key', key: 'b' },
            { type: 'key', key: 'c' },
          ])
        })
      })

      describe('that uses an index', () => {
        it('should parse `buyers[0]` as $.buyers[0]', () => {
          expect(parsePath('buyers[0]')).toEqual([
            { type: 'key', key: 'buyers' },
            { type: 'index', index: 0 },
          ])
        })

        it('should parse `buyers[0].name` as $.buyers[0].name', () => {
          expect(parsePath('buyers[0].name')).toEqual([
            { type: 'key', key: 'buyers' },
            { type: 'index', index: 0 },
            { type: 'key', key: 'name' },
          ])
        })

        // A '[' may follow a ']' directly: bracket chaining needs no '.'.
        it('should parse `buyers[0][1]` as $.buyers[0][1]', () => {
          expect(parsePath('buyers[0][1]')).toEqual([
            { type: 'key', key: 'buyers' },
            { type: 'index', index: 0 },
            { type: 'index', index: 1 },
          ])
        })

        // A numeric *object* key spelled `["0"]` is a key chain, not this one.
        it('should parse `[0].name` as an index chain (cf. `["0"].name`)', () => {
          expect(parsePath('[0].name')).toEqual([
            { type: 'index', index: 0 },
            { type: 'key', key: 'name' },
          ])
        })
      })

      describe('that uses a quoted key', () => {
        it.each(['map["0"].name', "map['0'].name"])(
          "should parse `%s` as $.map['0'].name",
          (input) => {
            expect(parsePath(input)).toEqual([
              { type: 'key', key: 'map' },
              { type: 'key', key: '0' },
              { type: 'key', key: 'name' },
            ])
          },
        )

        it("should parse `map[\"a.b[c]\"].name` as $.map['a.b[c]'].name", () => {
          expect(parsePath('map["a.b[c]"].name')).toEqual([
            { type: 'key', key: 'map' },
            { type: 'key', key: 'a.b[c]' },
            { type: 'key', key: 'name' },
          ])
        })

        // A quoted segment is the escape hatch for keys that are not a plain
        // `name`: any key holding **at most one** of the two quotes is reachable,
        // including '' (`obj['']` is legal) and blanks — nothing is trimmed or
        // rejected (design.md §15). Only the *unquoted* form is otherwise
        // restricted, and only because it is sugar.
        it("should parse `map[\"\"]` as $.map[''] (the empty-string key)", () => {
          expect(parsePath('map[""]')).toEqual([
            { type: 'key', key: 'map' },
            { type: 'key', key: '' },
          ])
          expect(parsePath("map['']")).toEqual([
            { type: 'key', key: 'map' },
            { type: 'key', key: '' },
          ])
        })

        // An empty key and a blank key stay distinct: nothing is trimmed.
        it("should parse `map[\"\"].name` as $.map[''].name but `map[\"  \"].name` as $.map['  '].name (empty and blank keys stay distinct)", () => {
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

        it("should parse `map[\" \\t \"]` as $.map[' \\t ']", () => {
          expect(parsePath('map[" \t "]')).toEqual([
            { type: 'key', key: 'map' },
            { type: 'key', key: ' \t ' },
          ])
        })

        // There is no escape: a '\' is an ordinary char, so a literal backslash
        // is written plainly (and needs no doubling).
        it("should parse `map[\"a\\b\"]` as $.map['a\\b']", () => {
          expect(parsePath('map["a\\b"]')).toEqual([
            { type: 'key', key: 'map' },
            { type: 'key', key: 'a\\b' },
          ])
        })

        // Only the opening quote closes the key; the other quote is a literal.
        it("should parse `map[\"it's\"]` as $.map[\"it's\"]", () => {
          expect(parsePath('map["it\'s"]')).toEqual([
            { type: 'key', key: 'map' },
            { type: 'key', key: "it's" },
          ])
        })

        it("should parse `map['say \"hi\"']` as $.map['say \"hi\"']", () => {
          expect(parsePath('map[\'say "hi"\']')).toEqual([
            { type: 'key', key: 'map' },
            { type: 'key', key: 'say "hi"' },
          ])
        })

        // A numeric *object* key spelled `["0"]` is a key chain; `[0]` is not.
        it("should parse `[\"0\"].name` as a key chain (cf. `[0].name`)", () => {
          expect(parsePath('["0"].name')).toEqual([
            { type: 'key', key: '0' },
            { type: 'key', key: 'name' },
          ])
        })

        // A '[' may follow a ']' directly, even when the bracket held a quote.
        it("should parse `map[\"x\"][0]` as $.map['x'][0]", () => {
          expect(parsePath('map["x"][0]')).toEqual([
            { type: 'key', key: 'map' },
            { type: 'key', key: 'x' },
            { type: 'index', index: 0 },
          ])
        })
      })
    })
  })

  describe('an invalid prop', () => {
    // The empty string is not a legal location, so the parser returns before the
    // state machine starts (`if (!path)`) — a different path from a blank string,
    // which does enter the machine.
    describe('an empty prop', () => {
      it('should parse `` as undefined', () => {
        expect(parsePath('')).toBeUndefined()
      })
    })

    // These fail at `expectSegment`, the state that demands the first segment be
    // a name or a '['. The quoted form is the escape hatch for everything the
    // `name` form rejects (design.md §15).
    describe('nothing to start a segment with', () => {
      // A leading separator or blank sits before any segment.
      describe('junk before the first segment', () => {
        it('should parse `.a` as undefined (a `.` cannot start a path)', () => {
          expect(parsePath('.a')).toBeUndefined()
        })

        it('should parse `..` as undefined (a `.` cannot start a path)', () => {
          expect(parsePath('..')).toBeUndefined()
        })

        it('should parse ` name` as undefined (a leading blank is not trimmed)', () => {
          expect(parsePath(' name')).toBeUndefined()
        })

        it('should parse `  ` as undefined (a blank-only prop is not the empty prop)', () => {
          expect(parsePath('  ')).toBeUndefined()
        })
      })

      // A `name` is ASCII-only and never starts with a digit; a quote is a key
      // only *inside* brackets, so a bare quote starts nothing.
      describe('a first segment that is not a name', () => {
        it('should parse `0.name` as undefined (a name never starts with a digit; use `["0"].name`)', () => {
          expect(parsePath('0.name')).toBeUndefined()
        })

        it('should parse `名字` as undefined (the name class is ASCII only)', () => {
          expect(parsePath('名字')).toBeUndefined()
        })

        it("should parse `\"abc\"` as undefined (a quote belongs inside brackets)", () => {
          expect(parsePath('"abc"')).toBeUndefined()
        })
      })
    })

    // These fail at `afterSegment`, the state after a name or bracket that only
    // accepts '[' , '.' or the end of input. A name after a ']' needs a '.'
    // first, as in a JS member chain.
    describe('a bad name terminator', () => {
      it('should parse `a-b` as undefined (a `-` is not a name character)', () => {
        expect(parsePath('a-b')).toBeUndefined()
      })

      it('should parse `name ` as undefined (a trailing blank is not trimmed)', () => {
        expect(parsePath('name ')).toBeUndefined()
      })

      it('should parse `buyers[0]name` as undefined (a name after `]` needs a `.`)', () => {
        expect(parsePath('buyers[0]name')).toBeUndefined()
      })
    })

    // These fail at `afterDot`, where a name is mandatory: a '.' is always
    // followed by a name.
    describe('a bad dot', () => {
      it('should parse `a..b` as undefined (consecutive dots)', () => {
        expect(parsePath('a..b')).toBeUndefined()
      })

      it('should parse `a.` as undefined (a trailing dot)', () => {
        expect(parsePath('a.')).toBeUndefined()
      })

      it('should parse `[0].` as undefined (a trailing dot)', () => {
        expect(parsePath('[0].')).toBeUndefined()
      })

      it('should parse `a.[0]` as undefined (a `.` is always followed by a name)', () => {
        expect(parsePath('a.[0]')).toBeUndefined()
      })

      // A dot numeral is an `afterDot` failure, not a `name` failure — a numeric
      // key must be spelled quoted.
      it('should parse `map.0.name` as undefined (a digit cannot follow a `.`; use `map["0"].name`)', () => {
        expect(parsePath('map.0.name')).toBeUndefined()
      })

      it('should parse `map.5f8a.name` as undefined (a digit cannot follow a `.`; use `map["5f8a"].name`)', () => {
        expect(parsePath('map.5f8a.name')).toBeUndefined()
      })
    })

    // These fail at `inBracket`, which accepts only digits, an opening quote or
    // the closing ']'.
    describe('a bad bracket', () => {
      it('should parse `buyers[abc]` as undefined', () => {
        expect(parsePath('buyers[abc]')).toBeUndefined()
      })

      it('should parse `buyers[` as undefined (unclosed)', () => {
        expect(parsePath('buyers[')).toBeUndefined()
      })

      it('should parse `buyers[]` as undefined (an empty index)', () => {
        expect(parsePath('buyers[]')).toBeUndefined()
      })

      it('should parse `buyers[ ]` as undefined', () => {
        expect(parsePath('buyers[ ]')).toBeUndefined()
      })

      // An index is a canonical decimal: leading zeros make it not an index.
      it('should parse `buyers[01]` as undefined (leading zeros are not canonical)', () => {
        expect(parsePath('buyers[01]')).toBeUndefined()
      })

      it('should parse `buyers[1a]` as undefined', () => {
        expect(parsePath('buyers[1a]')).toBeUndefined()
      })

      it('should parse `buyers[-1]` as undefined', () => {
        expect(parsePath('buyers[-1]')).toBeUndefined()
      })

      it('should parse `[1.2]` as undefined (a `.` is not an index char)', () => {
        expect(parsePath('[1.2]')).toBeUndefined()
      })
    })

    // These fail inside a quoted key: `quotedBody` (nothing closed it) or
    // `quotedEnd` (a ']' did not follow the closing quote).
    describe('a bad quoted key', () => {
      it('should parse `map[\"x` as undefined (unclosed body)', () => {
        expect(parsePath('map["x')).toBeUndefined()
      })

      // A '\' is ordinary, so it does not close the key.
      it('should parse `map[\"x\\` as undefined (a backslash is not an escape)', () => {
        expect(parsePath('map["x\\')).toBeUndefined()
      })

      it('should parse `map[\"x\"` as undefined (unclosed bracket after the quote)', () => {
        expect(parsePath('map["x"')).toBeUndefined()
      })

      it('should parse `map[\"x\"y]` as undefined (a stray char after the closing quote)', () => {
        expect(parsePath('map["x"y]')).toBeUndefined()
      })

      // No escape: a quote inside a double-quoted key still closes it, so the
      // trailing `b"]` is left over and the path fails rather than folding `\"`.
      it('should parse `map[\"a\"b\"]` as undefined (a quote always closes; no escape)', () => {
        expect(parsePath('map["a"b"]')).toBeUndefined()
      })
    })
  })
})
