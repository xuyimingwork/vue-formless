/**
 * Immutable get/set over model paths (design.md §15). Path strings such as
 * `buyers[0].name` are parsed into segments by `./path-parse`.
 *
 * Two halves:
 * - the **pure core** `getIn(root, path)` / `setIn(root, path, value)`: root is
 *   passed on every call, nothing is retained between calls;
 * - the **bound façade** `bindPathAccess(source)`: the same pair with the source
 *   (a writable `computed` / `ref`) captured once, so callers read and write a
 *   fixed location by path only — the FormView layer's channel (design.md §14.2).
 */
import { nextTick } from 'vue'
import { parsePath, type PathSegment } from './path-parse'

/**
 * Values that can hold a child at a path segment: plain objects and arrays.
 * Primitives and missing nodes are not containers, so reads through them stop
 * and resolve to `undefined`.
 */
function isObjectLike(value: unknown): value is Record<string, unknown> | unknown[] {
  return typeof value === 'object' && value !== null
}

/**
 * Read `key` off `container` **only when it is an own property**. The write side
 * always sets an own key (`{ ...base, [key]: value }`), so this keeps reads the
 * inverse of writes: a segment like `constructor` / `toString` / `__proto__` is
 * grammar-legal but not data, and reading it through the prototype chain would
 * hand back a value `setIn` never wrote (design.md §15). `Object.prototype.hasOwnProperty`
 * is called via `call` because `hasOwnProperty` is itself a reachable key.
 */
const hasOwn = Object.prototype.hasOwnProperty

function readOwnProperty(container: Record<string, unknown>, key: string): unknown {
  return hasOwn.call(container, key) ? container[key] : undefined
}

/**
 * Read the value stored on `container` under `segment` (record key or array
 * index) — the per-segment step of `readSegments`, and the descent step `setIn`
 * reuses. A shape mismatch — key over an array, index over an object — reads as
 * `undefined` and stays silent: under the B-track grammar the two spellings are
 * fixed (keys are `name` / `.0` / `["…"]`, arrays are `[n]`), so a mismatch is a
 * caller-side `path` bug, and reads never guess or warn (design.md §15). A key reads
 * own properties only (`readOwnProperty`), so the prototype chain is not data.
 */
function readSegment(container: unknown, segment: PathSegment): unknown {
  // Nothing to descend into: missing nodes and primitives read as `undefined`.
  if (!isObjectLike(container)) return undefined

  // One block per segment type, each pairing its shape guard with its read, so
  // the branches stay symmetric and no type is treated as "the default".
  if (segment.type === 'key') {
    return Array.isArray(container) ? undefined : readOwnProperty(container, segment.key)
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
 * `undefined` instead of throwing, and the caller owns fixing `path` (design.md §15).
 */
export function getIn(root: unknown, path: string): unknown {
  const segments = parsePath(path)
  return segments ? readSegments(root, segments) : undefined
}

/**
 * Immutable write at a full `path` location (`buyers[0].name`). Contract
 * (design.md §15): the write side stays as silent as the read side.
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

/**
 * Anything a bound access can write a whole value back into: a writable
 * `computed` (the FormView v-model port) or a plain `ref`. It only needs `value`
 * to be get/set; it carries no notion of "model".
 */
export interface WritableSource {
  value: unknown
}

/**
 * The pure pair below with the source root bound once: reads and writes stay
 * relative to that root, so callers pass only `path` (and `value`).
 */
export interface PathAccess {
  getIn(path: string): unknown
  setIn(path: string, value: unknown): void
}

/** One same-tick path write held until the next flush. */
interface PendingWrite {
  path: string
  value: unknown
}

/**
 * Bind `getIn` / `setIn` to one writable `source`, returning this layer's own
 * path access (design.md §14.2). Generic — no notion of FormView layers or the
 * parent chain; owning layers call it, inherited layers forward to an ancestor.
 *
 * `getIn` reads the source as it is right now. `setIn` never mutates the source
 * *object*: same-tick writes merge into one write on nextTick, cloning from the
 * *latest* source value (`setIn` above; nested paths clone arrays on write), and
 * the single write (`source.value = next`) is the layer's `update:modelValue`:
 * a writable computed whose setter reports the rebuilt whole value.
 */
export function bindPathAccess(source: WritableSource): PathAccess {
  let pending: PendingWrite[] | null = null

  function getInBound(path: string): unknown {
    return getIn(source.value, path)
  }

  function setInBound(path: string, value: unknown): void {
    if (!pending) {
      pending = []
      nextTick(() => {
        // Detach the batch before flushing: a throwing read / write must not
        // wedge `setIn`, since `pending` is already null and the next write
        // schedules a fresh flush. It also keeps a re-entrant write (fired
        // synchronously from the write) out of this batch instead of appending
        // it to an array this flush is about to drop.
        const batch = pending
        pending = null

        // Invariant: non-empty while a flush is scheduled; the guard just
        // keeps a (hypothetical) empty batch from writing an unchanged source.
        if (!batch?.length) return

        let next = source.value
        for (const item of batch) {
          next = setIn(next, item.path, item.value)
        }
        source.value = next
      })
    }
    pending.push({ path, value })
  }

  return { getIn: getInBound, setIn: setInBound }
}
