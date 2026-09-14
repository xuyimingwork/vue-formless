import { describe, expect, it } from 'vitest'
import { camelToPascal } from './string-case'

describe('camelToPascal', () => {
  it('converts camelCase field keys to PascalCase tags', () => {
    expect(camelToPascal('name')).toBe('Name')
    expect(camelToPascal('idCard')).toBe('IdCard')
    expect(camelToPascal('')).toBe('')
  })
})
