import { describe, expect, expectTypeOf, it } from 'vitest'
import { camelToPascal, pascalToCamel } from './case'
import { applyControlModel, resolveControlModel } from './controlModel'
import { createFormControls } from './createFormControls'

describe('case', () => {
  it('converts camelCase ↔ PascalCase', () => {
    expect(camelToPascal('name')).toBe('Name')
    expect(camelToPascal('idCard')).toBe('IdCard')
    expect(pascalToCamel('Name')).toBe('name')
    expect(pascalToCamel('IdCard')).toBe('idCard')
  })
})

describe('resolveControlModel', () => {
  it('omits to modelValue: controlKey', () => {
    expect(resolveControlModel('name')).toEqual({ modelValue: 'name' })
  })

  it('string is shorthand for modelValue', () => {
    expect(resolveControlModel('title', 'name')).toEqual({ modelValue: 'name' })
  })

  it('object maps v-model names to form keys', () => {
    expect(resolveControlModel('timeRange', { start: 'startTime', end: 'endTime' })).toEqual({
      start: 'startTime',
      end: 'endTime',
    })
    expect(resolveControlModel('heading', { title: 'name' })).toEqual({ title: 'name' })
  })
})

describe('applyControlModel', () => {
  it('reads and writes mapped keys', () => {
    const form = { startTime: 'a', endTime: 'b' }
    const bindings = applyControlModel(form, { start: 'startTime', end: 'endTime' })
    expect(bindings.start).toBe('a')
    expect(bindings.end).toBe('b')
    ;(bindings['onUpdate:start'] as (v: string) => void)('x')
    expect(form.startTime).toBe('x')
  })
})

describe('createFormControls', () => {
  it('exposes PascalCase components for camelCase control keys', () => {
    const User = createFormControls({
      name: { label: '姓名' },
      timeRange: { label: '时间', model: { start: 'startTime', end: 'endTime' } },
    })

    expect(User.Name).toBeTruthy()
    expect(User.TimeRange).toBeTruthy()
    expect(Object.keys(User).sort()).toEqual(['Name', 'TimeRange'])
    expect((User as { name?: unknown }).name).toBeUndefined()
  })

  it('types PascalCase keys without a string index', () => {
    const User = createFormControls({
      name: { label: '姓名' },
      idCard: { label: '证件号' },
    })
    expectTypeOf(User).toHaveProperty('Name')
    expectTypeOf(User).toHaveProperty('IdCard')
  })
})
