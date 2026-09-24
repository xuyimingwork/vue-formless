import { describe, expect, it } from 'vitest'
import { isFieldMode } from './field-mode'

describe('field mode', () => {
  it('accepts the four writable placements', () => {
    for (const value of ['auto', 'wrap', 'embed', 'wrap-embed']) {
      expect(isFieldMode(value)).toBe(true)
    }
    for (const value of [undefined, null, '', 'nope', 0, {}]) {
      expect(isFieldMode(value)).toBe(false)
    }
  })
})
