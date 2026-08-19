/**
 * Parse navigation path strings (ADR-011): scalar string with `[index]` segments.
 * Examples: `buyers[0]`, `[2]`, `buyer`
 */
export type PathSegment =
  | { type: 'key'; key: string }
  | { type: 'index'; index: number }

export function parsePath(path: string): PathSegment[] {
  if (!path) return []
  const segments: PathSegment[] = []
  let i = 0
  while (i < path.length) {
    if (path[i] === '.') {
      i++
      continue
    }
    if (path[i] === '[') {
      const close = path.indexOf(']', i + 1)
      if (close === -1) {
        throw new Error(`Invalid path "${path}": unclosed bracket`)
      }
      const raw = path.slice(i + 1, close)
      const index = Number(raw)
      if (!Number.isInteger(index) || String(index) !== raw || index < 0) {
        throw new Error(`Invalid path "${path}": index must be a non-negative integer`)
      }
      segments.push({ type: 'index', index })
      i = close + 1
    } else {
      const match = /^[a-zA-Z_$][a-zA-Z0-9_$]*/.exec(path.slice(i))
      if (!match) {
        throw new Error(`Invalid path "${path}" at position ${i}`)
      }
      segments.push({ type: 'key', key: match[0] })
      i += match[0].length
    }
  }
  return segments
}

function getNode(root: unknown, segments: PathSegment[]): unknown {
  let node = root
  for (const seg of segments) {
    if (seg.type === 'key') {
      node = (node as Record<string, unknown>)[seg.key]
    } else {
      node = (node as unknown[])[seg.index]
    }
  }
  return node
}

export function getIn(root: unknown, path: string | undefined, prop: string): unknown {
  const node = path ? getNode(root, parsePath(path)) : root
  if (node == null || typeof node !== 'object' || Array.isArray(node)) {
    return undefined
  }
  return (node as Record<string, unknown>)[prop]
}

function setAt(
  current: unknown,
  segments: PathSegment[],
  depth: number,
  prop: string,
  value: unknown,
): unknown {
  if (depth === segments.length) {
    if (Array.isArray(current)) {
      throw new Error(`Cannot set prop "${prop}" on an array node`)
    }
    const base =
      current != null && typeof current === 'object' && !Array.isArray(current)
        ? (current as Record<string, unknown>)
        : {}
    return { ...base, [prop]: value }
  }

  const seg = segments[depth]!
  if (seg.type === 'key') {
    const obj =
      current != null && typeof current === 'object' && !Array.isArray(current)
        ? (current as Record<string, unknown>)
        : {}
    return {
      ...obj,
      [seg.key]: setAt(obj[seg.key], segments, depth + 1, prop, value),
    }
  }

  const arr = Array.isArray(current) ? [...current] : []
  arr[seg.index] = setAt(arr[seg.index], segments, depth + 1, prop, value)
  return arr
}

/** Immutable write: `path` navigates to a node, `prop` is the leaf key on that node. */
export function setIn(
  root: unknown,
  path: string | undefined,
  prop: string,
  value: unknown,
): unknown {
  const segments = path ? parsePath(path) : []
  return setAt(root, segments, 0, prop, value)
}

/** Dot-notation path for ElFormItem `prop` (e.g. `buyers.0.name`). */
export function formItemProp(path: string | undefined, prop: string): string {
  const parts: string[] = []
  if (path) {
    for (const seg of parsePath(path)) {
      parts.push(seg.type === 'key' ? seg.key : String(seg.index))
    }
  }
  parts.push(prop)
  return parts.join('.')
}
