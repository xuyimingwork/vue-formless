import { describe, expect, expectTypeOf, it } from 'vitest'
import './vue-formless-aug'
import { resolveFormItemProp, toEpItemProps } from './form-view'
import { User } from '../demos/formless/user'
import type { FormFieldProps, ItemFl } from 'vue-formless'

describe('toEpItemProps', () => {
  const mobileFl: ItemFl = {
    label: '手机',
    model: ['modelValue'],
    prop: ['mobile'],
    getValues: () => [''],
  }

  it('maps fl to ElFormItem props', () => {
    const props = toEpItemProps(mobileFl)
    expect(props.label).toBe('手机')
    expect(props.prop).toBe('mobile')
  })

  it('binds one leaf path, and leaves a multi-port field unbound', () => {
    expect(
      toEpItemProps({
        ...mobileFl,
        model: ['modelValue'],
        prop: ['buyers[0].name'],
      }).prop,
    ).toBe('buyers.0.name')
    // One host Item `prop` cannot hold a pair: no name to fall back on either,
    // so the field stays out of the host's validation (design.md §20.9).
    expect(
      toEpItemProps({
        ...mobileFl,
        model: ['start', 'end'],
        prop: ['startTime', 'endTime'],
      }).prop,
    ).toBeUndefined()
  })
})

describe('resolveFormItemProp', () => {
  describe('single-port field: kernel location → dotted ElFormItem prop', () => {
    it.each([
      ['name', 'name'],
      ['buyers[0].name', 'buyers.0.name'],
      ['[2].title', '2.title'],
    ])("converts '%s' into '%s'", (location, expected) => {
      expect(resolveFormItemProp([location])).toBe(expected)
    })
  })

  it('leaves several ports in one field unbound', () => {
    expect(resolveFormItemProp(['startTime', 'endTime'])).toBeUndefined()
  })

  it('leaves a path it cannot dot-encode unbound', () => {
    expect(resolveFormItemProp(['buyers["a.b"].name'])).toBeUndefined()
  })
})

describe('FieldSchema extras inference', () => {
  it('lifts label onto ItemFl and fl: tag props', () => {
    expectTypeOf<ItemFl>().toHaveProperty('label')
    expectTypeOf<ItemFl['label']>().toEqualTypeOf<string | undefined>()
    expectTypeOf<FormFieldProps>().toHaveProperty('fl:label')
    expectTypeOf<FormFieldProps['fl:label']>().toEqualTypeOf<string | undefined>()
  })
})

describe('namespaced field control props', () => {
  it('exposes ElInput props on User.Remark', () => {
    type RemarkProps = InstanceType<typeof User.Remark>['$props']
    expectTypeOf<RemarkProps>().toHaveProperty('placeholder')
    expectTypeOf<RemarkProps>().toHaveProperty('rows')
    expectTypeOf<RemarkProps>().toHaveProperty('type')
    expectTypeOf<RemarkProps>().toHaveProperty('layout-item:span')
    expectTypeOf<RemarkProps>().toHaveProperty('fl:label')
    expectTypeOf<RemarkProps>().not.toHaveProperty('modelValue')
  })
})
