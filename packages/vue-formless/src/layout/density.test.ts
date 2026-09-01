import { describe, expect, it } from 'vitest'
import { DEFAULT_LAYOUT, GRID_TOTAL, resolveColPlace, resolveColSpan, takePlaceBlanks } from './density'

describe('resolveColSpan', () => {
  it('treats omit as 1x', () => {
    expect(resolveColSpan(undefined, 1)).toBe(24)
    expect(resolveColSpan(undefined, 2)).toBe(12)
    expect(resolveColSpan(undefined, 3)).toBe(8)
    expect(resolveColSpan('', 3)).toBe(8)
  })

  it('multiplies Nx by the slot and clamps to 24', () => {
    expect(resolveColSpan('2x', 3)).toBe(16)
    expect(resolveColSpan('3x', 3)).toBe(24)
    expect(resolveColSpan('4x', 3)).toBe(24)
  })

  it('treats numbers and numeric strings as absolute span', () => {
    expect(resolveColSpan(8, 3)).toBe(8)
    expect(resolveColSpan('8', 3)).toBe(8)
    expect(resolveColSpan('max', 3)).toBe(GRID_TOTAL)
  })

  it('throws on illegal literals', () => {
    expect(() => resolveColSpan(0, 2)).toThrow(/1–24/)
    expect(() => resolveColSpan(25, 2)).toThrow(/1–24/)
    expect(() => resolveColSpan(8.5, 2)).toThrow(/1–24/)
    expect(() => resolveColSpan('2X', 2)).toThrow(/invalid/)
    expect(() => resolveColSpan('0x', 2)).toThrow(/invalid/)
    expect(() => resolveColSpan('2.5x', 2)).toThrow(/invalid/)
    expect(() => resolveColSpan('foo', 2)).toThrow(/invalid/)
  })
})

describe('resolveColPlace', () => {
  it('defaults to auto', () => {
    expect(resolveColPlace(undefined)).toBe('auto')
    expect(resolveColPlace('')).toBe('auto')
    expect(resolveColPlace('auto')).toBe('auto')
  })

  it('throws on illegal place', () => {
    expect(() => resolveColPlace('center')).toThrow(/invalid/)
    expect(() => resolveColPlace('foo')).toThrow(/invalid/)
  })
})

describe('takePlaceBlanks', () => {
  it('auto does not insert blanks and resets used on overflow', () => {
    const used = { n: 16 }
    expect(takePlaceBlanks(used, 16, 'auto')).toEqual([])
    expect(used.n).toBe(0)
  })

  it('start seals the current row when used > 0', () => {
    const used = { n: 8 }
    expect(takePlaceBlanks(used, 8, 'start')).toEqual([16])
    expect(used.n).toBe(0)
  })

  it('end pads so the cell occupies the last n slots', () => {
    const used = { n: 0 }
    expect(takePlaceBlanks(used, 8, 'end')).toEqual([16])
    expect(used.n).toBe(16)
  })
})

describe('DEFAULT_LAYOUT', () => {
  it('is one column and zero gutter', () => {
    expect(DEFAULT_LAYOUT).toEqual({ column: 1, gutter: 0 })
  })
})
