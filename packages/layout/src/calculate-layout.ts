import { GRID_TOTAL, type ColPlace, type ColSpan } from './grid'

export type Cell = {
  span: ColSpan
  place: ColPlace
}

export type CellPlaced<T extends Cell = Cell> = T & {
  $start: number
  $occupied: number
}

export function calculateLayout<T extends Cell>(cells: T[]): CellPlaced<T>[] {
  return cells.reduce((result, cell, i): CellPlaced<T>[] => {
    const prev = result[i - 1]
    const $start = prev ? prev.$start + prev.$occupied : 0
    const cursor = $start % GRID_TOTAL
    const $occupied = calculateOccupied({ cursor, span: cell.span, place: cell.place })
    result.push({
      ...cell,
      $start,
      $occupied,
    })
    return result
  }, [])
}

export function calculateOccupied({
  cursor,
  place,
  span,
}: {
  cursor: number
  place: ColPlace
  span: ColSpan
}): number {
  const rest = GRID_TOTAL - cursor
  if (place === 'start') {
    if (cursor === 0) return span
    return rest + span
  }
  if (place === 'end') {
    if (rest >= span) return rest
    return rest + GRID_TOTAL
  }
  if (rest >= span) return span
  return rest + span
}

export function calculateBlanks($start: number, $occupied: number, span: ColSpan): number[] {
  const cursor = $start % GRID_TOTAL
  const seal = cursor + $occupied > GRID_TOTAL ? GRID_TOTAL - cursor : 0
  const pad = $occupied - seal - span
  return [seal, pad].filter((n) => n > 0)
}
