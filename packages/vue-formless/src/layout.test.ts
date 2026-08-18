import { describe, expect, it } from 'vitest'
import { DEFAULT_LAYOUT, GRID_TOTAL, resolveLayout } from './layout'

describe('resolveLayout', () => {
  it('treats omit/false as disabled (HTML boolean default)', () => {
    expect(resolveLayout(undefined).enabled).toBe(false)
    expect(resolveLayout(false).enabled).toBe(false)
  })

  it('uses defaults when layout is true', () => {
    const r = resolveLayout(true)
    expect(r.enabled).toBe(true)
    expect(r.column).toBe(DEFAULT_LAYOUT.column)
    expect(r.gutter).toBe(DEFAULT_LAYOUT.gutter)
    expect(r.defaultSpan).toBe(GRID_TOTAL / DEFAULT_LAYOUT.column)
  })

  it('derives defaultSpan from column on the 24-grid', () => {
    expect(resolveLayout({ column: 4, gutter: 12 })).toMatchObject({
      enabled: true,
      column: 4,
      gutter: 12,
      defaultSpan: 6,
    })
    expect(resolveLayout({ column: 3 }).defaultSpan).toBe(8)
    expect(resolveLayout({ column: 1 }).defaultSpan).toBe(24)
  })
})
