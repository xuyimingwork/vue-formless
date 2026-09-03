import { describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_LAYOUT,
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

  it('multiplies Nx by the slot and clamps to 24', () => {
    expect(normalizeColSpan('2x', 3)).toBe(16)
    expect(normalizeColSpan('3x', 3)).toBe(24)
    expect(normalizeColSpan('4x', 3)).toBe(24)
  })

  it('treats numbers and numeric strings as absolute span', () => {
    expect(normalizeColSpan(8, 3)).toBe(8)
    expect(normalizeColSpan('8', 3)).toBe(8)
    expect(normalizeColSpan('max', 3)).toBe(GRID_TOTAL)
  })

  it('warns and falls back to 1x on illegal literals', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(normalizeColSpan(0, 2)).toBe(12)
    expect(normalizeColSpan(25, 2)).toBe(12)
    expect(normalizeColSpan(8.5, 2)).toBe(12)
    expect(normalizeColSpan('2X', 2)).toBe(12)
    expect(normalizeColSpan('0x', 2)).toBe(12)
    expect(normalizeColSpan('2.5x', 2)).toBe(12)
    expect(normalizeColSpan('foo', 2)).toBe(12)
    expect(warn).toHaveBeenCalled()
    expect(warn.mock.calls[0]?.[0]).toMatch(/^\[layout\] col:span/)
    expect(String(warn.mock.calls[0]?.[0])).not.toMatch(/formless/)
    warn.mockRestore()
  })
})

describe('normalizeColPlace', () => {
  it('defaults to auto', () => {
    expect(normalizeColPlace(undefined)).toBe('auto')
    expect(normalizeColPlace('')).toBe('auto')
    expect(normalizeColPlace('auto')).toBe('auto')
  })

  it('warns and falls back to auto on illegal place', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(normalizeColPlace('center')).toBe('auto')
    expect(normalizeColPlace('foo')).toBe('auto')
    expect(warn).toHaveBeenCalled()
    expect(warn.mock.calls[0]?.[0]).toMatch(/^\[layout\] col:place/)
    expect(String(warn.mock.calls[0]?.[0])).not.toMatch(/formless/)
    warn.mockRestore()
  })
})

describe('DEFAULT_LAYOUT', () => {
  it('is one column', () => {
    expect(DEFAULT_LAYOUT).toEqual({ column: 1 })
  })
})

describe('normalizeColumn', () => {
  it('clamps present values to 1–24', () => {
    expect(normalizeColumn(3)).toBe(3)
    expect(normalizeColumn(0)).toBe(1)
    expect(normalizeColumn(25)).toBe(GRID_TOTAL)
    expect(normalizeColumn(-1)).toBe(1)
    expect(normalizeColumn(Infinity)).toBe(GRID_TOTAL)
    expect(normalizeColumn(NaN)).toBe(DEFAULT_LAYOUT.column)
  })
})

describe('mergeColumn', () => {
  it('lets later candidates override earlier ones, then normalizes', () => {
    expect(mergeColumn(undefined, undefined)).toBe(DEFAULT_LAYOUT.column)
    expect(mergeColumn(undefined, 3)).toBe(3)
    expect(mergeColumn(3, 0)).toBe(1)
    expect(mergeColumn(undefined, 0, 3)).toBe(3)
  })
})
