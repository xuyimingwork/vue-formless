import { describe, expect, it } from 'vitest'
import { isEmptyValue, resolveValidatePolicy } from './identityRules'
import { splitFallthrough, splitSlots } from './splitFallthrough'
import type { Slot, Slots } from 'vue'

describe('resolveValidatePolicy', () => {
  it('defaults to optional', () => {
    expect(resolveValidatePolicy()).toBe('optional')
    expect(resolveValidatePolicy({})).toBe('optional')
  })

  it('required wins unless novalidate', () => {
    expect(resolveValidatePolicy({ required: true })).toBe('required')
    expect(resolveValidatePolicy({ required: true, novalidate: true })).toBe('none')
    expect(resolveValidatePolicy({ novalidate: true })).toBe('none')
  })
})

describe('isEmptyValue', () => {
  it('trims strings and treats nullish / empty array as empty', () => {
    expect(isEmptyValue('')).toBe(true)
    expect(isEmptyValue('  ')).toBe(true)
    expect(isEmptyValue(null)).toBe(true)
    expect(isEmptyValue([])).toBe(true)
    expect(isEmptyValue('a')).toBe(false)
    expect(isEmptyValue(0)).toBe(false)
  })

  it('uses empty.validate when provided (true = filled)', () => {
    expect(isEmptyValue('x', { validate: () => false })).toBe(true)
    expect(isEmptyValue('', { validate: () => true })).toBe(false)
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
