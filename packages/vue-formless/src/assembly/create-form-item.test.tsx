import { describe, expect, it } from 'vitest'
import { createSSRApp, h, type VNode } from 'vue'
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

describe('createFormItem', () => {
  it('renders null when unbound and there is no default slot', async () => {
    // No host component → passthrough; no default slot → the `?? null` fallback.
    const Item = createFormItem()
    const html = await render(h(Item, { fl, item: {} }))
    // A `null` vnode serializes to an empty comment placeholder.
    expect(html).toBe('<!---->')
  })
})
