import { computed, toValue, type ComputedRef, type MaybeRefOrGetter } from 'vue'
import { GRID_TOTAL, type ColPlace } from './density'

export interface PlaceBlankCell {
  id: string
  span: number
  place: ColPlace
}

/** `used` mutation for `place`. Returns blank Col spans to insert before this cell. */
export function takePlaceBlanks(
  used: { n: number },
  n: number,
  place: ColPlace,
): number[] {
  const blanks: number[] = []
  if (place === 'auto') {
    if (used.n + n > GRID_TOTAL) used.n = 0
    return blanks
  }
  if (place === 'start') {
    if (used.n > 0) {
      blanks.push(GRID_TOTAL - used.n)
      used.n = 0
    }
    return blanks
  }
  if (used.n + n > GRID_TOTAL && used.n > 0) {
    blanks.push(GRID_TOTAL - used.n)
    used.n = 0
  }
  const pad = GRID_TOTAL - used.n - n
  if (pad > 0) {
    blanks.push(pad)
    used.n += pad
  }
  return blanks
}

/** Ordered resolved cells in; per-id blank spans out. No DOM, no span parsing. */
export function usePlaceBlanks(
  cells: MaybeRefOrGetter<readonly PlaceBlankCell[]>,
): ComputedRef<ReadonlyMap<string, number[]>> {
  return computed(() => {
    const used = { n: 0 }
    const map = new Map<string, number[]>()
    for (const cell of toValue(cells)) {
      const blanks = takePlaceBlanks(used, cell.span, cell.place)
      map.set(cell.id, blanks)
      used.n += cell.span
    }
    return map
  })
}
