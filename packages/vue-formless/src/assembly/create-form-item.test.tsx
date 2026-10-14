/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it } from 'vitest'
import { createApp, createSSRApp, defineComponent, h, nextTick, ref, type VNode } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createFormItem } from './create-form-item'
import type { FormFieldFormless } from '../shared/form-field-types'

async function render(vnode: VNode): Promise<string> {
  return renderToString(createSSRApp({ render: () => vnode }))
}

const fl: FormFieldFormless = {
  model: ['modelValue'],
  prop: ['name'],
  field: 'wrap',
  item: true,
}

const ExposedItem = defineComponent({
  name: 'ExposedItem',
  inheritAttrs: false,
  setup(_, { slots, expose }) {
    expose({ validate: () => 'ok' })
    return () => h('item', slots.default?.())
  },
})

describe('createFormItem', () => {
  it('should render null when unbound and there is no default slot', async () => {
    // No host component → passthrough; no default slot → the `?? null` fallback.
    const Item = createFormItem()
    const html = await render(h(Item, { fl, item: {} }))
    // A `null` vnode serializes to an empty comment placeholder.
    expect(html).toBe('<!---->')
  })

  it('should expose the host Item instance methods', async () => {
    const Item = createFormItem({ component: ExposedItem })
    const itemRef = ref<{ validate?: () => string } | null>(null)
    const Root = defineComponent({
      setup() {
        return () => h(Item, { fl, item: {}, ref: itemRef }, { default: () => 'x' })
      },
    })
    const el = document.createElement('div')
    document.body.appendChild(el)
    const app = createApp(Root)
    app.mount(el)
    await nextTick()

    expect(itemRef.value?.validate?.()).toBe('ok')

    app.unmount()
    el.remove()
  })

  it('should read undefined while the host Item is not rendered', async () => {
    // `item: false` → no host rendered → the exposed proxy reads undefined.
    const Item = createFormItem({ component: ExposedItem })
    const itemRef = ref<{ validate?: () => string } | null>(null)
    const Root = defineComponent({
      setup() {
        return () =>
          h(Item, { fl: { ...fl, item: false }, item: {}, ref: itemRef }, { default: () => 'x' })
      },
    })
    const el = document.createElement('div')
    document.body.appendChild(el)
    const app = createApp(Root)
    app.mount(el)
    await nextTick()

    expect(itemRef.value?.validate).toBeUndefined()

    app.unmount()
    el.remove()
  })
})
