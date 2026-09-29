import { describe, expect, expectTypeOf, it } from 'vitest'
import { omitUndefined, getAttrBoolean, upperFirst } from './utils'

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

describe('omitUndefined', () => {
  it('drops undefined-valued entries only', () => {
    expect(omitUndefined({ a: undefined, b: null, c: 0 })).toEqual({ b: null, c: 0 })
  })
})

describe('getAttrBoolean', () => {
  it('maps Vue boolean-attr shapes and falls back when missing', () => {
    expect(getAttrBoolean(undefined)).toBe(undefined)
    expect(getAttrBoolean('')).toBe(true)
    expect(getAttrBoolean(true)).toBe(true)
    expect(getAttrBoolean(null)).toBe(false)
    expect(getAttrBoolean('true')).toBe(true)
    expect(getAttrBoolean(false)).toBe(false)
    expect(getAttrBoolean('false')).toBe(true)
    expect(getAttrBoolean('nope')).toBe(true)
  })

  it('takes a boolean seed as the floor, so the result is never undefined', () => {
    expect(getAttrBoolean(true)).toBe(true)
    expect(getAttrBoolean(true, undefined, undefined)).toBe(true)
    expect(getAttrBoolean(true, undefined, false)).toBe(false)
    expect(getAttrBoolean(false, undefined, '')).toBe(true)
    expectTypeOf(getAttrBoolean(true, undefined)).toEqualTypeOf<boolean>()
    expectTypeOf(getAttrBoolean(undefined)).toEqualTypeOf<boolean | undefined>()
  })
})
