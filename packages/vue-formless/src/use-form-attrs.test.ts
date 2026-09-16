import { describe, expect, it } from 'vitest'
import type { Slot, Slots } from 'vue'
import { useFormFieldSlots, useFormViewAttrs } from './use-form-attrs'

describe('useFormViewAttrs', () => {
  it('claims fl / layout / layout-item and leaves item:* to the host Form', () => {
    const validate = () => {}
    const bags = useFormViewAttrs({
      'fl:layout': true,
      'layout:gutter': 16,
      'layout-item:span': 2,
      'item:label': 'x',
      'onItem:validate': validate,
      labelWidth: 96,
    })
    expect(bags.fl.value).toEqual({ layout: true })
    expect(bags.layout.value).toEqual({ gutter: 16 })
    expect(bags['layout-item'].value).toEqual({ span: 2 })
    expect(bags.default.value).toEqual({
      'item:label': 'x',
      'onItem:validate': validate,
      labelWidth: 96,
    })
  })
})
