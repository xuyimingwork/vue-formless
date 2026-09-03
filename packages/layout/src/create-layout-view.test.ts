import { describe, expect, it } from 'vitest'
import { createSSRApp, defineComponent, h, type Component, type VNode } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createLayoutView, useLayoutItem } from './create-layout-view'

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

const LayoutView = createLayoutView({ Row, Col })

const Cell = defineComponent({
  name: 'Cell',
  props: {
    span: { type: [String, Number], default: undefined },
    place: { type: String, default: undefined },
  },
  setup(props, { slots }) {
    const LayoutItem = useLayoutItem()
    return () => h(LayoutItem, { span: props.span, place: props.place }, () => slots.default?.() ?? 'x')
  },
})

async function render(vnode: VNode): Promise<string> {
  return renderToString(createSSRApp({ render: () => vnode }))
}

describe('createLayoutView / useLayoutItem', () => {
  it('passthrough without Col when disabled', async () => {
    const html = await render(
      h(LayoutView, { disabled: true, column: 3 }, () => h(Cell, () => 'nocol')),
    )
    expect(html).not.toContain('<row')
    expect(html).not.toContain('<grid-col')
    expect(html).toContain('nocol')
  })

  it('passthrough when createLayoutView has no Row/Col', async () => {
    const Bare = createLayoutView()
    const Inner = defineComponent({
      setup(_, { slots }) {
        const LayoutItem = useLayoutItem()
        return () => h(LayoutItem, () => slots.default?.())
      },
    })
    const html = await render(h(Bare, () => h(Inner, () => 'bare')))
    expect(html).toContain('bare')
    expect(html).not.toContain('<row')
    expect(html).not.toContain('<grid-col')
  })

  it('uses 1x default span from column', async () => {
    const html = await render(
      h(LayoutView, { column: 3, gutter: 12 }, () => h(Cell)),
    )
    expect(html).toContain('gutter="12"')
    expect(html).toContain('span="8"')
    expect(html).toContain('data-layout-row')
    expect(html).toContain('data-layout-cell')
    expect(html).not.toContain('data-layout-blank')
  })

  it('resolves 2x / max / absolute span', async () => {
    const two = await render(
      h(LayoutView, { column: 3 }, () => h(Cell, { span: '2x' })),
    )
    expect(two).toContain('span="16"')
    const max = await render(
      h(LayoutView, { column: 3 }, () => h(Cell, { span: 'max' })),
    )
    expect(max).toContain('span="24"')
    const abs = await render(
      h(LayoutView, { column: 3 }, () => h(Cell, { span: 8 })),
    )
    expect(abs).toContain('span="8"')
  })

  it('auto does not insert blank cols', async () => {
    const html = await render(
      h(LayoutView, { column: 2 }, () => [
        h(Cell, { span: 12 }, () => 'a'),
        h(Cell, { span: 12 }, () => 'b'),
      ]),
    )
    expect(html.match(/<grid-col/g)).toHaveLength(2)
  })

  it('start does not insert a sealing blank during SSR', async () => {
    const html = await render(
      h(LayoutView, { column: 2 }, () => [
        h(Cell, { span: 8 }, () => 'a'),
        h(Cell, { span: 8, place: 'start' }, () => 'b'),
      ]),
    )
    expect(html.match(/<grid-col/g)).toHaveLength(2)
    expect(html).toMatch(/span="8".*span="8"/s)
    expect(html).not.toContain('span="16"')
  })

  it('end does not pad during SSR', async () => {
    const html = await render(
      h(LayoutView, { column: 3 }, () => h(Cell, { span: 8, place: 'end' }, () => 'z')),
    )
    expect(html.match(/<grid-col/g)).toHaveLength(1)
    expect(html).toContain('span="8"')
    expect(html).not.toContain('span="16"')
  })

  it('nested LayoutView does not inherit outer column or gutter', async () => {
    const html = await render(
      h(LayoutView, { column: 3, gutter: 12 }, () =>
        h(LayoutView, () => h(Cell)),
      ),
    )
    expect(html.match(/<row/g)).toHaveLength(2)
    expect(html).toContain('gutter="12"')
    expect(html).toContain('gutter="0"')
    expect(html).toContain('span="24"')
    expect(html).not.toContain('span="8"')
  })

  it('nested LayoutView clamps an illegal column', async () => {
    const html = await render(
      h(LayoutView, { column: 3 }, () =>
        h(LayoutView, { column: 0 }, () => h(Cell)),
      ),
    )
    expect(html).toContain('span="24"')
    expect(html).not.toContain('span="8"')
  })

  it('nested LayoutView cuts through to the inner density', async () => {
    const html = await render(
      h(LayoutView, { column: 3 }, () =>
        h(LayoutView, { column: 2, gutter: 8 }, () => h(Cell)),
      ),
    )
    expect(html.match(/<row/g)).toHaveLength(2)
    expect(html).toContain('gutter="8"')
    expect(html).toContain('span="12"')
    expect(html).not.toContain('span="8"')
  })

  it('inner disabled LayoutView does not pierce outer Col', async () => {
    const html = await render(
      h(LayoutView, { column: 3 }, () =>
        h(LayoutView, { disabled: true }, () => h(Cell, () => 'inner')),
      ),
    )
    expect(html.match(/<row/g)).toHaveLength(1)
    expect(html).not.toContain('<grid-col')
    expect(html).toContain('inner')
  })

  it('nested LayoutItem inside a cell does not wrap another Col', async () => {
    const html = await render(
      h(LayoutView, { column: 3 }, () =>
        h(Cell, { span: 8 }, () => h(Cell, { span: 'max' }, () => 'inner')),
      ),
    )
    expect(html.match(/<grid-col/g)).toHaveLength(1)
    expect(html).toContain('span="8"')
    expect(html).not.toContain('span="24"')
    expect(html).toContain('inner')
  })

  it('start as the first remaining cell does not keep a sealing blank', async () => {
    const html = await render(
      h(LayoutView, { column: 3 }, () => h(Cell, { place: 'start' }, () => 'b')),
    )
    expect(html.match(/<grid-col/g)).toHaveLength(1)
    expect(html).toContain('span="8"')
  })

  it('passthrough outside LayoutView', async () => {
    const html = await render(h(Cell, () => 'solo'))
    expect(html).toContain('solo')
    expect(html).not.toContain('<row')
    expect(html).not.toContain('<grid-col')
  })

  it('passthrough outside LayoutView with no default slot', async () => {
    const Empty = defineComponent({
      setup() {
        const LayoutItem = useLayoutItem()
        return () => h(LayoutItem)
      },
    })
    const html = await render(h(Empty))
    expect(html).not.toContain('<row')
    expect(html).not.toContain('<grid-col')
  })

  it('renders an empty HostRow when LayoutView has no default slot', async () => {
    const html = await render(h(LayoutView, { column: 3 }))
    expect(html).toContain('<row')
    expect(html).toContain('data-layout-row')
    expect(html).not.toContain('<grid-col')
  })

  it('renders nothing when disabled LayoutView has no default slot', async () => {
    const html = await render(h(LayoutView, { disabled: true }))
    expect(html).not.toContain('<row')
    expect(html).not.toContain('<grid-col')
  })

  it('passthrough when disabled LayoutItem has no default slot', async () => {
    const Empty = defineComponent({
      setup() {
        const LayoutItem = useLayoutItem()
        return () => h(LayoutItem)
      },
    })
    const html = await render(h(LayoutView, { disabled: true }, () => h(Empty)))
    expect(html).not.toContain('<row')
    expect(html).not.toContain('<grid-col')
  })

  it('wraps an empty default slot in HostCol', async () => {
    const Empty = defineComponent({
      setup() {
        const LayoutItem = useLayoutItem()
        return () => h(LayoutItem)
      },
    })
    const html = await render(h(LayoutView, { column: 3 }, () => h(Empty)))
    expect(html).toContain('<grid-col')
    expect(html).toContain('span="8"')
    expect(html).toContain('data-layout-cell')
  })

  it('renders LayoutItem without a view as the default slot', async () => {
    let Item: Component | undefined
    const Capture = defineComponent({
      setup() {
        Item = useLayoutItem()
        return () => null
      },
    })
    await render(h(LayoutView, { column: 3 }, () => h(Capture)))
    expect(Item).toBeTruthy()
    const html = await render(h(Item!, () => 'orphan'))
    expect(html).toContain('orphan')
    expect(html).not.toContain('<grid-col')
    const empty = await render(h(Item!))
    expect(empty).not.toContain('<grid-col')
  })

  it('forwards attrs to the real col but keeps kernel span and markers', async () => {
    const Rich = defineComponent({
      setup() {
        const LayoutItem = useLayoutItem()
        return () =>
          h(
            LayoutItem,
            { span: 8, class: 'mine', 'data-layout-cell': 'user', 'data-user': '1' },
            () => 'x',
          )
      },
    })
    const html = await render(h(LayoutView, { column: 3, class: 'row-x' }, () => h(Rich)))
    expect(html).toContain('class="row-x"')
    expect(html).toContain('data-layout-row')
    expect(html).toContain('class="mine"')
    expect(html).toContain('data-user="1"')
    expect(html).toContain('span="8"')
    expect(html).toContain('data-layout-cell')
    expect(html).not.toContain('data-layout-cell="user"')
  })
})
