/**
 * Immutable get/set over model paths (ADR-011). Path strings such as
 * `buyers[0].name` are parsed into segments by `./parse-model-path`.
 */
import { parsePath, type PathSegment } from './parse-model-path'

/** Walk `subPath` down from `root` and return the node it lands on. */
function descend(root: unknown, subPath: PathSegment[]): unknown {
  let node: unknown = root
  for (const seg of subPath) {
    if (seg.type === 'key') {
      node = (node as Record<string, unknown>)[seg.key]
    } else {
      node = (node as unknown[])[seg.index]
    }
  }
  return node
}

/** Shape-mismatch reads already warned about, so one mistake doesn't spam. */
const warnedReads = new Set<string>()

function warnOnce(id: string, message: string): void {
  if (warnedReads.has(id)) return
  warnedReads.add(id)
  console.warn(`[vue-formless] ${message}`)
}

/**
 * Read the value stored on `container` under `segment` (record key or array
 * index). A shape mismatch — key over an array, index over an object — reads
 * as `undefined` and warns once per path: under the B-track grammar the two
 * spellings are fixed (keys are `name` / `.0` / `["…"]`, arrays are `[n]`),
 * so a mismatch is usually a spelling mix-up worth surfacing.
 */
function readChild(container: unknown, segment: PathSegment, path: string): unknown {
  if (segment.type === 'key') {
    if (container == null || typeof container !== 'object') return undefined
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
    return (container as Record<string, unknown>)[segment.key]
  }
  if (container == null) return undefined
  if (!Array.isArray(container)) {
    if (typeof container === 'object' && Object.keys(container).length > 0) {
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

export function getIn(root: unknown, path: string): unknown {
  const segments = parsePath(path)
  if (segments.length === 0) return undefined
  const leaf = segments[segments.length - 1]!
  const parent = descend(root, segments.slice(0, -1))
  return readChild(parent, leaf, path)
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
