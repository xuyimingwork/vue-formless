import { describe, expect, it } from 'vitest'
import {
  DEFAULT_COLUMN,
  GRID_TOTAL,
  mergeColumn,
  normalizeColPlace,
  normalizeColSpan,
  normalizeColumn,
} from './grid'

describe('normalizeColSpan', () => {
  it('treats omit as 1x', () => {
    expect(normalizeColSpan(undefined, 1)).toBe(24)
    expect(normalizeColSpan(undefined, 2)).toBe(12)
    expect(normalizeColSpan(undefined, 3)).toBe(8)
    expect(normalizeColSpan('', 3)).toBe(8)
  })

  it('multiplies Nx by span1x and clamps to 24', () => {
    expect(normalizeColSpan('2x', 3)).toBe(16)
    expect(normalizeColSpan('3x', 3)).toBe(24)
    expect(normalizeColSpan('4x', 3)).toBe(24)
    expect(normalizeColSpan('25x', 3)).toBe(24)
    expect(normalizeColSpan('0x', 2)).toBe(12)
    expect(normalizeColSpan('2.5x', 3)).toBe(16)
    expect(normalizeColSpan('2X', 3)).toBe(16)
    expect(normalizeColSpan('1X', 3)).toBe(8)
  })

  it('treats numbers and numeric strings as absolute span', () => {
    expect(normalizeColSpan(8, 3)).toBe(8)
    expect(normalizeColSpan('8', 3)).toBe(8)
    expect(normalizeColSpan(' 8 ', 3)).toBe(8)
    expect(normalizeColSpan('max', 3)).toBe(GRID_TOTAL)
    expect(normalizeColSpan('MAX', 3)).toBe(GRID_TOTAL)
    expect(normalizeColSpan(' Max ', 3)).toBe(GRID_TOTAL)
  })

  it('clamps out-of-range numeric spans to 1–24', () => {
    expect(normalizeColSpan(0, 2)).toBe(1)
    expect(normalizeColSpan(25, 2)).toBe(GRID_TOTAL)
    expect(normalizeColSpan(8.5, 2)).toBe(8)
    expect(normalizeColSpan(-3, 2)).toBe(1)
    expect(normalizeColSpan(Infinity, 2)).toBe(GRID_TOTAL)
    expect(normalizeColSpan(-Infinity, 2)).toBe(1)
    expect(normalizeColSpan('0', 2)).toBe(1)
    expect(normalizeColSpan('25', 2)).toBe(GRID_TOTAL)
  })

  it('uses 1x of a 1-column density when column is not positive', () => {
    expect(normalizeColSpan(undefined, 0)).toBe(GRID_TOTAL)
    expect(normalizeColSpan('1x', -1)).toBe(GRID_TOTAL)
  })

  it('falls back to 1x when span cannot be parsed', () => {
    expect(normalizeColSpan(true, 2)).toBe(12)
    expect(normalizeColSpan({}, 2)).toBe(12)
    expect(normalizeColSpan(NaN, 2)).toBe(12)
    expect(normalizeColSpan('foo', 2)).toBe(12)
  })
})

describe('normalizeColPlace', () => {
  it('defaults to auto', () => {
    expect(normalizeColPlace(undefined)).toBe('auto')
    expect(normalizeColPlace('')).toBe('auto')
    expect(normalizeColPlace('auto')).toBe('auto')
    expect(normalizeColPlace('AUTO')).toBe('auto')
    expect(normalizeColPlace('center')).toBe('auto')
    expect(normalizeColPlace('foo')).toBe('auto')
  })

  it('keeps start and end', () => {
    expect(normalizeColPlace('start')).toBe('start')
    expect(normalizeColPlace('end')).toBe('end')
    expect(normalizeColPlace('START')).toBe('start')
    expect(normalizeColPlace(' End ')).toBe('end')
  })
})

describe('DEFAULT_COLUMN', () => {
  it('is one column', () => {
    expect(DEFAULT_COLUMN).toBe(1)
  })
})

describe('normalizeColumn', () => {
  it('clamps present values to 1–24', () => {
    expect(normalizeColumn(3)).toBe(3)
    expect(normalizeColumn(0)).toBe(1)
    expect(normalizeColumn(25)).toBe(GRID_TOTAL)
    expect(normalizeColumn(-1)).toBe(1)
    expect(normalizeColumn(Infinity)).toBe(GRID_TOTAL)
    expect(normalizeColumn(-Infinity)).toBe(1)
    expect(normalizeColumn(NaN)).toBe(DEFAULT_COLUMN)
  })
})

describe('mergeColumn', () => {
  it('lets later candidates override earlier ones, then normalizes', () => {
    expect(mergeColumn(undefined, undefined)).toBe(DEFAULT_COLUMN)
    expect(mergeColumn(undefined, 3)).toBe(3)
    expect(mergeColumn(3, 0)).toBe(1)
    expect(mergeColumn(undefined, 0, 3)).toBe(3)
  })
})
