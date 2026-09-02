import { describe, expect, it, vi } from 'vitest'
import { splitFallthrough, splitFlAttrs, splitLayoutAttrs, splitSlots, toOptionalNumber } from './split-fallthrough'
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

describe('splitLayoutAttrs', () => {
  it('peels closed row: and col: keys', () => {
    const { row, col, rest } = splitLayoutAttrs({
      placeholder: 'x',
      'row:column': 3,
      'row:gutter': 12,
      'col:span': '2x',
      'col:place': 'end',
    })
    expect(row).toEqual({ column: 3, gutter: 12 })
    expect(col).toEqual({ span: '2x', place: 'end' })
    expect(rest).toEqual({ placeholder: 'x' })
  })

  it('drops unknown row:/col: keys', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { rest } = splitLayoutAttrs({
      'row:justify': 'end',
      'col:offset': 4,
      placeholder: 'x',
    })
    expect(rest).toEqual({ placeholder: 'x' })
    warn.mockRestore()
  })
})

describe('toOptionalNumber', () => {
  it('treats empty as missing and rejects non-finite', () => {
    expect(toOptionalNumber(undefined)).toBeUndefined()
    expect(toOptionalNumber(null)).toBeUndefined()
    expect(toOptionalNumber('')).toBeUndefined()
    expect(toOptionalNumber(NaN)).toBeUndefined()
    expect(toOptionalNumber(0)).toBe(0)
    expect(toOptionalNumber('12')).toBe(12)
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
