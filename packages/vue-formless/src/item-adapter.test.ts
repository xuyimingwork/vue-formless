import { describe, expectTypeOf, it } from 'vitest'
import type {
  ControlSchemaExtras,
  FlExtraProps,
  FormControlProps,
  FormViewItemProps,
  ItemFl,
} from './item-adapter'

describe('ControlSchema extras', () => {
  it('kernel FormControlProps are only the fl shell keys', () => {
    expectTypeOf<ControlSchemaExtras>().toEqualTypeOf<{}>()
    expectTypeOf<FormControlProps>().toEqualTypeOf<{
      'fl:prop'?: string | string[]
      'fl:span'?: number
      'fl:item'?: boolean
      'fl:layout'?: boolean
    }>()
    expectTypeOf<FormViewItemProps>().toEqualTypeOf<{
      'fl:prop'?: string | string[]
      'fl:span'?: number
      'fl:layout'?: boolean
    }>()
  })

  it('prefixes extra keys as optional fl: tag props', () => {
    expectTypeOf<FlExtraProps<{ label?: string; count: number }>>().toEqualTypeOf<{
      'fl:label'?: string
      'fl:count'?: number
    }>()
  })

  it('ItemFl keeps kernel wiring', () => {
    expectTypeOf<ItemFl>().toHaveProperty('controlKey')
    expectTypeOf<ItemFl>().toHaveProperty('binding')
    expectTypeOf<ItemFl>().toHaveProperty('getValues')
  })
})
