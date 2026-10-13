/**
 * Model path parser — object keys, `[index]` array segments and quoted keys.
 *
 * Grammar of a `path` string (e.g. `name`, `buyers[0].name`, `[2].title`,
 * `map["0"].name`, `map["x.y"].title`). It is a subset of a JS member-access
 * chain: a `.` is always followed by a name, and a name never follows a `]`
 * without a `.` first.
 *
 *   path       := segment ('.' name | bracket)*
 *   segment    := name | bracket
 *   bracket    := '[' index ']' | '[' quoted ']'
 *   name       := [a-zA-Z_$][a-zA-Z0-9_$]*  object key (a JS IdentifierName subset)
 *   index      := 0 | [1-9][0-9]*           canonical array index (no leading zeros)
 *   quoted     := '"' [^"]* '"' | "'" [^']* "'"
 *                the body is any char except the delimiting quote; a quote
 *                always closes, there is no escape
 *
 * The quoted form is the escape hatch for any key that is not a plain `name`:
 * spaces, dots, brackets, the empty string (`obj['']` is legal and stays
 * reachable here), and — being the only way to reach one — numeric or otherwise
 * non-identifier keys. It carries any key that holds **at most one** of the two
 * quote characters: pick the other one as the delimiter (`map['say "hi"']`,
 * `map["it's"]`). A key holding *both* quotes has no spelling here — the
 * deliberate cost of not having an escape (design.md §15). Only the *unquoted*
 * `name` form is otherwise restricted, and only because it is sugar.
 *
 * Array items are addressed **only** by bracket numerals (`[0]`); a numeric
 * object key is spelled `["0"]`, so the two spellings never collide and a
 * segment's kind is fixed by syntax alone — `parsePath` never consults the data.
 * Matching that kind against the container's actual shape is the read/write
 * layer's job (`readSegment` / `writeSegment`), where a key over an array or an
 * index over an object is a mismatch.
 *
 * Implemented as a character-driven state machine in the style of a toy HTML
 * tokenizer: every state is a function that consumes one character and returns
 * the next state, and a single `EOF` sentinel is fed after the input runs out.
 * That makes "unterminated bracket" an ordinary `FAILED` transition instead of a
 * special case after the loop. `FAILED` is a plain sentinel the driver folds
 * into `undefined` — parsing never throws, so a bad `path` is a value the caller
 * has to handle, not an exception.
 *
 * The separator gets its own states: a single `betweenSegments` that swallows
 * '.' in a loop also accepts `a..b`, `.a` and `a.`. Splitting it into
 * expectSegment / afterSegment / afterDot makes "one '.' at most, always
 * followed by a name, never leading or trailing" fall out of the transitions
 * instead of needing a lookahead flag.
 *
 *   expectSegment  a segment must start here (the initial state): a name or '['
 *   afterSegment   a name or bracket just ended; '.' or another '[' may follow
 *   afterDot       just consumed the '.'; a name is mandatory
 *   keyName        inside an identifier; its terminator is reconsumed
 *   inBracket      inside '[': digits (index), a quote (key), or ']'
 *   quotedBody     inside a quoted key; the opening quote closes it
 *   quotedEnd      after the closing quote: ']' must follow
 *
 *   expectSegment  --'['--> inBracket           -- name char --> keyName
 *                  -- else --> FAILED            (the path is non-empty here)
 *   keyName        -- ident chars --> keyName
 *                  -- terminator (reconsumed) --> afterSegment
 *   afterSegment   -- '.' --> afterDot          -- '[' --> inBracket
 *                  -- EOF --> clean end         -- else --> FAILED
 *                     (a name after ']' lands here and needs the '.')
 *   afterDot       -- name char --> keyName      -- EOF --> FAILED (trailing '.')
 *                  -- '.' --> FAILED (consecutive '.')
 *                  -- '[' --> FAILED ('.' is always followed by a name)
 *   inBracket      -- digits --> inBracket      -- quote --> quotedBody
 *                  -- ']' + canonical index --> afterSegment
 *                  -- EOF --> FAILED (unclosed bracket)
 *   quotedBody     -- closing quote --> quotedEnd
 *                  -- EOF --> FAILED (unclosed quoted key)
 *                  -- any other char (incl. '\') --> quotedBody
 *   quotedEnd      -- ']' --> afterSegment      -- EOF --> FAILED (unclosed bracket)
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

const IDENT_START = /[a-zA-Z_$]/
const IDENT_PART = /[a-zA-Z0-9_$]/
const DIGIT = /[0-9]/

/**
 * Split a `path` into segments. A syntactically invalid path — and the empty
 * string, which is not a legal location — returns `undefined` instead of
 * throwing or warning: the caller knows which `path` it passed, so surfacing a
 * failure is its job. A successful parse always yields >= 1 segment.
 * @param path the path string to parse
 */
export function parsePath(path: string): PathSegment[] | undefined {
  if (!path) return undefined

  const segments: PathSegment[] = []
  let buffer = '' // identifier / index / quoted key currently being accumulated
  let quote = '' // the quote char opening the current quoted key
  let cursor = 0 // index of the character the current state call consumes

  /**
   * The start of the path: a name or a '[' bracket. This is the initial state
   * only — after a '.' a name is mandatory, so `afterDot` goes straight to
   * `keyName` rather than routing through here (which would accept `.[0]`).
   * The path is non-empty here (`!path` returned early), so a real char always
   * arrives before `EOF`.
   */
  function expectSegment(c: Char): Transition {
    if (c === '[') return inBracket
    if (typeof c === 'string' && IDENT_START.test(c)) {
      buffer = c
      return keyName
    }
    return FAILED // expected a name or "[…]"
  }

  /**
   * A name or a bracket just ended. A '[' may follow directly (bracket chaining,
   * `a[0][1]`) and a single '.' opens the next name; `EOF` ends cleanly. A name
   * here — a bare `]name` with no '.' — is rejected, so a dot between a bracket
   * and a name is mandatory (as in a JS member chain).
   */
  function afterSegment(c: Char): Transition {
    if (c === '[') return inBracket
    if (c === '.') return afterDot
    if (c === EOF) return undefined // clean end of input
    return FAILED // a name after ']' needs a '.'; anything else is illegal
  }

  /**
   * Right after a '.': a name is mandatory. A second '.' is the consecutive-dot
   * error, `EOF` the trailing-dot one, and '[' is rejected because a '.' is
   * always followed by a name (`a.[0]` is illegal) — which keeps separators to a
   * single dot before a name.
   */
  function afterDot(c: Char): Transition {
    if (typeof c === 'string' && IDENT_START.test(c)) {
      buffer = c
      return keyName
    }
    return FAILED // trailing ".", consecutive ".", or a '[' after "."
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
   * Inside brackets: digits accumulate an *array index*, a quote opens a quoted
   * *object key*, anything else is a syntax error.
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
    // An index is a canonical decimal: empty ("[]") or leading zeros ("[01]")
    // is not one. Digits are the only chars accumulated, so it is never negative.
    if (buffer === '' || String(index) !== buffer) return FAILED
    segments.push({ type: 'index', index })
    buffer = ''
    return afterSegment
  }

  /**
   * Inside a quoted key body: keep chars until the opening quote comes back.
   * There is no escape, so only that quote closes the key — a `\` is an ordinary
   * char, and the *other* quote is ordinary too (that is the escape hatch for a
   * key holding one kind of quote).
   */
  function quotedBody(c: Char): Transition {
    if (c === EOF) return FAILED // unclosed quoted key
    if (c === quote) return quotedEnd
    buffer += c
    return quotedBody
  }

  /** After the closing quote: the bracket must close immediately. */
  function quotedEnd(c: Char): Transition {
    if (c === EOF) return FAILED // unclosed bracket
    if (c !== ']') return FAILED // expected "]" after the quoted key
    // A quoted key carries any string, including '' — the empty-string key is
    // legal in JS (`obj['']`) and stays reachable.
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
