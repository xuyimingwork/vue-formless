import { describe, expect, expectTypeOf, it } from 'vitest'
import { createExposeProxy, getAttrBoolean, upperFirst } from './utils'

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

describe('createExposeProxy', () => {
  interface Api {
    count: number
    read: () => number
  }

  it('forwards property reads to the current value', () => {
    const proxy = createExposeProxy<Api>({ value: { count: 1, read: () => 0 } })
    expect(proxy.count).toBe(1)
  })

  it('returns undefined while the holder is still null', () => {
    const proxy = createExposeProxy<Api>({ value: null })
    expect(proxy.count).toBeUndefined()
  })

  it('tracks later mutation of the holder', () => {
    const holder: { value: Api | null } = { value: null }
    const proxy = createExposeProxy(holder)
    holder.value = { count: 42, read: () => 0 }
    expect(proxy.count).toBe(42)
  })

  it('binds methods to the inner object, so `this` is the host instance', () => {
    const proxy = createExposeProxy<Api>({
      value: { count: 7, read() { return this.count } },
    })
    const read = proxy.read
    expect(read()).toBe(7)
  })

  it('forwards `in` checks and answers false while unset', () => {
    const holder: { value: Api | null } = { value: { count: 1, read: () => 0 } }
    const proxy = createExposeProxy(holder)
    expect('count' in proxy).toBe(true)
    expect('missing' in proxy).toBe(false)
    holder.value = null
    expect('count' in proxy).toBe(false)
  })
})
