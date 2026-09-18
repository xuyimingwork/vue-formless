import { describe, expect, it } from 'vitest'
import { isFieldMode, normalizeField, resolveFieldMode } from './field-mode'

describe('field mode', () => {
  it('accepts the four writable placements', () => {
    for (const value of ['auto', 'wrap', 'embed', 'wrap-embed']) {
      expect(isFieldMode(value)).toBe(true)
    }
    for (const value of [undefined, null, '', 'nope', 0, {}]) {
      expect(isFieldMode(value)).toBe(false)
    }
  })

  it('defaults an omitted / illegal placement to auto', () => {
    expect(normalizeField(undefined)).toBe('auto')
    expect(normalizeField('nope')).toBe('auto')
    expect(normalizeField('wrap-embed')).toBe('wrap-embed')
  })

  it('folds the control nature into the placement', () => {
    // leaf control
    expect(resolveFieldMode(undefined, false)).toBe('wrap')
    expect(resolveFieldMode('auto', false)).toBe('wrap')
    expect(resolveFieldMode('wrap', false)).toBe('wrap')
    expect(resolveFieldMode('embed', false)).toBe('embed')
    expect(resolveFieldMode('wrap-embed', false)).toBe('wrap-embed')
    // composite control
    expect(resolveFieldMode(undefined, true)).toBe('embed')
    expect(resolveFieldMode('auto', true)).toBe('embed')
    expect(resolveFieldMode('wrap', true)).toBe('wrap-embed')
    expect(resolveFieldMode('embed', true)).toBe('embed')
    expect(resolveFieldMode('wrap-embed', true)).toBe('wrap-embed')
  })
})
