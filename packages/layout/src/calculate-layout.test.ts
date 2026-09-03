import { describe, expect, it } from 'vitest'
import {
  calculateBlanks,
  calculateLayout,
  type Cell,
} from './calculate-layout'
import type { ColPlace, ColSpan } from './grid'

function cell(span: ColSpan, place: ColPlace = 'auto'): Cell {
  return { span, place }
}

function place(cells: Cell[]) {
  return calculateLayout(cells).map((c) => ({
    span: c.span,
    place: c.place,
    $start: c.$start,
    $occupied: c.$occupied,
    blanks: calculateBlanks(c.$start, c.$occupied, c.span),
  }))
}

describe('calculateLayout', () => {
  it('auto fits on the current row without blanks', () => {
    expect(place([cell(8), cell(8)])).toEqual([
      { span: 8, place: 'auto', $start: 0, $occupied: 8, blanks: [] },
      { span: 8, place: 'auto', $start: 8, $occupied: 8, blanks: [] },
    ])
  })

  it('auto seals the remainder when the cell does not fit', () => {
    expect(place([cell(16), cell(16)])).toEqual([
      { span: 16, place: 'auto', $start: 0, $occupied: 16, blanks: [] },
      { span: 16, place: 'auto', $start: 16, $occupied: 24, blanks: [8] },
    ])
  })

  it('start does not seal at the beginning of a row', () => {
    expect(place([cell(8, 'start')])).toEqual([
      { span: 8, place: 'start', $start: 0, $occupied: 8, blanks: [] },
    ])
  })

  it('start seals the current row when cursor > 0', () => {
    expect(place([cell(8), cell(8, 'start')])).toEqual([
      { span: 8, place: 'auto', $start: 0, $occupied: 8, blanks: [] },
      { span: 8, place: 'start', $start: 8, $occupied: 24, blanks: [16] },
    ])
  })

  it('end pads an empty row so the cell sits at the trailing edge', () => {
    expect(place([cell(8, 'end')])).toEqual([
      { span: 8, place: 'end', $start: 0, $occupied: 24, blanks: [16] },
    ])
  })

  it('end pads when the cell already fits but is not flush right', () => {
    expect(place([cell(8), cell(8, 'end')])).toEqual([
      { span: 8, place: 'auto', $start: 0, $occupied: 8, blanks: [] },
      { span: 8, place: 'end', $start: 8, $occupied: 16, blanks: [8] },
    ])
  })

  it('end does not pad when the cell already occupies the last n slots', () => {
    expect(place([cell(16), cell(8, 'end')])).toEqual([
      { span: 16, place: 'auto', $start: 0, $occupied: 16, blanks: [] },
      { span: 8, place: 'end', $start: 16, $occupied: 8, blanks: [] },
    ])
  })

  it('end seals then pads when the cell does not fit', () => {
    expect(place([cell(16), cell(16, 'end')])).toEqual([
      { span: 16, place: 'auto', $start: 0, $occupied: 16, blanks: [] },
      { span: 16, place: 'end', $start: 16, $occupied: 32, blanks: [8, 8] },
    ])
  })

  it('does not treat a later row offset as an overflow seal', () => {
    expect(place([cell(24), cell(8)])).toEqual([
      { span: 24, place: 'auto', $start: 0, $occupied: 24, blanks: [] },
      { span: 8, place: 'auto', $start: 24, $occupied: 8, blanks: [] },
    ])
  })
})
