import { describe, expect, expectTypeOf, it } from 'vitest'
import './vue-formless-aug'
import { toEpItemProps } from './form-view'
import { User } from '../demos/formless/user'
import type { ComponentPublicProps, FormControlProps, FormViewItemProps, ItemFl } from 'vue-formless'

describe('toEpItemProps', () => {
  const mobileFl: ItemFl = {
    controlKey: 'mobile',
    label: '手机',
    binding: { models: ['modelValue'], props: ['mobile'] },
    getValues: () => [''],
  }

  it('maps fl to ElFormItem props', () => {
    const props = toEpItemProps(mobileFl)
    expect(props.label).toBe('手机')
    expect(props.prop).toBe('mobile')
  })

  it('encodes host prop: one leaf path vs multi-port control key', () => {
    expect(
      toEpItemProps({
        ...mobileFl,
        binding: { models: ['modelValue'], props: ['buyers[0].name'] },
      }).prop,
    ).toBe('buyers.0.name')
    expect(
      toEpItemProps({
        ...mobileFl,
        controlKey: 'timeRange',
        binding: { models: ['start', 'end'], props: ['startTime', 'endTime'] },
      }).prop,
    ).toBe('timeRange')
  })
})

describe('ControlSchema extras inference', () => {
  it('lifts label onto ItemFl and fl: tag props', () => {
    expectTypeOf<ItemFl>().toHaveProperty('label')
    expectTypeOf<ItemFl['label']>().toEqualTypeOf<string | undefined>()
    expectTypeOf<FormControlProps>().toHaveProperty('fl:label')
    expectTypeOf<FormControlProps['fl:label']>().toEqualTypeOf<string | undefined>()
    expectTypeOf<FormViewItemProps>().toHaveProperty('fl:label')
    expectTypeOf<FormViewItemProps['fl:label']>().toEqualTypeOf<string | undefined>()
  })
})

describe('namespaced control widget props', () => {
  it('exposes ElInput props on User.Remark', () => {
    type RemarkProps = ComponentPublicProps<typeof User.Remark>
    expectTypeOf<RemarkProps>().toHaveProperty('placeholder')
    expectTypeOf<RemarkProps>().toHaveProperty('rows')
    expectTypeOf<RemarkProps>().toHaveProperty('type')
    expectTypeOf<RemarkProps>().toHaveProperty('fl:span')
    expectTypeOf<RemarkProps>().toHaveProperty('fl:label')
    expectTypeOf<RemarkProps>().not.toHaveProperty('modelValue')
  })
})
