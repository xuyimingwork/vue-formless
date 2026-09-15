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

describe('useFormFieldSlots', () => {
  it('strips item: for the host Item and keeps everything else on the control', () => {
    const append = (() => []) as unknown as Slot
    const label = (() => []) as unknown as Slot
    const item = (() => []) as unknown as Slot
    const slots = {
      append,
      'item:label': label,
      item,
    } as unknown as Slots
    const split = useFormFieldSlots(slots)
    expect(split.controlSlots).toEqual({ append, item })
    expect(split.itemSlots).toEqual({ label })
  })

  it('does not eat the bare channel name or an empty one', () => {
    const item = (() => []) as unknown as Slot
    const slots = { item, 'item:': item } as unknown as Slots
    const split = useFormFieldSlots(slots)
    expect(split.itemSlots).toEqual({})
    expect(split.controlSlots).toEqual({ item, 'item:': item })
  })

  it('resolves the listener form too, so a slot named onItem:x becomes onX', () => {
    const slot = (() => []) as unknown as Slot
    const split = useFormFieldSlots({ 'onItem:label': slot } as unknown as Slots)
    expect(split.itemSlots).toEqual({ onLabel: slot })
    expect(split.controlSlots).toEqual({})
  })
})
