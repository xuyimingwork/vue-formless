import { describe, expectTypeOf, it } from 'vitest'
import type {
  FieldSchemaExtras,
  FlExtraProps,
  FormFieldTagProps,
  ItemFl,
} from './item-adapter'

describe('FieldSchema extras', () => {
  it('kernel FormFieldTagProps are only the fl / layout keys', () => {
    expectTypeOf<FieldSchemaExtras>().toEqualTypeOf<{}>()
    expectTypeOf<FormFieldTagProps>().toEqualTypeOf<{
      'fl:prop'?: string | string[]
      'fl:model'?: string | string[]
      'fl:item'?: boolean
      'fl:cell'?: 'wrap' | 'embed' | 'wrap-embed'
      'col:span'?: string | number
      'col:place'?: 'auto' | 'start' | 'end'
      'row:column'?: number
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
