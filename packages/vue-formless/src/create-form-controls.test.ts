import { describe, expect, expectTypeOf, it, vi } from 'vitest'
import { createSSRApp, defineComponent, h, type VNode } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { camelToPascal, pascalToCamel } from './case'
import {
  applyControlBinding,
  bindingForPort,
  resolveControlBinding,
  resolveFormItemProp,
} from './control-model'
import { createFormControls } from './create-form-controls'
import { readWidgetFormless } from './fl-config'
import { createFormView, FormView } from './create-form-view'
import { FormViewItem } from './use-form-item'

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
    expect(update).toHaveBeenCalledWith('startTime', 'x')
  })

  it('reads a nested prop location', () => {
    const form = { buyers: [{ name: 'Ada' }] }
    const bindings = applyControlBinding(
      form,
      {
        models: ['modelValue'],
        props: ['buyers[0].name'],
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
  it('uses the sole prop, otherwise control key (Element helper)', () => {
    expect(
      resolveFormItemProp({ models: ['modelValue'], props: ['title'] }, 'name'),
    ).toBe('title')
    expect(
      resolveFormItemProp(
        { models: ['modelValue'], props: ['buyers[0].name'] },
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

describe('readWidgetFormless', () => {
  it('reads model / item / layout from the component static bag', () => {
    expect(
      readWidgetFormless({
        formless: { item: false, layout: false, model: ['start', 'end'] },
      }),
    ).toEqual({ item: false, layout: false, model: ['start', 'end'] })
    expect(readWidgetFormless({})).toEqual({})
  })
})

describe('createFormControls', () => {
  it('exposes PascalCase components for camelCase control keys', () => {
    const User = createFormControls({
      name: {},
      timeRange: {
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
      name: {},
      idCard: {},
    })
    expectTypeOf(User).toHaveProperty('Name')
    expectTypeOf(User).toHaveProperty('IdCard')
  })
})

describe('FormView.Item', () => {
  it('is attached on createFormView and the context-only FormView', () => {
    const Dummy = defineComponent({ setup: () => () => null })
    const View = createFormView({ layout: { Row: Dummy, Col: Dummy } })
    expect(View.Item).toBe(FormViewItem)
    expect(FormView.Item).toBe(FormViewItem)
  })
})

describe('createFormControls props overlay', () => {
  const Dummy = defineComponent({ setup: () => () => null })
  const Passthrough = defineComponent({
    inheritAttrs: false,
    setup(_, { slots }) {
      return () => slots.default?.() ?? null
    },
  })

  async function render(vnode: VNode): Promise<string> {
    return renderToString(createSSRApp({ render: () => vnode }))
  }

  it('merges cluster, control, then tag; functions see label', async () => {
    const seen: Record<string, unknown>[] = []
    const Input = defineComponent({
      inheritAttrs: false,
      setup(_, { attrs }) {
        seen.push({ ...attrs })
        return () => h('input')
      },
    })
    const User = createFormControls(
      {
        name: {
          label: '姓名',
          component: Input,
          props: (fl) => ({
            placeholder: typeof fl.label === 'string' ? `请填写${fl.label}` : undefined,
          }),
        },
        mobile: {
          label: '手机',
          component: Input,
          props: { placeholder: '11 位手机号' },
        },
      },
      { props: { clearable: true } },
    )
    const View = createFormView({
      layout: { Row: Dummy, Col: Dummy },
      item: { component: Passthrough },
    })
    await render(
      h(View, { modelValue: { name: '', mobile: '' } }, () => [
        h(User.Name),
        h(User.Mobile),
        h(User.Name, { placeholder: '姓名' }),
      ]),
    )
    expect(seen).toHaveLength(3)
    expect(seen[0]).toMatchObject({ placeholder: '请填写姓名', clearable: true })
    expect(seen[1]).toMatchObject({ placeholder: '11 位手机号', clearable: true })
    expect(seen[2]).toMatchObject({ placeholder: '姓名', clearable: true })
  })
})
