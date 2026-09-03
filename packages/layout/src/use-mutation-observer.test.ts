/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it } from 'vitest'
import { createApp, defineComponent, getCurrentInstance, h, nextTick, onMounted, ref } from 'vue'
import { useMutationObserver } from './use-mutation-observer'

describe('useMutationObserver', () => {
  it('notifies on direct childList changes only', async () => {
    const hits = { n: 0 }
    let root: Element | null = null
    const Root = defineComponent({
      setup() {
        const inst = getCurrentInstance()!
        useMutationObserver(
          () => inst.vnode.el as Element | null,
          () => {
            hits.n += 1
          },
          { childList: true },
        )
        onMounted(() => {
          root = inst.vnode.el as Element
        })
        return () => h('div', { class: 'row' })
      },
    })
    const el = document.createElement('div')
    document.body.appendChild(el)
    const app = createApp(Root)
    app.mount(el)
    await nextTick()
    expect(root).toBeInstanceOf(Element)

    const child = document.createElement('div')
    root!.appendChild(child)
    await new Promise((r) => setTimeout(r, 0))
    expect(hits.n).toBeGreaterThan(0)
    const afterAdd = hits.n

    child.appendChild(document.createElement('span'))
    await new Promise((r) => setTimeout(r, 0))
    expect(hits.n).toBe(afterAdd)

    app.unmount()
    el.remove()
  })

  it('accepts a ref target', async () => {
    const hits = { n: 0 }
    const row = ref<Element | null>(null)
    const Root = defineComponent({
      setup() {
        useMutationObserver(row, () => {
          hits.n += 1
        })
        return () => h('div', { ref: row, class: 'row' })
      },
    })
    const el = document.createElement('div')
    document.body.appendChild(el)
    const app = createApp(Root)
    app.mount(el)
    await nextTick()
    expect(row.value).toBeInstanceOf(Element)

    row.value!.appendChild(document.createElement('div'))
    await new Promise((r) => setTimeout(r, 0))
    expect(hits.n).toBeGreaterThan(0)

    app.unmount()
    el.remove()
  })

  it('does nothing when MutationObserver is missing', async () => {
    const Saved = globalThis.MutationObserver
    Object.defineProperty(globalThis, 'MutationObserver', {
      configurable: true,
      value: undefined,
    })
    try {
      const Root = defineComponent({
        setup() {
          useMutationObserver(() => document.body, () => {})
          return () => h('div')
        },
      })
      const el = document.createElement('div')
      document.body.appendChild(el)
      const app = createApp(Root)
      app.mount(el)
      await nextTick()
      app.unmount()
      el.remove()
    } finally {
      Object.defineProperty(globalThis, 'MutationObserver', {
        configurable: true,
        value: Saved,
      })
    }
  })

  it('skips binding until the target is an element', async () => {
    const hits = { n: 0 }
    const row = ref<Element | null>(null)
    const Root = defineComponent({
      setup() {
        useMutationObserver(row, () => {
          hits.n += 1
        })
        return () => h('div')
      },
    })
    const el = document.createElement('div')
    document.body.appendChild(el)
    const app = createApp(Root)
    app.mount(el)
    await nextTick()
    expect(hits.n).toBe(0)

    const target = document.createElement('div')
    el.appendChild(target)
    row.value = target
    await nextTick()
    target.appendChild(document.createElement('span'))
    await new Promise((r) => setTimeout(r, 0))
    expect(hits.n).toBeGreaterThan(0)

    row.value = null
    await nextTick()
    const after = hits.n
    target.appendChild(document.createElement('span'))
    await new Promise((r) => setTimeout(r, 0))
    expect(hits.n).toBe(after)

    app.unmount()
    el.remove()
  })
})
