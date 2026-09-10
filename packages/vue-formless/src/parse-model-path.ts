/**
 * Model path parser — object keys, `[index]` array segments and quoted keys.
 *
 * Grammar of a `path` string (e.g. `name`, `buyers[0].name`, `[2].title`,
 * `map.0.name`, `map["x.y"].title`):
 *
 *   path       := segment ('.'? segment)*   dots are optional separators
 *   segment    := name | '[' index ']' | '[' quoted ']'
 *   name       := [a-zA-Z_$0-9][a-zA-Z0-9_$]*   object key (digits allowed)
 *   index      := [0-9]+                         array index
 *   quoted     := '"' key chars '"' | "'" key chars "'"
 *                key chars: any char, except the closing quote and unescaped
 *                backslash; '\' escapes the next character (ADR-011)
 *
 * Array items are addressed **only** by bracket numerals (`[0]`); a dot-form
 * numeral (`map.0.name`) or a quoted segment (`map["0"].name`) is an *object*
 * key, so numeric-keyed maps stay reachable. Object keys never mean array
 * indexes, so a numeric segment is unambiguous without runtime shape checks.
 *
 * Implemented as a character-driven state machine in the style of a toy
 * HTML tokenizer: every state is a function that consumes one character
 * and returns the next state, and a single `EOF` sentinel is fed after the
 * input runs out. That makes "unterminated bracket" an ordinary transition
 * error instead of a special case after the loop:
 *
 *   betweenSegments --'['--> inBracket --quote--> quotedBody --quote--> quotedEnd --']'--> betweenSegments
 *        ^   |                \--digits--> ']' + valid index ---------------------/
 *        |    \-- name chars (keyName), reconsume the terminator -----------------/
 */
export type PathSegment =
  | { type: 'key'; key: string }
  | { type: 'index'; index: number }

/** Sentinel fed to the machine once after the last real character. */
const EOF = Symbol('EOF')

type Char = string | typeof EOF
type State = (c: Char) => State | undefined

const IDENT_START = /[a-zA-Z_$0-9]/
const IDENT_PART = /[a-zA-Z0-9_$]/
const DIGIT = /[0-9]/

export function parsePath(path: string): PathSegment[] {
  if (!path) return []

  const segments: PathSegment[] = []
  let buffer = '' // identifier / index / quoted key currently being accumulated
  let quote = '' // the quote char opening the current quoted key
  let cursor = 0 // index of the character the current state call consumes

  /** Between segments: consume '.', '[' or the first char of an identifier. */
  function betweenSegments(c: Char): State | undefined {
    if (c === '.') return betweenSegments // optional separator: skip and stay
    if (c === '[') return inBracket
    if (c === EOF) return undefined // clean end of input
    if (typeof c === 'string' && IDENT_START.test(c)) {
      buffer = c
      return keyName
    }
    throw new Error(`Invalid path "${path}" at position ${cursor}`)
  }

  /** Inside an identifier; on the first non-identifier char, reconsume it. */
  function keyName(c: Char): State | undefined {
    if (typeof c === 'string' && IDENT_PART.test(c)) {
      buffer += c
      return keyName
    }
    segments.push({ type: 'key', key: buffer })
    buffer = ''
    return betweenSegments(c) // reconsume the terminating character
  }

  /**
   * Inside brackets: digits accumulate an *array index*, a quote opens a
   * quoted *object key*, anything else is an error.
   */
  function inBracket(c: Char): State | undefined {
    if (c === EOF) throw new Error(`Invalid path "${path}": unclosed bracket`)
    if (typeof c === 'string' && (c === '"' || c === "'")) {
      quote = c
      buffer = ''
      return quotedBody
    }
    if (typeof c === 'string' && DIGIT.test(c)) {
      buffer += c
      return inBracket
    }
    if (c !== ']') {
      throw new Error(
        `Invalid path "${path}": a bracket must be an array index (non-negative integer) or a quoted object key`,
      )
    }
    const index = Number(buffer)
    if (buffer === '' || String(index) !== buffer || index < 0) {
      throw new Error(
        `Invalid path "${path}": array index must be a non-negative integer`,
      )
    }
    segments.push({ type: 'index', index })
    buffer = ''
    return betweenSegments
  }

  /** Inside a quoted key body: keep chars until the matching quote. */
  function quotedBody(c: Char): State | undefined {
    if (c === EOF) throw new Error(`Invalid path "${path}": unclosed quoted key`)
    if (c === '\\') return quotedEscape
    if (c === quote) return quotedEnd
    buffer += c
    return quotedBody
  }

  /** After a backslash inside a quoted key: take the next char literally. */
  function quotedEscape(c: Char): State | undefined {
    if (c === EOF) throw new Error(`Invalid path "${path}": unclosed quoted key`)
    buffer += c
    return quotedBody
  }

  /** After the closing quote: the bracket must close immediately. */
  function quotedEnd(c: Char): State | undefined {
    if (c === EOF) throw new Error(`Invalid path "${path}": unclosed bracket`)
    if (c !== ']') {
      throw new Error(`Invalid path "${path}": expected "]" after the quoted key`)
    }
    if (buffer === '') {
      throw new Error(`Invalid path "${path}": quoted key cannot be empty`)
    }
    segments.push({ type: 'key', key: buffer })
    buffer = ''
    return betweenSegments
  }

  let state: State = betweenSegments
  for (; cursor < path.length; cursor++) {
    // Real characters never terminate the machine — only `EOF` does — so the
    // transition always yields the next state.
    state = state(path[cursor]!)!
  }
  state(EOF) // lets inBracket report 'unclosed bracket'; result unused

  return segments
}
