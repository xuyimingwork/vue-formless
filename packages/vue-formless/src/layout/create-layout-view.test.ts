import { describe, expect, it } from 'vitest'
import { createSSRApp, defineComponent, h, type VNode } from 'vue'
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
    return () => h('col', { span: String(props.span) }, slots.default?.())
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
      h(LayoutView, { enabled: false, column: 3 }, () => h(Cell, () => 'nocol')),
    )
    expect(html).not.toContain('<row')
    expect(html).not.toContain('<col')
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
    const html = await render(h(Bare, { enabled: true }, () => h(Inner, () => 'bare')))
    expect(html).toContain('bare')
    expect(html).not.toContain('<row')
    expect(html).not.toContain('<col')
  })

  it('uses 1x default span from column', async () => {
    const html = await render(
      h(LayoutView, { enabled: true, column: 3, gutter: 12 }, () => h(Cell)),
    )
    expect(html).toContain('gutter="12"')
    expect(html).toContain('span="8"')
  })

  it('resolves 2x / max / absolute span', async () => {
    const two = await render(
      h(LayoutView, { enabled: true, column: 3 }, () => h(Cell, { span: '2x' })),
    )
    expect(two).toContain('span="16"')
    const max = await render(
      h(LayoutView, { enabled: true, column: 3 }, () => h(Cell, { span: 'max' })),
    )
    expect(max).toContain('span="24"')
    const abs = await render(
      h(LayoutView, { enabled: true, column: 3 }, () => h(Cell, { span: 8 })),
    )
    expect(abs).toContain('span="8"')
  })

  it('auto does not insert blank cols', async () => {
    const html = await render(
      h(LayoutView, { enabled: true, column: 2 }, () => [
        h(Cell, { span: 12 }, () => 'a'),
        h(Cell, { span: 12 }, () => 'b'),
      ]),
    )
    expect(html.match(/<col/g)).toHaveLength(2)
  })

  it('start inserts a blank to seal the row', async () => {
    const html = await render(
      h(LayoutView, { enabled: true, column: 2 }, () => [
        h(Cell, { span: 8 }, () => 'a'),
        h(Cell, { span: 8, place: 'start' }, () => 'b'),
      ]),
    )
    expect(html.match(/<col/g)).toHaveLength(3)
    expect(html).toMatch(/span="8".*span="16".*span="8"/s)
  })

  it('end pads so the cell sits at the row end', async () => {
    const html = await render(
      h(LayoutView, { enabled: true, column: 3 }, () => h(Cell, { span: 8, place: 'end' }, () => 'z')),
    )
    expect(html.match(/<col/g)).toHaveLength(2)
    expect(html).toMatch(/span="16".*span="8"/s)
  })

  it('nested LayoutView cuts through to the inner density', async () => {
    const html = await render(
      h(LayoutView, { enabled: true, column: 3 }, () =>
        h(LayoutView, { enabled: true, column: 2, gutter: 8 }, () => h(Cell)),
      ),
    )
    expect(html.match(/<row/g)).toHaveLength(2)
    expect(html).toContain('gutter="8"')
    expect(html).toContain('span="12"')
    expect(html).not.toContain('span="8"')
  })

  it('inner disabled LayoutView does not pierce outer Col', async () => {
    const html = await render(
      h(LayoutView, { enabled: true, column: 3 }, () =>
        h(LayoutView, { enabled: false }, () => h(Cell, () => 'inner')),
      ),
    )
    expect(html.match(/<row/g)).toHaveLength(1)
    expect(html).not.toContain('<col')
    expect(html).toContain('inner')
  })
})
