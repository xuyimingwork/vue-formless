import { describe, expect, it } from 'vitest'
import { splitFallthrough } from './item-fallthrough'

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
