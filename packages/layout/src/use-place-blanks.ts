import { computed, toValue, type ComputedRef, type MaybeRefOrGetter } from 'vue'
import { calculateBlanks, calculateLayout } from './calculate-layout'
import type { ColPlace, ColSpan } from './grid'

export interface LayoutCell {
  id: string
  span: ColSpan
  place: ColPlace
}

/** Ordered resolved cells in; per-id blank spans out. No DOM, no span parsing. */
export function usePlaceBlanks(
  cells: MaybeRefOrGetter<LayoutCell[]>,
): ComputedRef<ReadonlyMap<string, number[]>> {
  return computed(() => {
    const layout = calculateLayout(toValue(cells))
    return new Map(
      layout.map((cell) => [cell.id, calculateBlanks(cell.$start, cell.$occupied, cell.span)]),
    )
  })
}
