/**
 * Immutable get/set over model paths (ADR-011). Path strings such as
 * `buyers[0].name` are parsed into segments by `./parse-model-path`.
 */
import { parsePath, type PathSegment } from './parse-model-path'

/**
 * Values that can hold a child at a path segment: plain objects and arrays.
 * Primitives and missing nodes are not containers, so reads through them stop
 * and resolve to `undefined`.
 */
function isObjectLike(value: unknown): value is Record<string, unknown> | unknown[] {
  return typeof value === 'object' && value !== null
}

/**
 * Read the value stored on `container` under `segment` (record key or array
 * index) — the per-segment step of `readSegments`, and the descent step `setIn`
 * reuses. A shape mismatch — key over an array, index over an object — reads as
 * `undefined` and stays silent: under the B-track grammar the two spellings are
 * fixed (keys are `name` / `.0` / `["…"]`, arrays are `[n]`), so a mismatch is a
 * caller-side `path` bug, and reads never guess or warn (ADR-011).
 */
function readSegment(container: unknown, segment: PathSegment): unknown {
  // Nothing to descend into: missing nodes and primitives read as `undefined`.
  if (!isObjectLike(container)) return undefined

  // One block per segment type, each pairing its shape guard with its read, so
  // the branches stay symmetric and no type is treated as "the default".
  if (segment.type === 'key') {
    return Array.isArray(container) ? undefined : container[segment.key]
  }

  if (segment.type === 'index') {
    return Array.isArray(container) ? container[segment.index] : undefined
  }

  // Unreachable while `PathSegment` stays a closed union; a future segment type
  // reads as `undefined` instead of falling into whichever branch comes last.
  return undefined
}

/**
 * Left fold over `segments`: one `readSegment` per level, so a missing
 * intermediate node reads as `undefined` instead of throwing. `setIn` is the
 * mirror image — the same walk, folding right while cloning each level.
 */
function readSegments(root: unknown, segments: PathSegment[]): unknown {
  let node: unknown = root
  for (const segment of segments) node = readSegment(node, segment)
  return node
}

/**
 * Immutable read at a full `path` location (`buyers[0].name`). An invalid or
 * empty `path` reads as `undefined`: `parsePath` reports failure with
 * `undefined` instead of throwing, and the caller owns fixing `path` (ADR-011).
 */
export function getIn(root: unknown, path: string): unknown {
  const segments = parsePath(path)
  return segments ? readSegments(root, segments) : undefined
}

/**
 * Immutable write at a full `path` location (`buyers[0].name`). Contract
 * (ADR-011): the write side stays as silent as the read side.
 *
 * - walk `segments` with `readSegment` above; an invalid or empty `path` returns
 *   `root` unchanged (no throw, no warn);
 * - a segment whose shape matches the node merges, keeping siblings — a `key`
 *   over an object, or an `index` over an array (clone the array first);
 * - a segment whose shape mismatches overwrites the node with the shape the
 *   segment addresses rather than throwing: a `key` over an array becomes an
 *   object, an `index` over an object becomes an array, and the overwrite never
 *   warns — a mismatched `path` is a caller-side bug and reads already stay
 *   quiet about it;
 * - never mutate `root`: clone every level on the way to the leaf.
 */
export function setIn(root: unknown, path: string, value: unknown): unknown {
  const segments = parsePath(path)
  return segments ? writeSegments(root, segments, value) : root
}

function writeSegments(root: unknown, segments: PathSegment[], value: unknown): unknown {
  if (!segments.length) return root
  if (segments.length === 1) return writeSegment(root, segments[0], value)
  
  const [segment, ...rest] = segments
  return writeSegment(
    root, 
    segment, 
    writeSegments(readSegment(root, segment), rest, value)
  )
}

function writeSegment(root: unknown, segment: PathSegment, value: unknown): unknown {
  if (segment.type === 'key') {
    const base = isObjectLike(root) && !Array.isArray(root) ? root : {}
    return { ...base, [segment.key]: value }
  }
  if (segment.type === 'index') {
    const arr = Array.isArray(root) ? [...root] : []
    arr[segment.index] = value
    return arr
  }
  return root
}
