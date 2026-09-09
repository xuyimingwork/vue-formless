import { describe, expectTypeOf, it } from 'vitest'
import type {
  FieldSchemaExtras,
  FlExtraProps,
  FormFieldProps,
  FormCellTagProps,
  ItemFl,
} from './item-adapter'

describe('FieldSchema extras', () => {
  it('kernel FormFieldProps are only the fl shell keys', () => {
    expectTypeOf<FieldSchemaExtras>().toEqualTypeOf<{}>()
    expectTypeOf<FormFieldProps>().toEqualTypeOf<{
      'fl:prop'?: string | string[]
      'fl:item'?: boolean
      'fl:cell'?: 'wrap' | 'embed' | 'wrap-embed'
      'col:span'?: string | number
      'col:place'?: 'auto' | 'start' | 'end'
      'row:column'?: number
      'row:gutter'?: number
    }>()
    expectTypeOf<FormCellTagProps>().toEqualTypeOf<{
      'fl:prop'?: string | string[]
      'fl:item'?: boolean
      'col:span'?: string | number
      'col:place'?: 'auto' | 'start' | 'end'
    }>()
  })

  it('prefixes extra keys as optional fl: tag props', () => {
    expectTypeOf<FlExtraProps<{ label?: string; count: number }>>().toEqualTypeOf<{
      'fl:label'?: string
      'fl:count'?: number
    }>()
  })

  it('ItemFl keeps kernel wiring', () => {
    expectTypeOf<ItemFl>().toHaveProperty('fieldKey')
    expectTypeOf<ItemFl>().toHaveProperty('binding')
    expectTypeOf<ItemFl>().toHaveProperty('getValues')
  })
})
