import { describe, expect, it } from 'vitest'
import { DEFAULT_LAYOUT, resolveLayout } from './layout'

describe('resolveLayout', () => {
  it('treats omit/false as disabled (HTML boolean default)', () => {
    expect(resolveLayout(undefined, 24).enabled).toBe(false)
    expect(resolveLayout(false, 24).enabled).toBe(false)
  })

  it('uses defaults when layout is true', () => {
    const r = resolveLayout(true, 24)
    expect(r.enabled).toBe(true)
    expect(r.column).toBe(DEFAULT_LAYOUT.column)
    expect(r.gutter).toBe(DEFAULT_LAYOUT.gutter)
    expect(r.defaultSpan).toBe(12)
  })

  it('derives defaultSpan from column and total', () => {
    expect(resolveLayout({ column: 4, gutter: 12 }, 24)).toMatchObject({
      enabled: true,
      column: 4,
      gutter: 12,
      defaultSpan: 6,
    })
    expect(resolveLayout({ column: 3 }, 24).defaultSpan).toBe(8)
    expect(resolveLayout({ column: 1 }, 24).defaultSpan).toBe(24)
  })
})
