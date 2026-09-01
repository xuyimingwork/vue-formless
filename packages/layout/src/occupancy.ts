import { ref } from 'vue'
import {
  resolveColPlace,
  resolveColSpan,
  takePlaceBlanks,
  type ColPlace,
  type ColSpanSpec,
} from './density'

export interface CellRecord {
  id: string
  readonly span: ColSpanSpec | undefined
  readonly place: ColPlace | undefined
}

/** Occupancy order: registry until the row is live, then Row's element children. */
export function createOccupancy(getRow: () => Element | null) {
  let seq = 0
  let live = false
  const cells = new Map<string, CellRecord>()
  const elToId = new WeakMap<Element, string>()
  const order = ref('')

  function apply(next: string): void {
    if (next !== order.value) order.value = next
  }

  function registryOrder(): string {
    return [...cells.keys()].join(',')
  }

  function add(cell: CellRecord): void {
    cells.set(cell.id, cell)
    if (!live) apply(registryOrder())
  }

  function remove(id: string, el: Element | null): void {
    if (el) elToId.delete(el)
    cells.delete(id)
    if (!live) {
      apply(registryOrder())
      return
    }
    apply(
      order.value
        .split(',')
        .filter((item) => item && item !== id)
        .join(','),
    )
  }

  function bindEl(id: string, raw: unknown, prev: Element | null): Element | null {
    if (prev) elToId.delete(prev)
    const el = hostEl(raw)
    if (el) elToId.set(el, id)
    return el
  }

  function entries(): CellRecord[] {
    const key = order.value
    if (!key) return []
    const out: CellRecord[] = []
    for (const id of key.split(',')) {
      const cell = cells.get(id)
      if (cell) out.push(cell)
    }
    return out
  }

  function pull(): void {
    const root = getRow()
    if (!root) return
    const ids: string[] = []
    for (let i = 0; i < root.children.length; i++) {
      const id = elToId.get(root.children[i]!)
      if (id) ids.push(id)
    }
    const next = ids.join(',')
    if (!next && cells.size > 0) return
    apply(next)
  }

  function goLive(): void {
    live = true
    pull()
  }

  return {
    nextId: (): string => String(++seq),
    add,
    remove,
    bindEl,
    entries,
    pull,
    goLive,
    isLive: (): boolean => live,
  }
}

export function blanksBefore(cells: CellRecord[], cell: CellRecord, column: number): number[] {
  const used = { n: 0 }
  for (const item of cells) {
    const n = resolveColSpan(item.span, column)
    const blanks = takePlaceBlanks(used, n, resolveColPlace(item.place))
    if (item === cell) return blanks
    used.n += n
  }
  return []
}

export function hostEl(source: unknown): Element | null {
  if (source == null || typeof source !== 'object') return null
  if (typeof Element !== 'undefined' && source instanceof Element) return source
  const inst = source as { vnode?: { el?: unknown }; subTree?: { el?: unknown; component?: { vnode?: { el?: unknown } } }; $el?: unknown }
  return (
    firstEl(inst.vnode?.el) ??
    firstEl(inst.subTree?.el) ??
    firstEl(inst.subTree?.component?.vnode?.el) ??
    firstEl(inst.$el)
  )
}

function firstEl(node: unknown): Element | null {
  if (typeof Element !== 'undefined' && node instanceof Element) return node
  if (node && (node as Node).nodeType === 8) {
    for (let n = (node as Node).nextSibling; n; n = n.nextSibling) {
      if (typeof Element !== 'undefined' && n instanceof Element) return n
    }
  }
  return null
}
