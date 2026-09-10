import { describe, expect, it, vi } from 'vitest'
import { createSSRApp, defineComponent, h, nextTick, type PropType, type VNode } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createFormView } from './create-form-view'
import { FormCell } from './FormCell'
import { useFormContext } from './context'

const Row = defineComponent({
  name: 'DummyRow',
  props: { gutter: { type: Number, default: 0 } },
  setup(props, { slots }) {
    return () => h('row', { gutter: String(props.gutter) }, slots.default?.())
  },
})

const Col = defineComponent({
  name: 'DummyCol',
  props: { span: { type: Number, default: 0 } },
  setup(props, { slots }) {
    return () => h('grid-col', { span: String(props.span) }, slots.default?.())
  },
})

const Item = defineComponent({
  name: 'DummyItem',
  inheritAttrs: false,
  setup(_, { slots }) {
    return () => h('item', slots.default?.())
  },
})

function makeForm(onSetup?: (props: { model?: unknown; fl?: unknown }) => void) {
  return defineComponent({
    name: 'DummyForm',
    inheritAttrs: false,
    props: {
      model: { type: [Object, Array] as PropType<unknown>, default: undefined },
    },
    setup(props, { slots, attrs }) {
      onSetup?.({ model: props.model, fl: attrs.fl })
      return () => h('form', slots.default?.())
    },
  })
}

function View(onForm?: (props: { model?: unknown; fl?: unknown }) => void) {
  return createFormView({
    layout: { Row, Col },
    form: {
      component: makeForm(onForm),
      props: (fl) => ({ model: fl.modelValue }),
    },
    item: { component: Item },
  })
}

function Writer(prop = 'name', value: unknown = 'Bob') {
  return defineComponent({
    setup() {
      useFormContext().update(prop, value)
      return () => null
    },
  })
}

async function render(vnode: VNode): Promise<string> {
  return renderToString(createSSRApp({ render: () => vnode }))
}

describe('createFormView', () => {
  it('warns but still renders at the root when v-model is omitted', async () => {
    const FormView = View()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(render(h(FormView))).resolves.toContain('<form')
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]![0]).toContain('Root FormView has no v-model')
    warn.mockRestore()
    error.mockRestore()
  })

  it('emits a new object from root v-model', async () => {
    const FormView = View()
    const source = { name: 'Ada' }
    const emit = vi.fn()
    await render(
      h(
        FormView,
        { modelValue: source, 'onUpdate:modelValue': emit },
        () => h(Writer()),
      ),
    )
    await nextTick()
    expect(emit).toHaveBeenCalledTimes(1)
    expect(emit.mock.calls[0]![0]).toEqual({ name: 'Bob' })
    expect(emit.mock.calls[0]![0]).not.toBe(source)
  })

  it('writes into a root array v-model and clones on emit', async () => {
    const FormView = View()
    const source = [{ name: 'Ada' }]
    const emit = vi.fn()
    await render(
      h(
        FormView,
        { modelValue: source, 'onUpdate:modelValue': emit },
        () => h(Writer('[0].name', 'Bob')),
      ),
    )
    await nextTick()
    expect(emit).toHaveBeenCalledTimes(1)
    expect(emit.mock.calls[0]![0]).toEqual([{ name: 'Bob' }])
    expect(emit.mock.calls[0]![0]).not.toBe(source)
    expect(source[0]).toEqual({ name: 'Ada' })
  })

  it('merges same-tick nested array writes into one emit', async () => {
    const FormView = View()
    const source = { buyers: [{ name: 'Ada', gender: 'f' }] }
    const emit = vi.fn()
    await render(
      h(
        FormView,
        { modelValue: source, 'onUpdate:modelValue': emit },
        () => h('div', [h(Writer('buyers[0].name', 'Bob')), h(Writer('buyers[0].gender', 'm'))]),
      ),
    )
    await nextTick()
    expect(emit).toHaveBeenCalledTimes(1)
    expect(emit.mock.calls[0]![0]).toEqual({ buyers: [{ name: 'Bob', gender: 'm' }] })
    expect(source.buyers[0]).toEqual({ name: 'Ada', gender: 'f' })
  })

  it('wraps Form at the root by default and skips it for nested auto', async () => {
    const forms: unknown[] = []
    const FormView = View((props) => {
      forms.push(props)
    })
    await render(
      h(FormView, { modelValue: {} }, () =>
        h(FormView, { 'fl:layout': true, 'row:column': 3, 'row:gutter': 16 }, () => h(Writer())),
      ),
    )
    expect(forms).toHaveLength(1)
    expect(forms[0]).toMatchObject({ fl: undefined, model: {} })
  })

  it('still wraps Form when nested :fl:form="true"', async () => {
    const forms: unknown[] = []
    const FormView = View((props) => {
      forms.push(props)
    })
    await render(
      h(FormView, { modelValue: {} }, () =>
        h(FormView, { 'fl:form': true }, () => h(Writer())),
      ),
    )
    expect(forms).toHaveLength(2)
    expect(forms[1]).toMatchObject({ fl: undefined })
  })

  it('does not wrap Form when root :fl:form="false"', async () => {
    const forms: unknown[] = []
    const FormView = View((props) => {
      forms.push(props)
    })
    await render(h(FormView, { modelValue: {}, 'fl:form': false }, () => h(Writer())))
    expect(forms).toHaveLength(0)
  })

  it('inherits ancestor v-model from a nested FormView with no binding', async () => {
    const FormView = View()
    const emit = vi.fn()
    await render(
      h(
        FormView,
        { modelValue: { name: 'Ada' }, 'onUpdate:modelValue': emit },
        () => h(FormView, { 'fl:layout': true, 'row:column': 3 }, () => h(Writer())),
      ),
    )
    await nextTick()
    expect(emit).toHaveBeenCalledTimes(1)
    expect(emit.mock.calls[0]![0]).toEqual({ name: 'Bob' })
  })

  it('renders Row and Col span 8 when column is 3', async () => {
    const FormView = View()
    const html = await render(
      h(FormView, { modelValue: {}, 'fl:layout': true, 'row:column': 3, 'row:gutter': 12 }, () =>
        h(FormCell, { 'fl:prop': 'name' }),
      ),
    )
    expect(html).toContain('gutter="12"')
    expect(html).toContain('span="8"')
    expect(html).toContain('<row')
    expect(html).toContain('<grid-col')
  })

  it('does not render Row or Col when layout is off', async () => {
    const FormView = View()
    const html = await render(
      h(FormView, { modelValue: {} }, () => h(FormCell, { 'fl:prop': 'name' })),
    )
    expect(html).not.toContain('<row')
    expect(html).not.toContain('<grid-col')
  })

  it('nests layout only on the inner FormView', async () => {
    const FormView = View()
    const html = await render(
      h(FormView, { modelValue: {} }, () =>
        h(FormView, { 'fl:layout': true, 'row:column': 3, 'row:gutter': 16 }, () =>
          h(FormCell, { 'fl:prop': 'name' }),
        ),
      ),
    )
    expect(html.match(/<row/g)).toHaveLength(1)
    expect(html).toContain('span="8"')
  })

  it('treats incoming modelValue: undefined as this layer', async () => {
    const FormView = View()
    const innerEmit = vi.fn()
    const outerEmit = vi.fn()
    await render(
      h(
        FormView,
        { modelValue: { name: 'Ada' }, 'onUpdate:modelValue': outerEmit },
        () =>
          h(
            FormView,
            { modelValue: undefined, 'onUpdate:modelValue': innerEmit },
            () => h(Writer()),
          ),
      ),
    )
    await nextTick()
    expect(outerEmit).not.toHaveBeenCalled()
    expect(innerEmit).toHaveBeenCalledTimes(1)
    expect(innerEmit.mock.calls[0]![0]).toEqual({ name: 'Bob' })
  })

  it('treats listener-only as this layer and emits from {}', async () => {
    const FormView = View()
    const emit = vi.fn()
    await render(h(FormView, { 'onUpdate:modelValue': emit }, () => h(Writer())))
    await nextTick()
    expect(emit).toHaveBeenCalledTimes(1)
    expect(emit.mock.calls[0]![0]).toEqual({ name: 'Bob' })
  })

  it('maps form.props from fl.modelValue and lets tag attrs overlay', async () => {
    const seen: unknown[] = []
    const Form = defineComponent({
      inheritAttrs: false,
      props: {
        model: { type: [Object, Array] as PropType<unknown>, default: undefined },
        labelWidth: { type: String, default: undefined },
        extra: { type: String, default: undefined },
      },
      setup(props, { slots }) {
        seen.push({ model: props.model, labelWidth: props.labelWidth, extra: props.extra })
        return () => h('form', slots.default?.())
      },
    })
    const FormView = createFormView({
      layout: { Row, Col },
      form: {
        component: Form,
        props: (fl) => ({ model: fl.modelValue, extra: 'from-fl', labelWidth: '80px' }),
      },
    })
    await render(
      h(FormView, { modelValue: { name: 'Ada' }, labelWidth: '96px' }, () => h(Writer())),
    )
    expect(seen).toHaveLength(1)
    expect(seen[0]).toEqual({ model: { name: 'Ada' }, labelWidth: '96px', extra: 'from-fl' })
  })

  it('lets an explicit :model overlay form.props', async () => {
    const seen: unknown[] = []
    const Form = defineComponent({
      inheritAttrs: false,
      props: {
        model: { type: [Object, Array] as PropType<unknown>, default: undefined },
      },
      setup(props, { slots }) {
        seen.push(props.model)
        return () => h('form', slots.default?.())
      },
    })
    const FormView = createFormView({
      layout: { Row, Col },
      form: {
        component: Form,
        props: (fl) => ({ model: fl.modelValue }),
      },
    })
    const a = { name: 'Ada' }
    const b = { name: 'Bob' }
    await render(h(FormView, { modelValue: a, model: b }, () => h(Writer())))
    expect(seen).toEqual([b])
  })

  it('uses column 1 when factory omits column', async () => {
    const FormView = View()
    const html = await render(
      h(FormView, { modelValue: {}, 'fl:layout': true }, () =>
        h(FormCell, { 'fl:prop': 'name' }),
      ),
    )
    expect(html).toContain('span="24"')
  })

  it('lets factory density set default span', async () => {
    const FormView = createFormView({
      layout: { Row, Col, column: 3 },
      item: { component: Item },
    })
    const html = await render(
      h(FormView, { modelValue: {}, 'fl:layout': true, 'row:gutter': 16 }, () =>
        h(FormCell, { 'fl:prop': 'name' }),
      ),
    )
    expect(html).toContain('gutter="16"')
    expect(html).toContain('span="8"')
  })
})

const LabeledItem = defineComponent({
  name: 'LabeledItem',
  inheritAttrs: false,
  props: { label: { type: String, default: '' } },
  setup(props, { slots }) {
    return () => h('item', { 'data-label': props.label }, slots.default?.())
  },
})

describe('FormCell', () => {
  it('is a standalone export (not attached on FormView)', () => {
    const View = createFormView({ layout: { Row, Col } })
    expect(FormCell).toBeTruthy()
    expect((View as { Cell?: unknown }).Cell).toBeUndefined()
  })

  it('wraps the host Item when bound', async () => {
    const FormView = createFormView({
      layout: { Row, Col },
      item: { component: LabeledItem, props: (fl) => ({ label: fl.fieldKey }) },
    })
    const Cell = defineComponent({
      setup() {
        return () => h(FormCell, { 'fl:prop': 'name' }, { default: () => 'x' })
      },
    })
    const html = await render(
      h(FormView, { modelValue: {}, 'fl:layout': true }, () => h(Cell)),
    )
    expect(html).toContain('<grid-col')
    expect(html).toContain('<item')
    expect(html).toContain('data-label="name"')
    expect(html).toContain('x')
  })

  it('drops Item when fl:item is false but keeps Col', async () => {
    const FormView = createFormView({
      layout: { Row, Col },
      item: { component: LabeledItem },
    })
    const Cell = defineComponent({
      setup() {
        return () =>
          h(FormCell, { 'fl:prop': 'name', 'fl:item': false }, { default: () => 'x' })
      },
    })
    const html = await render(
      h(FormView, { modelValue: {}, 'fl:layout': true }, () => h(Cell)),
    )
    expect(html).toContain('<grid-col')
    expect(html).not.toContain('<item')
    expect(html).toContain('x')
  })

  it('never wraps Item when the factory omitted item.component', async () => {
    const FormView = createFormView({ layout: { Row, Col } })
    const Cell = defineComponent({
      setup() {
        return () =>
          h(FormCell, { 'fl:prop': 'name', label: '姓名' }, { default: () => 'x' })
      },
    })
    const html = await render(
      h(FormView, { modelValue: {}, 'fl:layout': true }, () => h(Cell)),
    )
    expect(html).toContain('<grid-col')
    expect(html).not.toContain('<item')
    expect(html).toContain('x')
  })

  it('lets fl:prop drive the field slot write', async () => {
    const emit = vi.fn()
    const FormView = createFormView({ layout: { Row, Col }, item: { component: Item } })
    const Probe = defineComponent({
      setup() {
        return () =>
          h(FormCell, { 'fl:prop': 'name' }, {
            default: (slot: { field: { modelValue: unknown; 'onUpdate:modelValue': (n: unknown) => void } }) => {
              slot.field['onUpdate:modelValue']('Zed')
              return h('span', String(slot.field.modelValue ?? ''))
            },
          })
      },
    })
    await render(
      h(FormView, { modelValue: { name: 'Ada' }, 'onUpdate:modelValue': emit }, () => h(Probe)),
    )
    await nextTick()
    expect(emit).toHaveBeenCalledTimes(1)
    expect(emit.mock.calls[0]![0]).toEqual({ name: 'Zed' })
  })
})
