import { computed, ref, toValue, type MaybeRefOrGetter, type Ref } from 'vue'
import {
  resolveColPlace,
  resolveColSpan,
  takePlaceBlanks,
  type ColPlace,
  type ColSpanSpec,
} from './density'

interface CellRecord {
  id: string
  span: MaybeRefOrGetter<ColSpanSpec | undefined>
  place: MaybeRefOrGetter<ColPlace | undefined>
}

export interface LayoutOccupancy {
  readonly version: Ref<number>
  register(
    span?: MaybeRefOrGetter<ColSpanSpec | undefined>,
    place?: MaybeRefOrGetter<ColPlace | undefined>,
  ): string
  bindColEl(id: string, raw: unknown): void
  dispose(id: string): void
  bump(): void
  ownSpan(id: string): number
  blanks(id: string): number[]
}

/** Row ledger. Maps stay inside; View feeds DOM children and column. */
export function createOccupancy(
  getDomChildren: () => Element[],
  getColumn: () => number,
): LayoutOccupancy {
  const cells = new Map<string, CellRecord>()
  const elToId = new Map<Element, string>()
  const colEls = new Map<string, Element | null>()
  const lastBlanks = new Map<string, number[]>()
  const version = ref(0)
  const roster = ref(0)
  let seq = 0

  const orderKey = computed(() => {
    roster.value
    version.value
    const fromDom = getDomChildren()
      .map((child) => elToId.get(child))
      .filter((id): id is string => Boolean(id))
    const ids = fromDom.length === cells.size ? fromDom : [...cells.keys()]
    return ids.join(',')
  })

  const blanksById = computed(() => {
    const column = getColumn()
    const key = orderKey.value
    const ids = key === '' ? [] : key.split(',')
    const used = { n: 0 }
    const map = new Map<string, number[]>()
    for (const id of ids) {
      const cell = cells.get(id)
      if (!cell) continue
      const n = resolveColSpan(toValue(cell.span), column)
      const blanks = takePlaceBlanks(used, n, resolveColPlace(toValue(cell.place)))
      map.set(cell.id, blanks)
      used.n += n
    }
    return map
  })

  return {
    version,
    register(span, place) {
      const id = String(++seq)
      cells.set(id, { id, span, place })
      roster.value++
      return id
    },
    bindColEl(id, raw) {
      const prev = colEls.get(id)
      if (prev) elToId.delete(prev)
      const el = hostEl(raw)
      colEls.set(id, el)
      if (el) elToId.set(el, id)
    },
    dispose(id) {
      const el = colEls.get(id)
      if (el) elToId.delete(el)
      colEls.delete(id)
      cells.delete(id)
      lastBlanks.delete(id)
      version.value++
    },
    bump() {
      version.value++
    },
    ownSpan(id) {
      const cell = cells.get(id)
      return resolveColSpan(toValue(cell?.span), getColumn())
    },
    blanks(id) {
      const next = blanksById.value.get(id) ?? emptyBlanks
      const prev = lastBlanks.get(id)
      if (prev && sameNums(prev, next)) return prev
      lastBlanks.set(id, next)
      return next
    },
  }
}

const emptyBlanks: number[] = []

function sameNums(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((n, i) => n === b[i])
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
