/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it } from 'vitest'
import { createApp, defineComponent, h, inject, nextTick, onBeforeUnmount, ref } from 'vue'
import { createLayoutView, LayoutItem } from './create-layout-view'
import { LAYOUT_VIEW_KEY } from './injection-keys'

const Row = defineComponent({
  name: 'DummyRow',
  setup(_, { slots }) {
    return () => h('div', { class: 'row' }, slots.default?.())
  },
})

const Col = defineComponent({
  name: 'DummyCol',
  inheritAttrs: false,
  props: { span: { type: Number, default: 0 } },
  setup(props, { slots, attrs }) {
    return () => h('div', { class: 'col', 'data-span': String(props.span), ...attrs }, slots.default?.())
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
    return () => h(LayoutItem, { span: props.span, place: props.place }, () => slots.default?.() ?? 'x')
  },
})

describe('layout place blanks after updates', () => {
  it('drops start blanks when the leading cell unmounts', async () => {
    const hideA = ref(false)
    const Root = defineComponent({
      setup() {
        return () =>
          h(LayoutView, { column: 3 }, () => [
            hideA.value ? null : h(Cell, { key: 'a' }, () => 'a'),
            h(Cell, { key: 'b', place: 'start' }, () => 'b'),
          ])
      },
    })
    const el = document.createElement('div')
    document.body.appendChild(el)
    const app = createApp(Root)
    app.mount(el)

    const first = [...el.querySelectorAll('.col')].map((n) => n.getAttribute('data-span'))
    expect(first).toEqual(['8', '8'])
    await nextTick()

    const before = [...el.querySelectorAll('.col')].map((n) => n.getAttribute('data-span'))
    expect(before).toEqual(['8', '16', '8'])
    const blank = el.querySelector('[data-layout-blank]')
    expect(blank?.getAttribute('data-span')).toBe('16')
    expect(blank?.getAttribute('aria-hidden')).toBe('true')
    expect(el.querySelector('[data-layout-place="start"]')).not.toBeNull()

    hideA.value = true
    await nextTick()

    const after = [...el.querySelectorAll('.col')].map((n) => n.getAttribute('data-span'))
    expect(after).toEqual(['8'])
    expect(el.textContent).toContain('b')
    expect(el.textContent).not.toContain('a')

    app.unmount()
    el.remove()
  })

  it('uses template order when a middle cell mounts last', async () => {
    const showB = ref(false)
    const Root = defineComponent({
      setup() {
        return () =>
          h(LayoutView, { column: 3 }, () => [
            h(Cell, { key: 'a' }, () => 'a'),
            showB.value ? h(Cell, { key: 'b', place: 'start' }, () => 'b') : null,
            h(Cell, { key: 'c' }, () => 'c'),
          ])
      },
    })
    const el = document.createElement('div')
    document.body.appendChild(el)
    const app = createApp(Root)
    app.mount(el)

    expect([...el.querySelectorAll('.col')].map((n) => n.getAttribute('data-span'))).toEqual([
      '8',
      '8',
    ])

    showB.value = true
    await nextTick()

    expect([...el.querySelectorAll('.col')].map((n) => n.getAttribute('data-span'))).toEqual([
      '8',
      '16',
      '8',
      '8',
    ])
    expect(el.textContent).toMatch(/a.*b.*c/s)

    app.unmount()
    el.remove()
  })

  it('uses template order when an end cell mounts last before a trailing cell', async () => {
    const showC = ref(false)
    const Root = defineComponent({
      setup() {
        return () =>
          h(LayoutView, { column: 3 }, () => [
            h(Cell, { key: 'a' }, () => 'a'),
            showC.value ? h(Cell, { key: 'c', place: 'end' }, () => 'c') : null,
            h(Cell, { key: 'd' }, () => 'd'),
          ])
      },
    })
    const el = document.createElement('div')
    document.body.appendChild(el)
    const app = createApp(Root)
    app.mount(el)

    expect([...el.querySelectorAll('.col')].map((n) => n.getAttribute('data-span'))).toEqual([
      '8',
      '8',
    ])

    showC.value = true
    await nextTick()

    expect([...el.querySelectorAll('.col')].map((n) => n.getAttribute('data-span'))).toEqual([
      '8',
      '8',
      '8',
      '8',
    ])
    expect(el.textContent).toMatch(/a.*c.*d/s)

    app.unmount()
    el.remove()
  })

  it('does not remount col inner components when place blanks change', async () => {
    function probe(name: string) {
      const stats = { setups: 0, renders: 0 }
      const Comp = defineComponent({
        name: `Probe_${name}`,
        setup() {
          stats.setups += 1
          return () => {
            stats.renders += 1
            return h('span', name)
          }
        },
      })
      return { Comp, stats }
    }
    const a = probe('a')
    const b = probe('b')
    const c = probe('c')
    const showB = ref(false)
    const MaybeB = defineComponent({
      name: 'MaybeB',
      setup() {
        return () => (showB.value ? h(Cell, { key: 'b', place: 'start' }, () => h(b.Comp)) : null)
      },
    })
    const Root = defineComponent({
      setup() {
        return () =>
          h(LayoutView, { column: 3 }, () => [
            h(Cell, { key: 'a' }, () => h(a.Comp)),
            h(MaybeB),
            h(Cell, { key: 'c' }, () => h(c.Comp)),
          ])
      },
    })
    const el = document.createElement('div')
    document.body.appendChild(el)
    const app = createApp(Root)
    app.mount(el)
    await nextTick()

    expect(a.stats.setups).toBe(1)
    expect(c.stats.setups).toBe(1)

    showB.value = true
    await nextTick()

    expect([...el.querySelectorAll('.col')].map((n) => n.getAttribute('data-span'))).toEqual([
      '8',
      '16',
      '8',
      '8',
    ])
    expect(a.stats.setups).toBe(1)
    expect(c.stats.setups).toBe(1)
    expect(b.stats.setups).toBe(1)

    app.unmount()
    el.remove()
  })

  it('exposes the real col element on LayoutItem', async () => {
    const itemRef = ref<{ el: Element | null } | null>(null)
    const Inner = defineComponent({
      setup() {
        return () => h(LayoutItem, { ref: itemRef, span: 8 }, () => 'x')
      },
    })
    const Root = defineComponent({
      setup() {
        return () => h(LayoutView, { column: 3 }, () => h(Inner))
      },
    })
    const el = document.createElement('div')
    document.body.appendChild(el)
    const app = createApp(Root)
    app.mount(el)
    await nextTick()

    expect(itemRef.value?.el).toBeInstanceOf(Element)
    expect(itemRef.value?.el).toBe(el.querySelector('[data-layout-cell]'))

    app.unmount()
    el.remove()
  })

  it('span lookup falls back to 0 after the item unregisters', async () => {
    const seen = { n: -1 }
    const Probe = defineComponent({
      setup() {
        const register = inject(LAYOUT_VIEW_KEY)!
        const { span } = register(() => 8, () => 'auto')
        onBeforeUnmount(() => {
          seen.n = span.value
        })
        return () => null
      },
    })
    const show = ref(true)
    const Root = defineComponent({
      setup() {
        return () => h(LayoutView, { column: 3 }, () => (show.value ? h(Probe) : null))
      },
    })
    const el = document.createElement('div')
    document.body.appendChild(el)
    const app = createApp(Root)
    app.mount(el)
    await nextTick()

    show.value = false
    await nextTick()
    expect(seen.n).toBe(0)

    app.unmount()
    el.remove()
  })
})
