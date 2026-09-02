/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it } from 'vitest'
import { createApp, defineComponent, h, nextTick, ref } from 'vue'
import { useDomChildren } from './use-dom-children'

describe('useDomChildren', () => {
  it('re-reads children when version changes', async () => {
    const row = ref<HTMLElement | null>(null)
    const version = ref(0)
    let children = ref<Element[]>([])
    const Root = defineComponent({
      setup() {
        children = useDomChildren(row, version)
        return () => h('div', { ref: row, class: 'row' })
      },
    })
    const el = document.createElement('div')
    document.body.appendChild(el)
    const app = createApp(Root)
    app.mount(el)
    await nextTick()

    const a = document.createElement('div')
    const blank = document.createElement('div')
    const b = document.createElement('div')
    row.value!.append(a, blank, b)
    version.value += 1
    await nextTick()
    expect(children.value).toEqual([a, blank, b])

    app.unmount()
    el.remove()
  })

  it('re-reads children on childList mutations', async () => {
    const row = ref<HTMLElement | null>(null)
    let children = ref<Element[]>([])
    const Root = defineComponent({
      setup() {
        children = useDomChildren(row)
        return () => h('div', { ref: row, class: 'row' })
      },
    })
    const el = document.createElement('div')
    document.body.appendChild(el)
    const app = createApp(Root)
    app.mount(el)
    await nextTick()

    const a = document.createElement('div')
    const blank = document.createElement('div')
    const b = document.createElement('div')
    row.value!.append(a, blank, b)
    await new Promise((r) => setTimeout(r, 0))
    expect(children.value).toEqual([a, blank, b])

    app.unmount()
    el.remove()
  })
})
