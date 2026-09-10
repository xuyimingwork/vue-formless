import { describe, expect, expectTypeOf, it } from 'vitest'
import './vue-formless-aug'
import { resolveFormItemProp, toEpItemProps } from './form-view'
import { User } from '../demos/formless/user'
import type { ComponentPublicProps, FormFieldProps, FormCellTagProps, ItemFl } from 'vue-formless'

describe('toEpItemProps', () => {
  const mobileFl: ItemFl = {
    fieldKey: 'mobile',
    label: '手机',
    binding: { models: ['modelValue'], props: ['mobile'] },
    getValues: () => [''],
  }

  it('maps fl to ElFormItem props', () => {
    const props = toEpItemProps(mobileFl)
    expect(props.label).toBe('手机')
    expect(props.prop).toBe('mobile')
  })

  it('encodes host prop: one leaf path vs multi-port field key', () => {
    expect(
      toEpItemProps({
        ...mobileFl,
        binding: { models: ['modelValue'], props: ['buyers[0].name'] },
      }).prop,
    ).toBe('buyers.0.name')
    expect(
      toEpItemProps({
        ...mobileFl,
        fieldKey: 'timeRange',
        binding: { models: ['start', 'end'], props: ['startTime', 'endTime'] },
      }).prop,
    ).toBe('timeRange')
  })
})

describe('resolveFormItemProp', () => {
  describe('single-port binding: kernel location → dotted ElFormItem prop', () => {
    it.each([
      ['name', 'name'],
      ['buyers[0].name', 'buyers.0.name'],
      ['[2].title', '2.title'],
    ])("converts '%s' into '%s'", (location, expected) => {
      expect(
        resolveFormItemProp({ models: ['modelValue'], props: [location] }, 'name'),
      ).toBe(expected)
    })
  })

  it('multi-port binding in one cell falls back to the field key', () => {
    expect(
      resolveFormItemProp(
        { models: ['start', 'end'], props: ['startTime', 'endTime'] },
        'timeRange',
      ),
    ).toBe('timeRange')
  })
})

describe('FieldSchema extras inference', () => {
  it('lifts label onto ItemFl and fl: tag props', () => {
    expectTypeOf<ItemFl>().toHaveProperty('label')
    expectTypeOf<ItemFl['label']>().toEqualTypeOf<string | undefined>()
    expectTypeOf<FormFieldProps>().toHaveProperty('fl:label')
    expectTypeOf<FormFieldProps['fl:label']>().toEqualTypeOf<string | undefined>()
    expectTypeOf<FormCellTagProps>().toHaveProperty('fl:label')
    expectTypeOf<FormCellTagProps['fl:label']>().toEqualTypeOf<string | undefined>()
  })
})

describe('namespaced field widget props', () => {
  it('exposes ElInput props on User.Remark', () => {
    type RemarkProps = ComponentPublicProps<typeof User.Remark>
    expectTypeOf<RemarkProps>().toHaveProperty('placeholder')
    expectTypeOf<RemarkProps>().toHaveProperty('rows')
    expectTypeOf<RemarkProps>().toHaveProperty('type')
    expectTypeOf<RemarkProps>().toHaveProperty('col:span')
    expectTypeOf<RemarkProps>().toHaveProperty('fl:label')
    expectTypeOf<RemarkProps>().not.toHaveProperty('modelValue')
  })
})
