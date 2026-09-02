import { reactive, ref, type Ref } from 'vue'
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

export interface LayoutOccupancy {
  readonly version: Ref<number>
  nextId(): string
  add(cell: CellRecord): void
  bindColEl(id: string, raw: unknown, prev: Element | null): Element | null
  remove(id: string, colEl: Element | null): void
  entries(): CellRecord[]
  bump(): void
}

/** Row ledger. Maps stay inside; View feeds DOM children, Item only calls these. */
export function createOccupancy(getDomChildren: () => Element[]): LayoutOccupancy {
  const cells = new Map<string, CellRecord>()
  const elToId = reactive(new Map<Element, string>())
  const version = ref(0)
  let seq = 0

  return {
    version,
    nextId() {
      return String(++seq)
    },
    add(cell) {
      cells.set(cell.id, cell)
    },
    bindColEl(id, raw, prev) {
      if (prev) elToId.delete(prev)
      const el = hostEl(raw)
      if (el) elToId.set(el, id)
      return el
    },
    remove(id, colEl) {
      if (colEl) elToId.delete(colEl)
      cells.delete(id)
      version.value++
    },
    entries() {
      const fromDom = getDomChildren()
        .map((child) => elToId.get(child))
        .filter((id): id is string => Boolean(id))
      const ids = fromDom.length === cells.size ? fromDom : [...cells.keys()]
      const out: CellRecord[] = []
      for (const id of ids) {
        const cell = cells.get(id)
        if (cell) out.push(cell)
      }
      return out
    },
    bump() {
      version.value++
    },
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
  const inst = source as {
    vnode?: { el?: unknown }
    subTree?: { el?: unknown; component?: { vnode?: { el?: unknown } } }
    $el?: unknown
  }
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
