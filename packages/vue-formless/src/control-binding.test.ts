import { describe, expect, it, vi } from 'vitest'
import {
  bindingForPort,
  createFieldLayer,
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

describe('FieldLayer', () => {
  const pair = {
    models: ['start', 'end'],
    props: ['buyers[0].fromTime', 'buyers[0].toTime'],
  }

  it('reads values lazily from the live model', () => {
    let model: unknown = { buyers: [{ fromTime: 'a', toTime: 'b' }] }
    const layer = createFieldLayer(() => pair, () => model, vi.fn())
    expect(layer.getValues()).toEqual(['a', 'b'])
    model = { buyers: [{ fromTime: 'z', toTime: 'b' }] }
    expect(layer.getValues()).toEqual(['z', 'b'])
  })

  it('writes by port, resolving the location inside', () => {
    const update = vi.fn()
    const layer = createFieldLayer(
      () => pair,
      () => ({ buyers: [{ fromTime: 'a', toTime: 'b' }] }),
      update,
    )
    layer.setValue('end', 'q')
    expect(update).toHaveBeenCalledWith('buyers[0].toTime', 'q')
    expect(() => layer.setValue('modelValue', 'q')).toThrow(/not a v-model port/)
    expect(() => layer.setValue('start', 'q')).not.toThrow()
  })

  it('builds v-model props and handlers off the layer', () => {
    const layer = createFieldLayer(
      () => ({ models: ['modelValue', 'option'], props: ['name'] }),
      () => ({ name: 'Ada' }),
      vi.fn(),
    )
    const bindings = modelBindings(layer)
    expect(bindings.modelValue).toBe('Ada')
    expect(bindings.option).toBeUndefined()
    expect(bindings['onUpdate:option']).toBeUndefined()
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
