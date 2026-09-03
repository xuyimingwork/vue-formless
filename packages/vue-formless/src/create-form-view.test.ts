import { describe, expect, it, vi } from 'vitest'
import { createSSRApp, defineComponent, h, nextTick, type PropType, type VNode } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createFormView } from './create-form-view'
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
    return () => h('col', { span: String(props.span) }, slots.default?.())
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
  it('throws at the root when v-model is omitted', async () => {
    const FormView = View()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(render(h(FormView))).rejects.toThrow(/requires v-model/)
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
        h(FormView.Item, { 'fl:prop': 'name' }),
      ),
    )
    expect(html).toContain('gutter="12"')
    expect(html).toContain('span="8"')
    expect(html).toContain('<row')
    expect(html).toContain('<col')
  })

  it('does not render Row or Col when layout is off', async () => {
    const FormView = View()
    const html = await render(
      h(FormView, { modelValue: {} }, () => h(FormView.Item, { 'fl:prop': 'name' })),
    )
    expect(html).not.toContain('<row')
    expect(html).not.toContain('<col')
  })

  it('nests layout only on the inner FormView', async () => {
    const FormView = View()
    const html = await render(
      h(FormView, { modelValue: {} }, () =>
        h(FormView, { 'fl:layout': true, 'row:column': 3, 'row:gutter': 16 }, () =>
          h(FormView.Item, { 'fl:prop': 'name' }),
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
        h(FormView.Item, { 'fl:prop': 'name' }),
      ),
    )
    expect(html).toContain('span="24"')
  })

  it('lets factory density set default span', async () => {
    const FormView = createFormView({
      layout: { Row, Col, column: 3, gutter: 16 },
      item: { component: Item },
    })
    const html = await render(
      h(FormView, { modelValue: {}, 'fl:layout': true }, () =>
        h(FormView.Item, { 'fl:prop': 'name' }),
      ),
    )
    expect(html).toContain('gutter="16"')
    expect(html).toContain('span="8"')
  })

  it('throws when fl:layout is an object', async () => {
    const FormView = View()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(
      render(
        h(FormView, { modelValue: {}, 'fl:layout': { column: 3 } as never }, () =>
          h(FormView.Item, { 'fl:prop': 'name' }),
        ),
      ),
    ).rejects.toThrow(/boolean only/)
    warn.mockRestore()
    error.mockRestore()
  })
})
