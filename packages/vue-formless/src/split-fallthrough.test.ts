import { describe, expect, it } from 'vitest'
import { splitFallthrough, splitFlAttrs, splitSlots } from './split-fallthrough'
import type { Slot, Slots } from 'vue'

describe('splitFlAttrs', () => {
  it('strips fl: prefix into a bag and leaves the rest', () => {
    const { fl, rest } = splitFlAttrs({
      placeholder: 'x',
      'fl:prop': 'buyers[0].name',
      'fl:span': 24,
      'fl:validate': 'required',
      'item:label-width': 96,
    })
    expect(fl).toEqual({ prop: 'buyers[0].name', span: 24, validate: 'required' })
    expect(rest).toEqual({ placeholder: 'x', 'item:label-width': 96 })
  })
})

describe('splitFallthrough', () => {
  it('routes onItem: events to Item onXxx', () => {
    const blur = () => {}
    const validate = () => {}
    const { itemOn, inputAttrs } = splitFallthrough({
      placeholder: 'x',
      onBlur: blur,
      'onItem:validate': validate,
    })
    expect(inputAttrs).toEqual({ placeholder: 'x', onBlur: blur })
    expect(itemOn).toEqual({ onValidate: validate })
  })

  it('maps onItem:update:modelValue to onUpdate:modelValue', () => {
    const fn = () => {}
    const { itemOn } = splitFallthrough({ 'onItem:update:modelValue': fn })
    expect(itemOn).toEqual({ 'onUpdate:modelValue': fn })
  })

  it('strips item: prefix for Item props', () => {
    const { itemAttrs, inputAttrs } = splitFallthrough({
      placeholder: 'x',
      'item:label-width': 123,
      'item:labelWidth': 96,
      item: 'keep-on-input',
    })
    expect(inputAttrs).toEqual({ placeholder: 'x', item: 'keep-on-input' })
    expect(itemAttrs).toEqual({ 'label-width': 123, labelWidth: 96 })
  })
})

describe('splitSlots', () => {
  it('strips item: prefix for Item slots', () => {
    const append = (() => []) as unknown as Slot
    const label = (() => []) as unknown as Slot
    const item = (() => []) as unknown as Slot
    const slots = {
      append,
      'item:label': label,
      item,
    } as unknown as Slots
    const split = splitSlots(slots)
    expect(split.inputSlots).toEqual({ append, item })
    expect(split.itemSlots).toEqual({ label })
  })
})
