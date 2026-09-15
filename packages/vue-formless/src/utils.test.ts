import { describe, expect, it } from 'vitest'
import { omit, omitUndefined, upperFirst } from './utils'

describe('upperFirst', () => {
  it('converts camelCase field keys to PascalCase tags', () => {
    expect(upperFirst('name')).toBe('Name')
    expect(upperFirst('idCard')).toBe('IdCard')
  })

  it('only touches the first character', () => {
    expect(upperFirst('modelValue')).toBe('ModelValue')
    expect(upperFirst('')).toBe('')
  })
})

describe('omit', () => {
  it('drops the given keys and copies the rest as-is', () => {
    const value = { a: 1, b: undefined, c: 3 }
    expect(omit(value, ['a', 'c'])).toEqual({ b: undefined })
    expect(value).toEqual({ a: 1, b: undefined, c: 3 })
  })
})

describe('omitUndefined', () => {
  it('drops undefined-valued entries only', () => {
    expect(omitUndefined({ a: undefined, b: null, c: 0 })).toEqual({ b: null, c: 0 })
  })
})
