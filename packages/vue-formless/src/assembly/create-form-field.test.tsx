import { describe, expect, it, vi } from 'vitest'
import { createSSRApp, defineComponent, h, nextTick, type PropType, type VNode } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createFormView } from './create-form-view'
import { FormField } from './create-form-field'

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

/**
 * Host Form shim. ElForm names its model port `model`, so the adapter wraps it
 * and declares `modelValue` — the formless write model reaches the host as the
 * bare `modelValue` attr (no-prefix rule, design.md §10.1).
 */
function makeForm(onSetup?: (props: { modelValue?: unknown }) => void) {
  return defineComponent({
    name: 'DummyForm',
    inheritAttrs: false,
    props: {
      modelValue: { type: [Object, Array] as PropType<unknown>, default: undefined },
    },
    setup(props, { slots }) {
      onSetup?.({ modelValue: props.modelValue })
      return () => h('form', slots.default?.())
    },
  })
}

function View(onForm?: (props: { modelValue?: unknown }) => void) {
  return createFormView({
    layout: { Row, Col },
    form: { component: makeForm(onForm) },
    item: { component: Item },
  })
}

async function render(vnode: VNode): Promise<string> {
  return renderToString(createSSRApp({ render: () => vnode }))
}

const LabeledItem = defineComponent({
  name: 'LabeledItem',
  inheritAttrs: false,
  props: { label: { type: String, default: '' } },
  setup(props, { slots }) {
    return () => h('item', { 'data-label': props.label }, slots.default?.())
  },
})

describe('FormField', () => {
  it('should be exported as a standalone field (not attached on FormView)', () => {
    const View = createFormView({ layout: { Row, Col } })
    expect(FormField).toBeTruthy()
    expect(FormField.name).toBe('FormField')
    expect((View as { Field?: unknown }).Field).toBeUndefined()
    expect((View as { Item?: unknown }).Item).toBeUndefined()
  })

  // it('wraps the host Item when bound', async () => {
  //   const FormView = createFormView({
  //     layout: { Row, Col },
  //     item: {
  //       component: LabeledItem,
  //       props: (fl) => ({ label: fl.prop.join(',') }),
  //     },
  //   })
  //   const Field = defineComponent({
  //     setup() {
  //       return () => h(FormField, { 'fl:prop': 'name' }, { default: () => 'x' })
  //     },
  //   })
  //   const html = await render(
  //     h(FormView, { modelValue: {}, 'fl:layout': true }, () => h(Field)),
  //   )
  //   expect(html).toContain('<grid-col')
  //   expect(html).toContain('<item')
  //   expect(html).toContain('data-label="name"')
  //   expect(html).toContain('x')
  // })

  it('should drop Item when fl:item is false but keep Col', async () => {
    const FormView = createFormView({
      layout: { Row, Col },
      item: { component: LabeledItem },
    })
    const Field = defineComponent({
      setup() {
        return () =>
          h(FormField, { 'fl:prop': 'name', 'fl:item': false }, { default: () => 'x' })
      },
    })
    const html = await render(
      h(FormView, { modelValue: {}, 'fl:layout': true }, () => h(Field)),
    )
    expect(html).toContain('<grid-col')
    expect(html).not.toContain('<item')
    expect(html).toContain('x')
  })

  it('should merge the page :fl:item default and let the field fl:item win', async () => {
    const FormView = createFormView({
      layout: { Row, Col },
      item: { component: Item },
    })
    const Field = defineComponent({
      setup() {
        return () => h(FormField, { 'fl:prop': 'name' }, { default: () => 'x' })
      },
    })

    // Page default off → field unset stays off (no <item> shell).
    const htmlOff = await render(
      h(FormView, { modelValue: {}, 'fl:layout': true, 'fl:item': false }, () => h(Field)),
    )
    expect(htmlOff).toContain('<grid-col')
    expect(htmlOff).not.toContain('<item')
    expect(htmlOff).toContain('x')

    // Field fl:item=true wins over the page default.
    const htmlOn = await render(
      h(FormView, { modelValue: {}, 'fl:layout': true, 'fl:item': false }, () =>
        h(FormField, { 'fl:prop': 'name', 'fl:item': true }, { default: () => 'x' }),
      ),
    )
    expect(htmlOn).toContain('<item')
    expect(htmlOn).toContain('x')

    // A bare fl:item (empty string attr) counts as true.
    const htmlBare = await render(
      h(FormView, { modelValue: {}, 'fl:layout': true, 'fl:item': false }, () =>
        h(FormField, { 'fl:prop': 'name', 'fl:item': '' }, { default: () => 'x' }),
      ),
    )
    expect(htmlBare).toContain('<item')
    expect(htmlBare).toContain('x')
  })

  it('should never wrap Item when the factory omitted item.component', async () => {
    const FormView = createFormView({ layout: { Row, Col } })
    const Field = defineComponent({
      setup() {
        return () =>
          h(FormField, { 'fl:prop': 'name', label: '姓名' }, { default: () => 'x' })
      },
    })
    const html = await render(
      h(FormView, { modelValue: {}, 'fl:layout': true }, () => h(Field)),
    )
    expect(html).toContain('<grid-col')
    expect(html).not.toContain('<item')
    expect(html).toContain('x')
  })

  it('should render an ad-hoc control from fl:component and bind fl:prop', async () => {
    const emit = vi.fn()
    const seen: Record<string, unknown>[] = []
    const Control = defineComponent({
      name: 'AdHocControl',
      inheritAttrs: false,
      setup(_, { attrs }) {
        seen.push({ ...attrs })
        return () => h('input', { class: 'adhoc' })
      },
    })
    const FormView = createFormView({ layout: { Row, Col }, item: { component: Item } })
    const Probe = defineComponent({
      setup: () => () => h(FormField, { 'fl:prop': 'name', 'fl:component': Control }),
    })
    const html = await render(
      h(
        FormView,
        { modelValue: { name: 'Ada' }, 'onUpdate:modelValue': emit },
        () => h(Probe),
      ),
    )
    expect(html).toContain('class="adhoc"')
    expect(seen).toHaveLength(1)
    expect(seen[0]).toMatchObject({ modelValue: 'Ada' })
    ;(seen[0]!['onUpdate:modelValue'] as (next: unknown) => void)('Zed')
    await nextTick()
    expect(emit).toHaveBeenCalledTimes(1)
    expect(emit.mock.calls[0]![0]).toEqual({ name: 'Zed' })
  })

  it('should let fl:prop drive the field slot write', async () => {
    const emit = vi.fn()
    const FormView = createFormView({ layout: { Row, Col }, item: { component: Item } })
    const Probe = defineComponent({
      setup() {
        return () =>
          h(FormField, { 'fl:prop': 'name' }, {
            default: (slot: { $bindings: { modelValue: unknown; 'onUpdate:modelValue': (n: unknown) => void } }) => {
              slot.$bindings['onUpdate:modelValue']('Zed')
              return h('span', String(slot.$bindings.modelValue ?? ''))
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

  it('should declare its own v-model ports from fl:model at the identity root', async () => {
    const emit = vi.fn()
    const seen: Record<string, unknown>[] = []
    const TwoPorts = defineComponent({
      inheritAttrs: false,
      setup(_, { attrs }) {
        seen.push({ ...attrs })
        return () => h('div')
      },
    })
    const FormView = View()
    await render(
      h(
        FormView,
        { modelValue: { fromTime: 'a', toTime: 'b' }, 'onUpdate:modelValue': emit },
        () =>
          h(FormField, {
            'fl:model': ['start', 'end'],
            'fl:prop': ['fromTime', 'toTime'],
            'fl:component': TwoPorts,
          }),
      ),
    )
    expect(seen[0]).toMatchObject({ start: 'a', end: 'b' })
    ;(seen[0]!['onUpdate:end'] as (next: unknown) => void)('z')
    await nextTick()
    expect(emit).toHaveBeenCalledTimes(1)
    expect(emit.mock.calls[0]![0]).toEqual({ fromTime: 'a', toTime: 'z' })
  })

  it('should provide its identity from the root FormField (no factory shell)', async () => {
    const emit = vi.fn()
    const FormView = View()
    const Inner = defineComponent({
      setup: () => () =>
        h(FormField, {}, {
          default: (slot: { $bindings: { modelValue: unknown; 'onUpdate:modelValue': (n: unknown) => void } }) => {
            slot.$bindings['onUpdate:modelValue']('Bob')
            return h('span', String(slot.$bindings.modelValue ?? ''))
          },
        }),
    })
    await render(
      h(
        FormView,
        { modelValue: { name: 'Ada' }, 'onUpdate:modelValue': emit },
        () => h(FormField, { 'fl:prop': 'name' }, { default: () => h(Inner) }),
      ),
    )
    await nextTick()
    expect(emit).toHaveBeenCalledTimes(1)
    expect(emit.mock.calls[0]![0]).toEqual({ name: 'Bob' })
  })

  it('should route item:* props and @item:* listeners to the host Item', async () => {
    const seen: Record<string, unknown>[] = []
    const validate = () => {}
    const ProbeItem = defineComponent({
      name: 'ProbeItem',
      inheritAttrs: false,
      setup(_, { attrs, slots }) {
        seen.push({ ...attrs })
        return () => h('item', slots.default?.())
      },
    })
    const FormView = createFormView({
      layout: { Row, Col },
      item: { component: ProbeItem },
    })
    await render(
      h(
        FormView,
        { modelValue: {} },
        () =>
          h(FormField, {
            'fl:prop': 'name',
            'item:label': '姓名',
            'onItem:validate': validate,
            placeholder: 'bare',
          }),
      ),
    )
    expect(seen).toHaveLength(1)
    expect(seen[0]).toMatchObject({ label: '姓名', onValidate: validate })
    // Bare names stay on the control; there is no control here, so it is simply gone.
    expect(seen[0]).not.toHaveProperty('placeholder')
  })

  it('should bind a nested sub-form to its own model (identity does not cross FormView)', async () => {
    const InnerView = createFormView({ layout: { Row, Col }, item: { component: Item } })
    const seen: Record<string, unknown>[] = []
    const Field = defineComponent({
      setup: () => () =>
        h(FormField, { 'fl:prop': 'address' }, {
          default: (sp: { $bindings: Record<string, unknown> }) =>
            h(InnerView, sp.$bindings, () =>
              h(FormField, { 'fl:prop': 'city' }, {
                default: (sub: { $bindings: Record<string, unknown> }) => {
                  seen.push(sub.$bindings)
                  return h('span', String(sub.$bindings.modelValue ?? ''))
                },
              }),
            ),
        }),
    })
    const OuterView = createFormView({ layout: { Row, Col }, item: { component: Item } })
    await render(
      h(OuterView, { modelValue: { address: { city: 'NYC' } } }, () => h(Field)),
    )
    expect(seen).toHaveLength(1)
    expect(seen[0]).toMatchObject({ modelValue: 'NYC' })
  })

  it('should not inherit identity across a nested FormView (fl:model only stays unwired)', async () => {
    const InnerView = createFormView({ layout: { Row, Col }, item: { component: Item } })
    const bags: Record<string, unknown>[] = []
    const Field = defineComponent({
      setup: () => () =>
        h(FormField, { 'fl:prop': 'name' }, {
          default: (sp: { $bindings: Record<string, unknown> }) =>
            h(InnerView, sp.$bindings, () =>
              h(FormField, { 'fl:model': 'modelValue' }, {
                default: (sub: { $bindings: Record<string, unknown> }) => {
                  bags.push(sub.$bindings)
                  return h('span')
                },
              }),
            ),
        }),
    })
    const OuterView = createFormView({ layout: { Row, Col }, item: { component: Item } })
    await render(
      h(OuterView, { modelValue: { name: { first: 'Ada' } } }, () => h(Field)),
    )
    expect(bags).toHaveLength(1)
    // The inner field declares no fl:prop and identity is truncated at the FormView,
    // so it resolves no location and gets no v-model binding.
    expect(bags[0]).toEqual({})
  })
})
