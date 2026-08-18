import { describe, expect, expectTypeOf, it, vi } from 'vitest'
import { camelToPascal, pascalToCamel } from './case'
import {
  applyControlBinding,
  resolveControlBinding,
  resolveFormItemProp,
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
  it('omits to modelValue + controlKey prop', () => {
    expect(resolveControlBinding('name')).toEqual({
      models: ['modelValue'],
      props: ['name'],
      path: undefined,
    })
  })

  it('prop-only keeps default modelValue', () => {
    expect(resolveControlBinding('title', { prop: 'name' })).toEqual({
      models: ['modelValue'],
      props: ['name'],
      path: undefined,
    })
  })

  it('pairs parallel prop arrays with model ports', () => {
    expect(
      resolveControlBinding('timeRange', {
        model: ['start', 'end'],
        prop: ['startTime', 'endTime'],
      }),
    ).toEqual({
      models: ['start', 'end'],
      props: ['startTime', 'endTime'],
      path: undefined,
    })
  })

  it('prop override does not change model ports', () => {
    expect(
      resolveControlBinding(
        'timeRange',
        { model: ['start', 'end'], prop: ['startTime', 'endTime'] },
        { prop: ['from', 'to'] },
      ),
    ).toEqual({
      models: ['start', 'end'],
      props: ['from', 'to'],
      path: undefined,
    })
  })

  it('path override sets navigation only', () => {
    expect(
      resolveControlBinding(
        'name',
        { prop: 'name' },
        { path: 'buyers[0]' },
      ),
    ).toEqual({
      models: ['modelValue'],
      props: ['name'],
      path: 'buyers[0]',
    })
  })

  it('prop override may bind fewer ports', () => {
    expect(
      resolveControlBinding(
        'agency',
        { model: ['modelValue', 'option'], prop: ['agencyId', 'agency'] },
        { prop: 'vendorId' },
      ),
    ).toEqual({
      models: ['modelValue', 'option'],
      props: ['vendorId'],
      path: undefined,
    })
  })

  it('binds a prefix when prop is shorter than model', () => {
    expect(
      resolveControlBinding('name', {
        model: ['modelValue', 'option'],
        prop: 'name',
      }),
    ).toEqual({
      models: ['modelValue', 'option'],
      props: ['name'],
      path: undefined,
    })
  })

  it('throws when prop is longer than model', () => {
    expect(() =>
      resolveControlBinding('name', {
        model: 'modelValue',
        prop: ['name', 'option'],
      }),
    ).toThrow(/prop cannot be longer than model/)
  })
})

describe('applyControlBinding', () => {
  it('reads mapped props and reports writes', () => {
    const form = { startTime: 'a', endTime: 'b' }
    const update = vi.fn()
    const bindings = applyControlBinding(
      form,
      {
        models: ['start', 'end'],
        props: ['startTime', 'endTime'],
      },
      update,
    )
    expect(bindings.start).toBe('a')
    expect(bindings.end).toBe('b')
    ;(bindings['onUpdate:start'] as (v: string) => void)('x')
    expect(form.startTime).toBe('a')
    expect(update).toHaveBeenCalledWith('startTime', 'x', undefined)
  })

  it('reads through navigation path', () => {
    const form = { buyers: [{ name: 'Ada' }] }
    const bindings = applyControlBinding(
      form,
      {
        models: ['modelValue'],
        props: ['name'],
        path: 'buyers[0]',
      },
      vi.fn(),
    )
    expect(bindings.modelValue).toBe('Ada')
  })

  it('does not bind extra model ports', () => {
    const form = { name: 'Ada' }
    const bindings = applyControlBinding(
      form,
      {
        models: ['modelValue', 'option'],
        props: ['name'],
      },
      vi.fn(),
    )
    expect(bindings.modelValue).toBe('Ada')
    expect(bindings.option).toBeUndefined()
    expect(bindings['onUpdate:option']).toBeUndefined()
  })
})

describe('resolveFormItemProp', () => {
  it('uses navigation + sole prop, otherwise control key', () => {
    expect(
      resolveFormItemProp({ models: ['modelValue'], props: ['title'] }, 'name'),
    ).toBe('title')
    expect(
      resolveFormItemProp(
        { models: ['modelValue'], props: ['name'], path: 'buyers[0]' },
        'name',
      ),
    ).toBe('buyers.0.name')
    expect(
      resolveFormItemProp(
        { models: ['start', 'end'], props: ['startTime', 'endTime'] },
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
        prop: ['startTime', 'endTime'],
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
