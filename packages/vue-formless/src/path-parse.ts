/**
 * Model path parser — object keys, `[index]` array segments and quoted keys.
 *
 * Grammar of a `path` string (e.g. `name`, `buyers[0].name`, `[2].title`,
 * `map.0.name`, `map["x.y"].title`):
 *
 *   path       := segment ('.'? segment)*   one optional '.' between segments;
 *                                            a leading '.', a trailing '.' and
 *                                            '..' are all rejected
 *   segment    := name | '[' index ']' | '[' quoted ']'
 *   name       := [a-zA-Z_$0-9][a-zA-Z0-9_$]*   object key (digits allowed)
 *   index      := [0-9]+                         array index
 *   quoted     := '"' keychar* '"' | "'" keychar* "'"
 *                keychar: any char, except the closing quote and unescaped
 *                backslash; '\' escapes the next character (ADR-011)
 *
 * The quoted form is the **total** escape hatch: it carries any string key a
 * JS object can hold — spaces, dots, brackets, and the empty string (`obj['']`
 * is legal and stays reachable here). Only the *unquoted* `name` form is
 * restricted, and only because it is sugar, not because the key is illegal.
 *
 * Array items are addressed **only** by bracket numerals (`[0]`); a dot-form
 * numeral (`map.0.name`) or a quoted segment (`map["0"].name`) is an *object*
 * key, so numeric-keyed maps stay reachable. Object keys never mean array
 * indexes, so a numeric segment is unambiguous without runtime shape checks.
 *
 * Implemented as a character-driven state machine in the style of a toy
 * HTML tokenizer: every state is a function that consumes one character and
 * returns the next state, and a single `EOF` sentinel is fed after the input
 * runs out. That makes "unterminated bracket" an ordinary `FAILED` transition
 * instead of a special case after the loop. `FAILED` is a plain sentinel the
 * driver folds into `undefined` — parsing never throws, so a bad `path` is a
 * value the caller has to handle, not an exception (ADR-011).
 *
 * The separator gets its own state (`afterDot`): a single `betweenSegments`
 * that swallows '.' in a loop also accepts `a..b`, `.a` and `a.`, none of
 * which the grammar allows. Splitting it into expectSegment / afterSegment /
 * afterDot makes "at most one dot, never leading or trailing" fall out of the
 * transitions instead of needing a lookahead flag.
 *
 *   expectSegment  a segment must start here — path start, or right after '.'
 *   afterSegment   a segment just ended; one optional '.' may follow
 *   afterDot       just consumed the '.'; a segment is mandatory
 *   keyName        inside an identifier; its terminator is reconsumed
 *   inBracket      inside '[': digits (index), a quote (key), or ']'
 *   quotedBody     inside a quoted key; '\' → quotedEscape
 *   quotedEscape   take the next char literally, then back to quotedBody
 *   quotedEnd      after the closing quote: ']' must follow
 *
 *   expectSegment  --'['--> inBracket           -- name chars --> keyName
 *                  -- EOF --> clean end         -- else --> FAILED
 *   keyName        -- ident chars --> keyName
 *                  -- terminator (reconsumed) --> afterSegment
 *   inBracket      -- digits --> inBracket      -- quote --> quotedBody
 *                  -- ']' + valid index --> afterSegment
 *                  -- EOF --> FAILED (unclosed bracket)
 *   quotedBody     -- '\' --> quotedEscape      -- closing quote --> quotedEnd
 *                  -- EOF --> FAILED (unclosed quoted key)
 *   quotedEscape   -- any char (literal) --> quotedBody
 *   quotedEnd      -- ']' --> afterSegment      -- EOF --> FAILED (unclosed bracket)
 *   afterSegment   -- '.' --> afterDot          -- else --> expectSegment
 *   afterDot       -- '[' / name chars --> inBracket / keyName
 *                  -- EOF --> FAILED (trailing '.')
 *                  -- '.' --> FAILED (consecutive '.')
 */
export type PathSegment =
  | { type: 'key'; key: string }
  | { type: 'index'; index: number }

/** Sentinel fed to the machine once after the last real character. */
const EOF = Symbol('EOF')

/** A syntax error as a value: the driver folds it into `undefined`, never a throw. */
const FAILED = Symbol('failed')

type Char = string | typeof EOF
/** What a state returns: the next state, `FAILED`, or a clean end (`undefined`). */
type Transition = State | typeof FAILED | undefined
type State = (c: Char) => Transition

const IDENT_START = /[a-zA-Z_$0-9]/
const IDENT_PART = /[a-zA-Z0-9_$]/
const DIGIT = /[0-9]/

/**
 * Split a `path` into segments. A syntactically invalid path — and the empty
 * string, which is not a legal location — returns `undefined` instead of
 * throwing or warning: the caller knows which `path` it passed, so surfacing a
 * failure is its job (ADR-011). A successful parse always yields >= 1 segment.
 */
export function parsePath(path: string): PathSegment[] | undefined {
  if (!path) return undefined

  const segments: PathSegment[] = []
  let buffer = '' // identifier / index / quoted key currently being accumulated
  let quote = '' // the quote char opening the current quoted key
  let cursor = 0 // index of the character the current state call consumes

  /**
   * A segment must start here: at the beginning of the path or right after a
   * '.'. `EOF` is the clean end of input (a non-empty path's last segment
   * always ends by landing here). This is also the initial state, so a leading
   * '.' is rejected.
   */
  function expectSegment(c: Char): Transition {
    if (c === '[') return inBracket
    if (c === EOF) return undefined // clean end of input
    if (typeof c === 'string' && IDENT_START.test(c)) {
      buffer = c
      return keyName
    }
    return FAILED // expected an identifier, "[index]" or a quoted key
  }

  /**
   * A segment just ended: at most one optional '.' may separate the next one.
   * Everything else — '[' , an identifier start or `EOF` — is handed back to
   * `expectSegment`, so those behave identically in both positions.
   */
  function afterSegment(c: Char): Transition {
    if (c === '.') return afterDot
    return expectSegment(c)
  }

  /**
   * Right after a '.': a segment is mandatory. A trailing '.' ends on `EOF`
   * and `a..b` surfaces as a second '.' here, which is what keeps separators
   * to a single dot.
   */
  function afterDot(c: Char): Transition {
    if (c === EOF) return FAILED // trailing "."
    if (c === '.') return FAILED // consecutive "."
    return expectSegment(c)
  }

  /** Inside an identifier; on the first non-identifier char, reconsume it. */
  function keyName(c: Char): Transition {
    if (typeof c === 'string' && IDENT_PART.test(c)) {
      buffer += c
      return keyName
    }
    segments.push({ type: 'key', key: buffer })
    buffer = ''
    return afterSegment(c) // reconsume the terminating character
  }

  /**
   * Inside brackets: digits accumulate an *array index*, a quote opens a
   * quoted *object key*, anything else is a syntax error.
   */
  function inBracket(c: Char): Transition {
    if (c === EOF) return FAILED // unclosed bracket
    if (typeof c === 'string' && (c === '"' || c === "'")) {
      quote = c
      buffer = ''
      return quotedBody
    }
    if (typeof c === 'string' && DIGIT.test(c)) {
      buffer += c
      return inBracket
    }
    if (c !== ']') return FAILED // neither an array index nor a quoted key
    const index = Number(buffer)
    if (buffer === '' || String(index) !== buffer || index < 0) return FAILED // not an index
    segments.push({ type: 'index', index })
    buffer = ''
    return afterSegment
  }

  /** Inside a quoted key body: keep chars until the matching quote. */
  function quotedBody(c: Char): Transition {
    if (c === EOF) return FAILED // unclosed quoted key
    if (c === '\\') return quotedEscape
    if (c === quote) return quotedEnd
    buffer += c
    return quotedBody
  }

  /** After a backslash inside a quoted key: take the next char literally. */
  function quotedEscape(c: Char): Transition {
    if (c === EOF) return FAILED // unclosed quoted key
    buffer += c
    return quotedBody
  }

  /** After the closing quote: the bracket must close immediately. */
  function quotedEnd(c: Char): Transition {
    if (c === EOF) return FAILED // unclosed bracket
    if (c !== ']') return FAILED // expected "]" after the quoted key
    // A quoted key carries any string, including '' — the empty-string key is
    // legal in JS (`obj['']`) and stays reachable (ADR-011).
    segments.push({ type: 'key', key: buffer })
    buffer = ''
    return afterSegment
  }

  let state: State = expectSegment
  for (; cursor < path.length; cursor++) {
    // Real characters never terminate the machine — only `EOF` does — so a real
    // transition always yields the next state, or `FAILED` on a syntax error.
    const next = state(path[cursor]!)
    if (next === FAILED) return undefined
    state = next!
  }
  if (state(EOF) === FAILED) return undefined // lets inBracket report an unclosed bracket

  return segments
}
