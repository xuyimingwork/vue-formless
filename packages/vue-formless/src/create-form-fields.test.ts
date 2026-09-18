import { describe, expect, expectTypeOf, it, vi } from 'vitest'
import { createSSRApp, defineComponent, h, nextTick, type VNode } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createFormFields, type ComponentPublicProps } from './create-form-fields'
import { createFormView } from './create-form-view'
import { FormField, FormFieldCore } from './FormField'
import type { ItemFl } from './field-schema'

describe('createFormFields', () => {
  it('exposes PascalCase components for camelCase field keys', () => {
    const User = createFormFields({
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
    const User = createFormFields({
      name: {},
      idCard: {},
    })
    expectTypeOf(User).toHaveProperty('Name')
    expectTypeOf(User).toHaveProperty('IdCard')
  })

  it('forwards control public props onto the namespaced tag', () => {
    const Control = defineComponent({
      props: {
        placeholder: { type: String, default: '' },
        rows: { type: Number, default: 2 },
        modelValue: { type: String, default: '' },
      },
      setup: () => () => null,
    })
    const User = createFormFields({
      remark: { component: Control },
    })
    type RemarkProps = ComponentPublicProps<typeof User.Remark>
    expectTypeOf<RemarkProps>().toHaveProperty('placeholder')
    expectTypeOf<RemarkProps>().toHaveProperty('rows')
    expectTypeOf<RemarkProps>().toHaveProperty('layout-item:span')
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
    const Fields = createFormFields({
      time: { component: Range, model: ['start', 'end'] },
    })
    type TimeProps = ComponentPublicProps<typeof Fields.Time>
    expectTypeOf<TimeProps>().toHaveProperty('format')
    expectTypeOf<TimeProps>().not.toHaveProperty('start')
    expectTypeOf<TimeProps>().not.toHaveProperty('end')
  })
})

describe('FormField', () => {
  it('is exported as a standalone field (not FormView.Field)', () => {
    expect(FormField).toBeTruthy()
    expect(FormField.name).toBe('FormField')
  })
})

describe('createFormFields props overlay', () => {
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
    formless: { field: 'embed' as const, model: ['start', 'end'] },
    props: {
      start: { default: undefined },
      end: { default: undefined },
    },
    setup() {
      return () => [
        h(FormField, { 'fl:model': 'start', 'fl:label': '开始' }, () => h('input', { class: 's' })),
        h(FormField, { 'fl:model': 'end', 'fl:label': '结束' }, () => h('input', { class: 'e' })),
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

  it('merges field then tag; functions see label', async () => {
    const seen: Record<string, unknown>[] = []
    const Control = defineComponent({
      inheritAttrs: false,
      setup(_, { attrs }) {
        seen.push({ ...attrs })
        return () => h('input')
      },
    })
    const User = createFormFields({
      name: {
        label: '姓名',
        component: Control,
        props: (fl) => ({
          placeholder: typeof fl.label === 'string' ? `请填写${fl.label}` : undefined,
        }),
      },
      mobile: {
        label: '手机',
        component: Control,
        props: { placeholder: '11 位手机号' },
      },
    })
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
    expect(seen[0]).toMatchObject({ placeholder: '请填写姓名' })
    expect(seen[1]).toMatchObject({ placeholder: '11 位手机号' })
    expect(seen[2]).toMatchObject({ placeholder: '姓名' })
  })

  it('does not wrap an embed control in an outer Item', async () => {
    const Fields = createFormFields({
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

  it('wraps wrap-embed in Col-Item-Row', async () => {
    const Fields = createFormFields({
      range: { label: '签证', component: Two, prop: ['fromTime', 'toTime'] },
    })
    const html = await render(
      h(
        shellView(),
        { modelValue: { fromTime: '', toTime: '' }, 'fl:layout': true },
        () => h(Fields.Range, { 'fl:field': 'wrap-embed', 'layout-item:span': 24 }),
      ),
    )
    expect(html.match(/class="item"/g)?.length).toBe(3)
    expect(html).toContain('data-label="签证"')
    expect(html).toContain('class="row"')
    expect(html).toContain('data-span="24"')
  })

  it('skips Item for internal false but keeps Col', async () => {
    const Control = defineComponent({
      inheritAttrs: false,
      setup: () => () => h('input', { class: 'agency' }),
    })
    const Fields = createFormFields({
      list: { component: Control, item: false },
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
    const Control = defineComponent({
      inheritAttrs: false,
      setup: () => () => h('input', { class: 'agency' }),
    })
    const Fields = createFormFields({
      list: { label: '机构', component: Control, item: false },
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

  it('keeps an inner Row when wrap-embed and page layout is off', async () => {
    const Fields = createFormFields({
      range: { label: '签证', component: Two, prop: ['fromTime', 'toTime'] },
    })
    const html = await render(
      h(
        shellView(),
        { modelValue: { fromTime: '', toTime: '' } },
        () => h(Fields.Range, { 'fl:field': 'wrap-embed' }),
      ),
    )
    expect(html.match(/class="item"/g)?.length).toBe(3)
    expect(html).toContain('data-label="签证"')
    expect(html).toContain('class="row"')
    // Outer FormField has no Col (page LayoutView disabled); inner fields still Col.
    expect(html.match(/class="col"/g)?.length).toBe(2)
  })

  it('declares the schema v-model ports on the identity root', async () => {
    const emit = vi.fn()
    const seen: Record<string, unknown>[] = []
    const TwoPorts = defineComponent({
      formless: { model: ['start', 'end'] as const },
      inheritAttrs: false,
      setup(_, { attrs }) {
        seen.push({ ...attrs })
        return () => h('div', { class: 'two' })
      },
    })
    const Fields = createFormFields({
      range: { component: TwoPorts, prop: ['fromTime', 'toTime'] },
    })
    await render(
      h(
        shellView(),
        { modelValue: { fromTime: 'a', toTime: 'b' }, 'onUpdate:modelValue': emit },
        () => h(Fields.Range),
      ),
    )
    expect(seen).toHaveLength(1)
    expect(seen[0]).toMatchObject({ start: 'a', end: 'b' })
    ;(seen[0]!['onUpdate:end'] as (next: unknown) => void)('z')
    await nextTick()
    expect(emit).toHaveBeenCalledTimes(1)
    expect(emit.mock.calls[0]![0]).toEqual({ fromTime: 'a', toTime: 'z' })
  })

  it('renders exactly like a FormField preset with the same attrs', async () => {
    const Control = defineComponent({
      inheritAttrs: false,
      props: { placeholder: { type: String, default: '' } },
      setup: (p) => () => h('input', { class: 'w', 'data-ph': p.placeholder }),
    })
    const Fields = createFormFields({
      name: {
        label: '姓名',
        component: Control,
        props: { placeholder: '请填写姓名' },
      },
    })
    const schemaAttrs = {
      'fl:component': Control,
      'fl:prop': 'name',
      'fl:label': '姓名',
      placeholder: '请填写姓名',
    }
    const fromFactory = await render(
      h(shellView(), { modelValue: { name: '' }, 'fl:layout': true }, () =>
        h(Fields.Name),
      ),
    )
    const handWritten = await render(
      h(shellView(), { modelValue: { name: '' }, 'fl:layout': true }, () =>
        h(FormField, schemaAttrs),
      ),
    )
    expect(fromFactory).toBe(handWritten)
  })

  it('resolves snapshot-dependent props into bare attrs', async () => {
    const seen: Record<string, unknown>[] = []
    const Control = defineComponent({
      inheritAttrs: false,
      setup(_, { attrs }) {
        seen.push({ ...attrs })
        return () => h('input')
      },
    })
    const Fields = createFormFields({
      name: {
        label: '姓名',
        component: Control,
        props: (fl) => ({
          placeholder: `请填写${String(fl.label)}`,
          // The tag's :fl:prop relocation must reach the props snapshot.
          located: fl.prop[0],
        }),
      },
    })
    await render(
      h(shellView(), { modelValue: { buyers: [{ name: '' }] } }, () => [
        h(Fields.Name),
        h(Fields.Name, { 'fl:prop': 'buyers[0].name' }),
      ]),
    )
    expect(seen[0]).toMatchObject({
      placeholder: '请填写姓名',
      located: 'name',
    })
    expect(seen[1]).toMatchObject({ located: 'buyers[0].name' })
  })

  it('leaves a multi-port field unbound on the host Item', async () => {
    const props: Record<string, unknown>[] = []
    const Control = defineComponent({
      inheritAttrs: false,
      setup: () => () => h('input', { class: 'w' }),
    })
    const Fields = createFormFields({
      timeRange: {
        component: Control,
        model: ['start', 'end'],
        prop: ['fromTime', 'toTime'],
      },
    })
    // The adapter has no name to fall back on, so it must not bind the host
    // Item: several locations cannot become one host `prop` (design.md §20.9).
    const view = createFormView({
      layout: { Row: DummyRow, Col: DummyCol },
      item: {
        component: DummyItem,
        props: (fl) => {
          props.push({ ...fl })
          return {
            label: '区间',
            prop: fl.prop.length === 1 ? fl.prop[0] : undefined,
          }
        },
      },
    })
    const html = await render(
      h(view, { modelValue: { fromTime: '', toTime: '' }, 'fl:layout': true }, () =>
        h(Fields.TimeRange),
      ),
    )
    expect(props[0]!.model).toEqual(['start', 'end'])
    expect(props[0]!.prop).toEqual(['fromTime', 'toTime'])
    expect(props[0]).not.toHaveProperty('binding')
    expect(props[0]).not.toHaveProperty('fieldKey')
    // Item still renders (label/decoration), it is just not form-bound.
    expect(html).toContain('data-label="区间"')
  })

  it('lets the tag fl:field win over the schema and ignores an invalid one', async () => {
    const Control = defineComponent({
      inheritAttrs: false,
      setup: () => () => h('input', { class: 'w' }),
    })
    const Fields = createFormFields({
      range: { label: '区间', component: Control, field: 'embed' },
    })
    const view = () => shellView()
    const embedded = await render(
      h(view(), { modelValue: { range: '' }, 'fl:layout': true }, () => h(Fields.Range)),
    )
    expect(embedded).not.toContain('class="item"')

    const overridden = await render(
      h(view(), { modelValue: { range: '' }, 'fl:layout': true }, () =>
        h(Fields.Range, { 'fl:field': 'wrap' }),
      ),
    )
    expect(overridden).toContain('class="item"')

    const invalid = await render(
      h(view(), { modelValue: { range: '' }, 'fl:layout': true }, () =>
        h(Fields.Range, { 'fl:field': 'nope' as never }),
      ),
    )
    expect(invalid).not.toContain('class="item"')
  })

  it('scopes a nested slice to its own port through the ancestor layer', async () => {
    const emit = vi.fn()
    const bags: Record<string, unknown>[] = []
    const Pair = defineComponent({
      formless: { field: 'embed' as const, model: ['start', 'end'] },
      inheritAttrs: false,
      setup() {
        return () => [
          h(FormField, { 'fl:model': 'start' }, (sp: { $bindings: Record<string, unknown> }) => {
            bags.push(sp.$bindings)
            return h('input', { class: 's' })
          }),
          h(FormField, { 'fl:model': 'end' }, (sp: { $bindings: Record<string, unknown> }) => {
            bags.push(sp.$bindings)
            return h('input', { class: 'e' })
          }),
        ]
      },
    })
    const Fields = createFormFields({
      dateRange: { label: '签证日期', component: Pair, model: ['start', 'end'], prop: ['fromTime', 'toTime'] },
    })
    await render(
      h(
        shellView(),
        {
          modelValue: { fromTime: 'a', toTime: 'b' },
          'onUpdate:modelValue': emit,
        },
        () => h(Fields.DateRange),
      ),
    )
    // Each slice sees only its own port; two ports in one field stay separate.
    expect(bags[0]).toMatchObject({ start: 'a' })
    expect(bags[0]).not.toHaveProperty('end')
    expect(bags[1]).toMatchObject({ end: 'b' })
    expect(bags[1]).not.toHaveProperty('start')

    // The slice writes its own location without ever naming it.
    ;(bags[1]!['onUpdate:end'] as (next: unknown) => void)('z')
    await nextTick()
    expect(emit).toHaveBeenCalledTimes(1)
    expect(emit.mock.calls[0]![0]).toEqual({ fromTime: 'a', toTime: 'z' })
  })

  it('uses field :layout:column for the inner LayoutView', async () => {
    const Fields = createFormFields({
      range: { label: '签证', component: Two, prop: ['fromTime', 'toTime'] },
    })
    const html = await render(
      h(
        shellView(),
        { modelValue: { fromTime: '', toTime: '' }, 'fl:layout': true, 'layout:column': 3 },
        () => h(Fields.Range, { 'fl:field': 'wrap-embed', 'layout:column': 2 }),
      ),
    )
    expect(html).toContain('class="row"')
    const spans = [...html.matchAll(/data-span="(\d+)"/g)].map((m) => m[1])
    expect(spans).toContain('8')
    expect(spans.filter((s) => s === '12')).toHaveLength(2)
  })

  it('inner LayoutView uses its own default density, not the page :layout:column', async () => {
    const Fields = createFormFields({
      range: { label: '签证', component: Two, prop: ['fromTime', 'toTime'] },
    })
    const html = await render(
      h(
        shellView(),
        { modelValue: { fromTime: '', toTime: '' }, 'fl:layout': true, 'layout:column': 3 },
        () => h(Fields.Range, { 'fl:field': 'wrap-embed' }),
      ),
    )
    const spans = [...html.matchAll(/data-span="(\d+)"/g)].map((m) => m[1])
    expect(spans).toContain('8')
    expect(spans.filter((s) => s === '24')).toHaveLength(2)
    expect(spans).not.toContain('12')
  })

  it('renders FormFieldCore from channel buckets, evaluating a control function', async () => {
    const snapshots: ItemFl[] = []
    const seen: Record<string, unknown>[] = []
    const Probe = defineComponent({
      inheritAttrs: false,
      setup(_, { attrs }) {
        seen.push({ ...attrs })
        return () => h('input', { class: 'probe' })
      },
    })

    const html = await render(
      h(shellView(), { modelValue: { name: 'bob' } }, () =>
        h(FormFieldCore, {
          fl: { component: Probe, prop: 'name', model: 'modelValue', label: '姓名' },
          layoutItem: {},
          layout: {},
          item: {},
          control: (fl: ItemFl) => {
            snapshots.push(fl)
            // The binding the core lays over this must win on the same name (§5.2).
            return { modelValue: 'nope', 'data-prop': fl.prop[0], 'data-label': fl.label }
          },
        }),
      ),
    )

    // The control function sees the core's own snapshot, identity included.
    expect(snapshots).toHaveLength(1)
    expect(snapshots[0]).toMatchObject({
      model: ['modelValue'],
      prop: ['name'],
      label: '姓名',
    })
    expect(snapshots[0]!.getValues()).toEqual(['bob'])

    // Its return value lands on the control, under the v-model binding.
    expect(html).toContain('class="probe"')
    expect(seen[0]).toMatchObject({
      modelValue: 'bob',
      'data-prop': 'name',
      'data-label': '姓名',
    })
    expect(seen[0]!['onUpdate:modelValue']).toBeTypeOf('function')
  })
})
