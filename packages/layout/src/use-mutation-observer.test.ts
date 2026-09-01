/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it } from 'vitest'
import { createApp, defineComponent, getCurrentInstance, h, nextTick, onMounted } from 'vue'
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
})
