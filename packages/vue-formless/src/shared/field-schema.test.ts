import { describe, expectTypeOf, it } from 'vitest'
import type { Component } from 'vue'
import type {
  ControlProp,
  ControlVModel,
  FieldMode,
  FieldSchemaExtras,
  FlExtraProps,
  FormFieldFormless,
  FormFieldFormlessRaw,
  FormFieldProps,
} from './field-schema'

describe('FieldSchema extras', () => {
  it('kernel FormFieldProps are only the fl / layout keys', () => {
    expectTypeOf<FieldSchemaExtras>().toEqualTypeOf<{}>()
    expectTypeOf<FormFieldProps>().toEqualTypeOf<{
      'fl:prop'?: string | string[]
      'fl:model'?: string | string[]
      'fl:item'?: boolean
      'fl:field'?: 'auto' | 'wrap' | 'embed' | 'wrap-embed'
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

  it('FormFieldFormless is the normalized snapshot: aligned model / prop + resolved field', () => {
    expectTypeOf<FormFieldFormless['model']>().toEqualTypeOf<(string | undefined)[]>()
    expectTypeOf<FormFieldFormless['prop']>().toEqualTypeOf<(string | undefined)[] | undefined>()
    expectTypeOf<FormFieldFormless['field']>().toEqualTypeOf<'wrap' | 'embed' | 'wrap-embed'>()
    // The host `prop` encoding is the adapter's own work (design.md §20.9); the
    // kernel ships no identity name and never grew a `getValues`.
    expectTypeOf<FormFieldFormless>().not.toHaveProperty('fieldKey')
    expectTypeOf<FormFieldFormless>().not.toHaveProperty('getValues')
  })

  it('FormFieldFormlessRaw keeps the declared shape optional and stays open', () => {
    expectTypeOf<FormFieldFormlessRaw['model']>().toEqualTypeOf<ControlVModel | undefined>()
    expectTypeOf<FormFieldFormlessRaw['prop']>().toEqualTypeOf<ControlProp | undefined>()
    expectTypeOf<FormFieldFormlessRaw['field']>().toEqualTypeOf<FieldMode | undefined>()
    expectTypeOf<FormFieldFormlessRaw['component']>().toEqualTypeOf<Component | undefined>()
    // A raw bag carries keys the kernel never reads (schema preset ⊕ tag attrs).
    expectTypeOf<FormFieldFormlessRaw['whatever']>().toEqualTypeOf<unknown>()
  })
})
