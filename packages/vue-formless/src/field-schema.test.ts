import { describe, expectTypeOf, it } from 'vitest'
import type { Component } from 'vue'
import type {
  FieldSchemaExtras,
  FlExtraProps,
  FormFieldTagProps,
  ItemFl,
} from './field-schema'

describe('FieldSchema extras', () => {
  it('kernel FormFieldTagProps are only the fl / layout keys', () => {
    expectTypeOf<FieldSchemaExtras>().toEqualTypeOf<{}>()
    expectTypeOf<FormFieldTagProps>().toEqualTypeOf<{
      'fl:prop'?: string | string[]
      'fl:model'?: string | string[]
      'fl:item'?: boolean
      'fl:field'?: 'wrap' | 'embed' | 'wrap-embed'
      'fl:component'?: Component
      'layout-item:span'?: string | number
      'layout-item:place'?: 'auto' | 'start' | 'end'
      'layout:column'?: number
    }>()
  })

  it('prefixes extra keys as optional fl: tag props', () => {
    expectTypeOf<FlExtraProps<{ label?: string; count: number }>>().toEqualTypeOf<{
      'fl:label'?: string
      'fl:count'?: number
    }>()
  })

  it('ItemFl flattens the binding into index-aligned model / prop arrays', () => {
    expectTypeOf<ItemFl['model']>().toEqualTypeOf<string[]>()
    expectTypeOf<ItemFl['prop']>().toEqualTypeOf<string[]>()
    expectTypeOf<ItemFl>().toHaveProperty('getValues')
    // The host `prop` encoding is the adapter's own work (design.md §20.9).
    expectTypeOf<ItemFl>().not.toHaveProperty('fieldKey')
  })
})
