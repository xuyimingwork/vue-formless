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
import { createFormControls, type ComponentPublicProps } from './create-form-controls'
import { readWidgetFormless } from './fl-config'
import { createFormView, FormView } from './create-form-view'
import { FormViewItem, useFormItem } from './use-form-item'

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
  it('reads model / item from the component static bag', () => {
    expect(
      readWidgetFormless({
        formless: { item: false, model: ['start', 'end'] },
      }),
    ).toEqual({ item: false, model: ['start', 'end'] })
    expect(
      readWidgetFormless({
        formless: { item: 'self', model: ['start', 'end'] },
      }),
    ).toEqual({ item: 'self', model: ['start', 'end'] })
    expect(
      readWidgetFormless({
        formless: { item: 'self', layout: false, model: ['start', 'end'] },
      }),
    ).toEqual({ item: 'self', model: ['start', 'end'] })
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

  it('forwards widget public props onto the namespaced tag', () => {
    const Input = defineComponent({
      props: {
        placeholder: { type: String, default: '' },
        rows: { type: Number, default: 2 },
        modelValue: { type: String, default: '' },
      },
      setup: () => () => null,
    })
    const User = createFormControls({
      remark: { component: Input },
    })
    type RemarkProps = ComponentPublicProps<typeof User.Remark>
    expectTypeOf<RemarkProps>().toHaveProperty('placeholder')
    expectTypeOf<RemarkProps>().toHaveProperty('rows')
    expectTypeOf<RemarkProps>().toHaveProperty('col:span')
    expectTypeOf<RemarkProps>().not.toHaveProperty('modelValue')
    expectTypeOf<RemarkProps>().not.toHaveProperty('onUpdate:modelValue')
  })

  it('locks schema model ports on the tag', () => {
    const Range = defineComponent({
      props: {
        start: { type: String, default: '' },
        end: { type: String, default: '' },
        format: { type: String, default: '' },
      },
      setup: () => () => null,
    })
    const Fields = createFormControls({
      time: { component: Range, model: ['start', 'end'] },
    })
    type TimeProps = ComponentPublicProps<typeof Fields.Time>
    expectTypeOf<TimeProps>().toHaveProperty('format')
    expectTypeOf<TimeProps>().not.toHaveProperty('start')
    expectTypeOf<TimeProps>().not.toHaveProperty('end')
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
  const DummyRow = defineComponent({
    props: { gutter: Number },
    setup: (p, { slots }) => () =>
      h('div', { class: 'row', 'data-gutter': String(p.gutter ?? '') }, slots.default?.()),
  })
  const DummyCol = defineComponent({
    props: { span: Number },
    setup: (p, { slots }) => () =>
      h('div', { class: 'col', 'data-span': String(p.span ?? '') }, slots.default?.()),
  })
  const DummyItem = defineComponent({
    inheritAttrs: false,
    props: { label: { type: String, default: '' } },
    setup: (p, { slots }) => () =>
      h('div', { class: 'item', 'data-label': p.label }, slots.default?.()),
  })
  const Two = defineComponent({
    formless: { item: 'self' as const, model: ['start', 'end'] },
    props: {
      start: { default: undefined },
      end: { default: undefined },
    },
    setup() {
      const Start = useFormItem('start')
      const End = useFormItem('end')
      return () => [
        h(Start, { label: '开始' }, () => h('input', { class: 's' })),
        h(End, { label: '结束' }, () => h('input', { class: 'e' })),
      ]
    },
  })

  async function render(vnode: VNode): Promise<string> {
    return renderToString(createSSRApp({ render: () => vnode }))
  }

  function shellView() {
    return createFormView({
      layout: { Row: DummyRow, Col: DummyCol },
      item: { component: DummyItem, props: (fl) => ({ label: fl.label }) },
    })
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

  it('throws when widget self conflicts with schema item false', () => {
    const Two = defineComponent({
      formless: { item: 'self' },
      setup: () => () => null,
    })
    expect(() =>
      createFormControls({
        range: { component: Two, item: false },
      }),
    ).toThrow(/conflicts/)
  })

  it('does not wrap a self widget in an outer Item', async () => {
    const Fields = createFormControls({
      range: { component: Two, prop: ['fromTime', 'toTime'] },
    })
    const html = await render(
      h(
        shellView(),
        { modelValue: { fromTime: '', toTime: '' }, 'fl:layout': true },
        () => h(Fields.Range),
      ),
    )
    expect(html.match(/class="item"/g)?.length).toBe(2)
    expect(html).toContain('data-label="开始"')
    expect(html).toContain('data-label="结束"')
    expect(html).toContain('class="s"')
    expect(html).toContain('class="e"')
  })

  it('wraps self plus explicit fl:item in Col-Item-Row', async () => {
    const Fields = createFormControls({
      range: { label: '签证', component: Two, prop: ['fromTime', 'toTime'] },
    })
    const html = await render(
      h(
        shellView(),
        { modelValue: { fromTime: '', toTime: '' }, 'fl:layout': true },
        () => h(Fields.Range, { 'fl:item': true, 'col:span': 24 }),
      ),
    )
    expect(html.match(/class="item"/g)?.length).toBe(3)
    expect(html).toContain('data-label="签证"')
    expect(html).toContain('data-gutter="0"')
    expect(html).toContain('data-span="24"')
  })

  it('skips Item for internal false but keeps Col', async () => {
    const Input = defineComponent({
      inheritAttrs: false,
      setup: () => () => h('input', { class: 'agency' }),
    })
    const Fields = createFormControls({
      list: { component: Input, item: false },
    })
    const html = await render(
      h(
        shellView(),
        { modelValue: { list: '' }, 'fl:layout': true },
        () => h(Fields.List),
      ),
    )
    expect(html).toContain('class="col"')
    expect(html).not.toContain('class="item"')
    expect(html).toContain('class="agency"')
  })

  it('lets the tag wrap Item over internal false', async () => {
    const Input = defineComponent({
      inheritAttrs: false,
      setup: () => () => h('input', { class: 'agency' }),
    })
    const Fields = createFormControls({
      list: { label: '机构', component: Input, item: false },
    })
    const html = await render(
      h(
        shellView(),
        { modelValue: { list: '' }, 'fl:layout': true },
        () => h(Fields.List, { 'fl:item': true }),
      ),
    )
    expect(html).toContain('class="item"')
    expect(html).toContain('data-label="机构"')
    expect(html).toContain('class="col"')
  })

  it('wraps only outer Item when self plus fl:item and layout is off', async () => {
    const Fields = createFormControls({
      range: { label: '签证', component: Two, prop: ['fromTime', 'toTime'] },
    })
    const html = await render(
      h(
        shellView(),
        { modelValue: { fromTime: '', toTime: '' } },
        () => h(Fields.Range, { 'fl:item': true }),
      ),
    )
    expect(html.match(/class="item"/g)?.length).toBe(3)
    expect(html).toContain('data-label="签证"')
    expect(html).not.toContain('class="col"')
    expect(html).not.toContain('data-gutter')
  })

  it('uses control :row:column for the inner LayoutView', async () => {
    const Fields = createFormControls({
      range: { label: '签证', component: Two, prop: ['fromTime', 'toTime'] },
    })
    const html = await render(
      h(
        shellView(),
        { modelValue: { fromTime: '', toTime: '' }, 'fl:layout': true, 'row:column': 3 },
        () => h(Fields.Range, { 'fl:item': true, 'row:column': 2 }),
      ),
    )
    expect(html).toContain('data-gutter="0"')
    const spans = [...html.matchAll(/data-span="(\d+)"/g)].map((m) => m[1])
    expect(spans).toContain('8')
    expect(spans.filter((s) => s === '12')).toHaveLength(2)
  })

  it('does not inherit the page :row:column onto an extra row', async () => {
    const Fields = createFormControls({
      range: { label: '签证', component: Two, prop: ['fromTime', 'toTime'] },
    })
    const html = await render(
      h(
        shellView(),
        { modelValue: { fromTime: '', toTime: '' }, 'fl:layout': true, 'row:column': 3 },
        () => h(Fields.Range, { 'fl:item': true }),
      ),
    )
    const spans = [...html.matchAll(/data-span="(\d+)"/g)].map((m) => m[1])
    expect(spans).toContain('8')
    expect(spans.filter((s) => s === '24')).toHaveLength(2)
    expect(spans).not.toContain('12')
  })
})
