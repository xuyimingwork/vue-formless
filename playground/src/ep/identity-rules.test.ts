import { describe, expect, it } from 'vitest'
import { isEmptyValue } from './identity-rules'

describe('isEmptyValue', () => {
  it('trims strings and treats nullish / empty array as empty', () => {
    expect(isEmptyValue('')).toBe(true)
    expect(isEmptyValue('  ')).toBe(true)
    expect(isEmptyValue(null)).toBe(true)
    expect(isEmptyValue([])).toBe(true)
    expect(isEmptyValue('a')).toBe(false)
    expect(isEmptyValue(0)).toBe(false)
  })

  it('uses empty.validate when provided (true = filled)', () => {
    expect(isEmptyValue('x', { validate: () => false })).toBe(true)
    expect(isEmptyValue('', { validate: () => true })).toBe(false)
  })
})
