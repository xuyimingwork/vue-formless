import { describe, expect, expectTypeOf, it } from 'vitest'
import { camelToPascal, pascalToCamel } from './case'
import {
  applyControlBinding,
  primaryPath,
  resolveControlBinding,
} from './controlModel'
import { createFormControls } from './createFormControls'

describe('case', () => {
  it('converts camelCase ↔ PascalCase', () => {
    expect(camelToPascal('name')).toBe('Name')
    expect(camelToPascal('idCard')).toBe('IdCard')
    expect(pascalToCamel('Name')).toBe('name')
    expect(pascalToCamel('IdCard')).toBe('idCard')
  })
})

describe('resolveControlBinding', () => {
  it('omits to modelValue + controlKey', () => {
    expect(resolveControlBinding('name')).toEqual({
      models: ['modelValue'],
      paths: ['name'],
    })
  })

  it('path-only keeps default modelValue', () => {
    expect(resolveControlBinding('title', { path: 'name' })).toEqual({
      models: ['modelValue'],
      paths: ['name'],
    })
  })

  it('pairs parallel arrays', () => {
    expect(
      resolveControlBinding('timeRange', {
        model: ['start', 'end'],
        path: ['startTime', 'endTime'],
      }),
    ).toEqual({
      models: ['start', 'end'],
      paths: ['startTime', 'endTime'],
    })
  })

  it('path override does not change model ports', () => {
    expect(
      resolveControlBinding(
        'timeRange',
        { model: ['start', 'end'], path: ['startTime', 'endTime'] },
        ['from', 'to'],
      ),
    ).toEqual({
      models: ['start', 'end'],
      paths: ['from', 'to'],
    })
  })

  it('path override may bind fewer ports', () => {
    expect(
      resolveControlBinding(
        'agency',
        { model: ['modelValue', 'option'], path: ['agencyId', 'agency'] },
        'vendorId',
      ),
    ).toEqual({
      models: ['modelValue', 'option'],
      paths: ['vendorId'],
    })
  })

  it('binds a prefix when path is shorter than model', () => {
    expect(
      resolveControlBinding('name', {
        model: ['modelValue', 'option'],
        path: 'name',
      }),
    ).toEqual({
      models: ['modelValue', 'option'],
      paths: ['name'],
    })
  })

  it('omitted path still binds only the first port', () => {
    expect(resolveControlBinding('name', { model: ['modelValue', 'option'] })).toEqual({
      models: ['modelValue', 'option'],
      paths: ['name'],
    })
  })

  it('throws when path is longer than model', () => {
    expect(() =>
      resolveControlBinding('name', {
        model: 'modelValue',
        path: ['name', 'option'],
      }),
    ).toThrow(/path cannot be longer than model/)
  })
})

describe('applyControlBinding', () => {
  it('reads and writes mapped keys', () => {
    const form = { startTime: 'a', endTime: 'b' }
    const bindings = applyControlBinding(form, {
      models: ['start', 'end'],
      paths: ['startTime', 'endTime'],
    })
    expect(bindings.start).toBe('a')
    expect(bindings.end).toBe('b')
    ;(bindings['onUpdate:start'] as (v: string) => void)('x')
    expect(form.startTime).toBe('x')
  })

  it('does not bind extra model ports', () => {
    const form = { name: 'Ada' }
    const bindings = applyControlBinding(form, {
      models: ['modelValue', 'option'],
      paths: ['name'],
    })
    expect(bindings.modelValue).toBe('Ada')
    expect(bindings.option).toBeUndefined()
    expect(bindings['onUpdate:option']).toBeUndefined()
  })
})

describe('primaryPath', () => {
  it('uses the sole path, otherwise the control key', () => {
    expect(
      primaryPath({ models: ['modelValue'], paths: ['title'] }, 'name'),
    ).toBe('title')
    expect(
      primaryPath(
        { models: ['start', 'end'], paths: ['startTime', 'endTime'] },
        'timeRange',
      ),
    ).toBe('timeRange')
  })
})

describe('createFormControls', () => {
  it('exposes PascalCase components for camelCase control keys', () => {
    const User = createFormControls({
      name: { label: '姓名' },
      timeRange: {
        label: '时间',
        model: ['start', 'end'],
        path: ['startTime', 'endTime'],
      },
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
