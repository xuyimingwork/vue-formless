/**
 * Parse `prop` location strings: object keys and `[index]` segments.
 * Examples: `name`, `buyers[0].name`, `[2].title`
 */
export type PathSegment =
  | { type: 'key'; key: string }
  | { type: 'index'; index: number }

export function parsePath(prop: string): PathSegment[] {
  if (!prop) return []
  const segments: PathSegment[] = []
  let i = 0
  while (i < prop.length) {
    if (prop[i] === '.') {
      i++
      continue
    }
    if (prop[i] === '[') {
      const close = prop.indexOf(']', i + 1)
      if (close === -1) {
        throw new Error(`Invalid path "${prop}": unclosed bracket`)
      }
      const raw = prop.slice(i + 1, close)
      const index = Number(raw)
      if (!Number.isInteger(index) || String(index) !== raw || index < 0) {
        throw new Error(`Invalid path "${prop}": index must be a non-negative integer`)
      }
      segments.push({ type: 'index', index })
      i = close + 1
    } else {
      const match = /^[a-zA-Z_$][a-zA-Z0-9_$]*/.exec(prop.slice(i))
      if (!match) {
        throw new Error(`Invalid path "${prop}" at position ${i}`)
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

function readLeaf(parent: unknown, leaf: PathSegment): unknown {
  if (leaf.type === 'key') {
    if (parent == null || typeof parent !== 'object' || Array.isArray(parent)) {
      return undefined
    }
    return (parent as Record<string, unknown>)[leaf.key]
  }
  if (!Array.isArray(parent)) return undefined
  return parent[leaf.index]
}

export function getIn(root: unknown, prop: string): unknown {
  const segments = parsePath(prop)
  if (segments.length === 0) return undefined
  const leaf = segments[segments.length - 1]!
  const parent = getNode(root, segments.slice(0, -1))
  return readLeaf(parent, leaf)
}

function setAt(
  current: unknown,
  segments: PathSegment[],
  depth: number,
  value: unknown,
): unknown {
  const seg = segments[depth]!
  const isLeaf = depth === segments.length - 1

  if (seg.type === 'key') {
    if (Array.isArray(current)) {
      throw new Error(`Cannot set "${seg.key}" on an array node`)
    }
    const base =
      current != null && typeof current === 'object'
        ? (current as Record<string, unknown>)
        : {}
    if (isLeaf) return { ...base, [seg.key]: value }
    return {
      ...base,
      [seg.key]: setAt(base[seg.key], segments, depth + 1, value),
    }
  }

  const arr = Array.isArray(current) ? [...current] : []
  if (isLeaf) {
    arr[seg.index] = value
    return arr
  }
  arr[seg.index] = setAt(arr[seg.index], segments, depth + 1, value)
  return arr
}

/** Immutable write at a full `prop` location (`buyers[0].name`). Arrays are cloned. */
export function setIn(root: unknown, prop: string, value: unknown): unknown {
  const segments = parsePath(prop)
  if (segments.length === 0) {
    throw new Error('Cannot set an empty prop')
  }
  return setAt(root, segments, 0, value)
}

/** Dot-notation path for ElFormItem `prop` (e.g. `buyers.0.name`). */
export function formItemProp(prop: string): string {
  return parsePath(prop)
    .map((seg) => (seg.type === 'key' ? seg.key : String(seg.index)))
    .join('.')
}
