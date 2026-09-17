import { describe, expect, it, vi } from 'vitest'
import {
  bindingForPort,
  modelBindings,
  resolveControlBinding,
} from './control-binding'

describe('resolveControlBinding', () => {
  it('omits to modelValue + the schema key as location', () => {
    expect(resolveControlBinding('name')).toEqual({
      models: ['modelValue'],
      props: ['name'],
    })
  })

  it('prop-only keeps default modelValue', () => {
    expect(resolveControlBinding('title', { prop: 'name' })).toEqual({
      models: ['modelValue'],
      props: ['name'],
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
    })
  })

  it('prop override can be a nested location', () => {
    expect(
      resolveControlBinding(
        'name',
        { prop: 'name' },
        { prop: 'buyers[0].name' },
      ),
    ).toEqual({
      models: ['modelValue'],
      props: ['buyers[0].name'],
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

  it('throws on empty-string prop', () => {
    expect(() => resolveControlBinding('name', { prop: '' })).toThrow(
      /prop cannot be an empty string/,
    )
    expect(() => resolveControlBinding('name', {}, { prop: '' })).toThrow(
      /fl:prop cannot be an empty string/,
    )
  })
})

describe('modelBindings', () => {
  const pair = {
    models: ['start', 'end'],
    props: ['buyers[0].fromTime', 'buyers[0].toTime'],
  }

  it('pairs each bound prop with its port through the model accessor', () => {
    const bindings = modelBindings(pair, (prop) => ({
      get value() {
        return prop === 'buyers[0].fromTime' ? 'a' : 'b'
      },
      update: vi.fn(),
    }))
    expect(bindings.start).toBe('a')
    expect(bindings.end).toBe('b')
  })

  it('writes by port through the accessor update', () => {
    const update = vi.fn()
    const bindings = modelBindings(pair, () => ({ value: 'x', update }))
    ;(bindings['onUpdate:end'] as (next: unknown) => void)('q')
    expect(update).toHaveBeenCalledWith('q')
  })

  it('leaves unbound ports off when props are shorter than models', () => {
    const short = { models: ['modelValue', 'option'], props: ['name'] }
    const bindings = modelBindings(short, (prop) => ({
      get value() {
        return prop === 'name' ? 'Ada' : undefined
      },
      update: vi.fn(),
    }))
    expect(bindings.modelValue).toBe('Ada')
    expect(bindings).not.toHaveProperty('option')
    expect(bindings).not.toHaveProperty('onUpdate:option')
  })

  it('skips a port whose model accessor returns undefined', () => {
    const bindings = modelBindings(
      { models: ['modelValue'], props: ['name'] },
      () => undefined,
    )
    expect(bindings).toEqual({})
  })
})

describe('bindingForPort', () => {
  const pair = {
    models: ['start', 'end'],
    props: ['buyers[0].fromTime', 'buyers[0].toTime'],
  }

  it('slices one v-model port to its leaf', () => {
    expect(bindingForPort(pair, 'end')).toEqual({
      models: ['end'],
      props: ['buyers[0].toTime'],
    })
  })

  it('throws when the port is missing or unbound', () => {
    expect(() => bindingForPort(pair, 'modelValue')).toThrow(/not a v-model port/)
    expect(() =>
      bindingForPort({ models: ['start', 'end'], props: ['fromTime'] }, 'end'),
    ).toThrow(/not bound/)
  })
})
