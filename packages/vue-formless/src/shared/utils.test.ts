import { describe, expect, expectTypeOf, it } from 'vitest'
import { createExposeProxy, getAttrBoolean, mergeExposeProxy, upperFirst } from './utils'

describe('upperFirst', () => {
  it('should convert camelCase field keys to PascalCase tags', () => {
    expect(upperFirst('name')).toBe('Name')
    expect(upperFirst('idCard')).toBe('IdCard')
  })

  it('should only touch the first character', () => {
    expect(upperFirst('modelValue')).toBe('ModelValue')
    expect(upperFirst('')).toBe('')
  })
})

describe('getAttrBoolean', () => {
  it('should map Vue boolean-attr shapes and fall back when missing', () => {
    expect(getAttrBoolean(undefined)).toBe(undefined)
    expect(getAttrBoolean('')).toBe(true)
    expect(getAttrBoolean(true)).toBe(true)
    expect(getAttrBoolean(null)).toBe(false)
    expect(getAttrBoolean('true')).toBe(true)
    expect(getAttrBoolean(false)).toBe(false)
    expect(getAttrBoolean('false')).toBe(true)
    expect(getAttrBoolean('nope')).toBe(true)
  })

  it('should take a boolean seed as the floor, so the result is never undefined', () => {
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

  it('should forward property reads to the current value', () => {
    const proxy = createExposeProxy<Api>({ value: { count: 1, read: () => 0 } })
    expect(proxy.count).toBe(1)
  })

  it('should return undefined while the holder is still null', () => {
    const proxy = createExposeProxy<Api>({ value: null })
    expect(proxy.count).toBeUndefined()
  })

  it('should track later mutation of the holder', () => {
    const holder: { value: Api | null } = { value: null }
    const proxy = createExposeProxy(holder)
    holder.value = { count: 42, read: () => 0 }
    expect(proxy.count).toBe(42)
  })

  it('should bind methods to the inner object, so `this` is the host instance', () => {
    const proxy = createExposeProxy<Api>({
      value: { count: 7, read() { return this.count } },
    })
    const read = proxy.read
    expect(read()).toBe(7)
  })

  it('should forward `in` checks and answer false while unset', () => {
    const holder: { value: Api | null } = { value: { count: 1, read: () => 0 } }
    const proxy = createExposeProxy(holder)
    expect('count' in proxy).toBe(true)
    expect('missing' in proxy).toBe(false)
    holder.value = null
    expect('count' in proxy).toBe(false)
  })
})

describe('mergeExposeProxy', () => {
  it('should forward keys not named in override to the base proxy', () => {
    const base = createExposeProxy<{ count: number; read: () => number }>({
      value: { count: 1, read() { return this.count } },
    })
    const merged = mergeExposeProxy(base, {})
    expect(merged.count).toBe(1)
    expect(merged.read()).toBe(1)
  })

  it('should let override keys shadow the base', () => {
    const base = createExposeProxy<{ count: number }>({ value: { count: 1 } })
    const merged = mergeExposeProxy(base, { count: 42 })
    expect(merged.count).toBe(42)
  })

  it('should keep a nested proxy value lazy and bound', () => {
    const holder: { value: { validate: () => string } | null } = { value: null }
    const item = createExposeProxy(holder)
    const base = createExposeProxy<{ count: number }>({ value: { count: 1 } })
    const merged = mergeExposeProxy(base, { itemRef: item })
    // Holder null → nested proxy reads undefined until mounted.
    expect(merged.itemRef.validate).toBeUndefined()
    holder.value = { validate: () => 'ok' }
    expect(merged.itemRef.validate()).toBe('ok')
    // Base key still forwards.
    expect(merged.count).toBe(1)
  })

  it('should evaluate accessor getter overrides lazily on each read', () => {
    const holder: { value: { validate: () => string } | null } = { value: null }
    const item = createExposeProxy(holder)
    const base = createExposeProxy<{ count: number }>({ value: { count: 1 } })
    const merged = mergeExposeProxy(base, {
      get itemRef() {
        return holder.value ? item : null
      },
    })
    expect(merged.itemRef).toBeNull()
    holder.value = { validate: () => 'ok' }
    expect(merged.itemRef.validate()).toBe('ok')
  })

  it('should forward `in` checks to base and override', () => {
    const base = createExposeProxy<{ count: number }>({ value: { count: 1 } })
    const merged = mergeExposeProxy(base, { itemRef: null })
    expect('count' in merged).toBe(true)
    expect('itemRef' in merged).toBe(true)
    expect('missing' in merged).toBe(false)
  })
})
