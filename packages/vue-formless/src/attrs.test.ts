import { describe, expect, it } from 'vitest'
import {
  splitFlAttrs,
  splitFormlessProps,
  takePrefixed,
  toAttrBoolean,
} from './attrs'

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

describe('takePrefixed', () => {
  it('strips the prefix and keeps an open bag', () => {
    const { taken, rest } = takePrefixed(
      { 'layout-item:span': '2x', 'layout-item:place': 'end', label: 'x' },
      'layout-item:',
    )
    expect(taken).toEqual({ span: '2x', place: 'end' })
    expect(rest).toEqual({ label: 'x' })
  })
})

describe('toAttrBoolean', () => {
  it('maps Vue boolean-attr shapes and falls back when missing', () => {
    expect(toAttrBoolean(undefined)).toBe(false)
    expect(toAttrBoolean(undefined, true)).toBe(true)
    expect(toAttrBoolean(null, true)).toBe(true)
    expect(toAttrBoolean(true)).toBe(true)
    expect(toAttrBoolean('')).toBe(true)
    expect(toAttrBoolean('true')).toBe(true)
    expect(toAttrBoolean(false)).toBe(false)
    expect(toAttrBoolean('false')).toBe(false)
    expect(toAttrBoolean('nope', true)).toBe(true)
  })
})

describe('splitFormlessProps', () => {
  it('peels fl / layout / layout-item and leaves host props', () => {
    const bags = splitFormlessProps({
      'fl:layout': true,
      'fl:item': false,
      'layout:column': '3',
      'layout:gutter': 16,
      'layout-item:span': '2x',
      labelWidth: 96,
      'item:label': 'x',
    })
    expect(bags.formlessProps).toEqual({ layout: true, item: false })
    expect(bags.layoutProps).toEqual({ column: '3', gutter: 16 })
    expect(bags.layoutItemProps).toEqual({ span: '2x' })
    expect(bags.props).toEqual({ labelWidth: 96, 'item:label': 'x' })
  })
})
