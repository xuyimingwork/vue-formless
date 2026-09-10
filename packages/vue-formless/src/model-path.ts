/**
 * Immutable get/set over model paths (ADR-011). Path strings such as
 * `buyers[0].name` are parsed into segments by `./parse-model-path`.
 */
import { parsePath, type PathSegment } from './parse-model-path'

/** Shape-mismatch reads already warned about, so one mistake doesn't spam. */
const warnedReads = new Set<string>()

function warnOnce(id: string, message: string): void {
  if (warnedReads.has(id)) return
  warnedReads.add(id)
  console.warn(`[vue-formless] ${message}`)
}

/**
 * Values that can hold a child at a path segment: plain objects and arrays.
 * Primitives and missing nodes are not containers, so reads through them stop
 * and resolve to `undefined`.
 */
function isContainer(value: unknown): value is Record<string, unknown> | unknown[] {
  return value != null && typeof value === 'object'
}

/**
 * Read the value stored on `container` under `segment` (record key or array
 * index). A shape mismatch — key over an array, index over an object — reads
 * as `undefined` and warns once per path: under the B-track grammar the two
 * spellings are fixed (keys are `name` / `.0` / `["…"]`, arrays are `[n]`),
 * so a mismatch is usually a spelling mix-up worth surfacing.
 */
function readChild(container: unknown, segment: PathSegment, path: string): unknown {
  // Nothing to descend into: missing nodes and primitives read as `undefined`.
  if (!isContainer(container)) return undefined

  // One block per segment type, each pairing its shape guard with its read, so
  // the branches stay symmetric and no type is treated as "the default".
  if (segment.type === 'key') {
    if (Array.isArray(container)) {
      if (container.length > 0) {
        warnOnce(
          `key-on-array:${path}`,
          `reading object key "${segment.key}" from an array — object keys never address array items; ` +
            `did you mean a "[index]" segment? (path "${path}")`,
        )
      }
      return undefined
    }
    return container[segment.key]
  }

  if (segment.type === 'index') {
    if (!Array.isArray(container)) {
      if (Object.keys(container).length > 0) {
        warnOnce(
          `index-on-object:${path}`,
          `reading array index "[${segment.index}]" from an object — bracket indexes address arrays only; ` +
            `to read an object key write ".${segment.index}" or '["${segment.index}"]'. (path "${path}")`,
        )
      }
      return undefined
    }
    return container[segment.index]
  }

  // Unreachable while `PathSegment` stays a closed union; it exists so a future
  // segment type reads as `undefined` with a trace instead of falling into
  // whichever branch happens to come last.
  warnOnce(
    `unknown-segment-type:${path}`,
    `unknown path segment type — ignoring it (path "${path}")`,
  )
  return undefined
}

/**
 * Immutable read at a full `path` location (`buyers[0].name`). Every segment
 * goes through `readChild`, so a missing intermediate node reads as
 * `undefined` instead of throwing, and shape checks apply at every depth.
 */
export function getIn(root: unknown, path: string): unknown {
  const segments = parsePath(path)
  if (segments.length === 0) return undefined
  let node: unknown = root
  for (const segment of segments) {
    node = readChild(node, segment, path)
  }
  return node
}

/**
 * Recursive core of `setIn`: clone `node` along `segments` down to `depth`
 * and return the new subtree, leaving the input untouched.
 */
function setInRec(
  node: unknown,
  segments: PathSegment[],
  depth: number,
  value: unknown,
): unknown {
  const seg = segments[depth]!
  const isLeaf = depth === segments.length - 1

  if (seg.type === 'key') {
    if (Array.isArray(node)) {
      throw new Error(`Cannot set "${seg.key}" on an array node`)
    }
    const record: Record<string, unknown> =
      node != null && typeof node === 'object' ? (node as Record<string, unknown>) : {}
    if (isLeaf) return { ...record, [seg.key]: value }
    return {
      ...record,
      [seg.key]: setInRec(record[seg.key], segments, depth + 1, value),
    }
  }

  // Bracket indexes address arrays only. Landing one on a non-empty object
  // would silently replace the object with an array, dropping its keys — a
  // likely `.0` / `["0"]` vs `[0]` mix-up, so refuse loudly. Empty objects
  // and missing nodes still grow into arrays (ADR-011 tolerant writes).
  if (
    node != null &&
    typeof node === 'object' &&
    !Array.isArray(node) &&
    Object.keys(node).length > 0
  ) {
    throw new Error(
      `Cannot set "[${seg.index}]" on an object node — bracket indexes address arrays only; ` +
        `to write an object key use ".${seg.index}" or '["${seg.index}"]'`,
    )
  }
  const arr = Array.isArray(node) ? [...node] : []
  if (isLeaf) {
    arr[seg.index] = value
    return arr
  }
  arr[seg.index] = setInRec(arr[seg.index], segments, depth + 1, value)
  return arr
}

/** Immutable write at a full `path` location (`buyers[0].name`). Arrays are cloned. */
export function setIn(root: unknown, path: string, value: unknown): unknown {
  const segments = parsePath(path)
  if (segments.length === 0) {
    throw new Error('Cannot set an empty path')
  }
  return setInRec(root, segments, 0, value)
}
