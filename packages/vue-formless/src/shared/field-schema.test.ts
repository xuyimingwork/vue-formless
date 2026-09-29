import { describe, expectTypeOf, it } from 'vitest'
import { defineComponent, type Component } from 'vue'
import type {
  ComponentPublicProps,
  FormControlProps,
  FormFieldCustomTagProps,
  FormFieldExtras,
  FormFieldFormless,
  FormFieldFormlessField,
  FormFieldFormlessFieldRaw,
  FormFieldFormlessRaw,
  FormFieldProps,
  FormFieldPropRaw,
  FormFieldVModel,
  FormFieldVModelRaw,
  LockedVModelKeys,
} from './field-schema'

describe('CreateFormFieldOptions extras', () => {
  it('kernel FormFieldProps are only the fl / layout keys', () => {
    expectTypeOf<FormFieldExtras>().toEqualTypeOf<{}>()
    expectTypeOf<FormFieldProps>().toEqualTypeOf<{
      'fl:prop'?: string | readonly string[]
      'fl:model'?: string | readonly string[]
      'fl:item'?: boolean
      'fl:field'?: 'auto' | 'embed' | 'wrap-embed'
      'fl:component'?: Component
      'layout-item:span'?: string | number
      'layout-item:place'?: 'auto' | 'start' | 'end'
      'layout:column'?: number
    }>()
  })

  it('prefixes extra keys as optional fl: tag props', () => {
    expectTypeOf<FormFieldCustomTagProps<{ label?: string; count: number }>>().toEqualTypeOf<{
      'fl:label'?: string
      'fl:count'?: number
    }>()
  })
})

describe('two-state pairs (declared vs normalized)', () => {
  it('`field` loses `auto` once assembled', () => {
    expectTypeOf<Extract<FormFieldFormlessFieldRaw, 'auto'>>().toEqualTypeOf<'auto'>()
    expectTypeOf<Extract<FormFieldFormlessField, 'auto'>>().toEqualTypeOf<never>()
    expectTypeOf<FormFieldFormlessRaw['field']>().toEqualTypeOf<FormFieldFormlessFieldRaw | undefined>()
    expectTypeOf<FormFieldFormless['field']>().toEqualTypeOf<FormFieldFormlessField>()
  })

  it('`model` / `prop` become aligned arrays once normalized', () => {
    expectTypeOf<FormFieldFormlessRaw['model']>().toEqualTypeOf<FormFieldVModelRaw | undefined>()
    expectTypeOf<FormFieldFormlessRaw['prop']>().toEqualTypeOf<FormFieldPropRaw | undefined>()
    expectTypeOf<FormFieldFormless['model']>().toEqualTypeOf<FormFieldVModel>()
    expectTypeOf<FormFieldFormless['prop']>().toEqualTypeOf<FormFieldVModel | undefined>()
  })

  it('`item` has no second state: the declaration already says boolean', () => {
    expectTypeOf<FormFieldFormlessRaw['item']>().toEqualTypeOf<boolean | undefined>()
    expectTypeOf<FormFieldFormless['item']>().toEqualTypeOf<boolean>()
  })
})

describe('FormFieldFormless snapshot', () => {
  it('is the normalized snapshot: aligned model / prop + resolved field', () => {
    expectTypeOf<FormFieldFormless['model']>().toEqualTypeOf<(string | undefined)[]>()
    expectTypeOf<FormFieldFormless['prop']>().toEqualTypeOf<(string | undefined)[] | undefined>()
    expectTypeOf<FormFieldFormless['field']>().toEqualTypeOf<'wrap' | 'embed' | 'wrap-embed'>()
    // The host `prop` encoding is the adapter's own work (design.md §20.9); the
    // kernel ships no identity name and never grew a `getValues`.
    expectTypeOf<FormFieldFormless>().not.toHaveProperty('fieldKey')
    expectTypeOf<FormFieldFormless>().not.toHaveProperty('getValues')
  })

  it('FormFieldFormlessRaw keeps the declared shape optional and stays open', () => {
    expectTypeOf<FormFieldFormlessRaw['model']>().toEqualTypeOf<FormFieldVModelRaw | undefined>()
    expectTypeOf<FormFieldFormlessRaw['prop']>().toEqualTypeOf<FormFieldPropRaw | undefined>()
    expectTypeOf<FormFieldFormlessRaw['field']>().toEqualTypeOf<FormFieldFormlessFieldRaw | undefined>()
    // `component` stays loose on the declaration so a field table can pass any
    // control and let the tag infer its public props.
    expectTypeOf<FormFieldFormlessRaw['component']>().toEqualTypeOf<unknown>()
    // `name` is factory-only and never enters the bag.
    expectTypeOf<FormFieldFormlessRaw>().not.toHaveProperty('name')
    // A raw bag carries keys the kernel never reads (schema preset ⊕ tag attrs).
    expectTypeOf<FormFieldFormlessRaw['whatever']>().toEqualTypeOf<unknown>()
  })
})

describe('LockedVModelKeys', () => {
  it('defaults to modelValue', () => {
    expectTypeOf<LockedVModelKeys<undefined>>().toEqualTypeOf<
      'modelValue' | 'onUpdate:modelValue'
    >()
  })

  it('locks a single named port', () => {
    expectTypeOf<LockedVModelKeys<'start'>>().toEqualTypeOf<'start' | 'onUpdate:start'>()
  })

  it('locks tuple ports', () => {
    expectTypeOf<LockedVModelKeys<['start', 'end']>>().toEqualTypeOf<
      'start' | 'end' | 'onUpdate:start' | 'onUpdate:end'
    >()
  })

  it('does not treat a wide string[] as port names', () => {
    expectTypeOf<LockedVModelKeys<string[]>>().toEqualTypeOf<
      'modelValue' | 'onUpdate:modelValue'
    >()
  })
})

describe('ComponentPublicProps', () => {
  it('reads declared props from defineComponent', () => {
    const Control = defineComponent({
      props: {
        placeholder: { type: String, default: '' },
        rows: { type: Number, default: 2 },
      },
      setup: () => () => null,
    })
    expectTypeOf<ComponentPublicProps<typeof Control>>().toHaveProperty('placeholder')
    expectTypeOf<ComponentPublicProps<typeof Control>>().toHaveProperty('rows')
  })

  it('is empty for omitted controls', () => {
    expectTypeOf<ComponentPublicProps<undefined>>().toEqualTypeOf<{}>()
    expectTypeOf<ComponentPublicProps<never>>().toEqualTypeOf<{}>()
  })
})

describe('FormControlProps', () => {
  const Control = defineComponent({
    props: {
      placeholder: { type: String, default: '' },
      rows: { type: Number, default: 2 },
      modelValue: { type: String, default: '' },
    },
    setup: () => () => null,
  })

  it('keeps control props and strips the default v-model port', () => {
    type Props = FormControlProps<{ component: typeof Control }>
    expectTypeOf<Props>().toHaveProperty('placeholder')
    expectTypeOf<Props>().toHaveProperty('rows')
    expectTypeOf<Props>().not.toHaveProperty('modelValue')
    expectTypeOf<Props>().not.toHaveProperty('onUpdate:modelValue')
  })

  it('strips schema model ports', () => {
    const Range = defineComponent({
      props: {
        start: { type: String, default: '' },
        end: { type: String, default: '' },
        format: { type: String, default: '' },
      },
      setup: () => () => null,
    })
    type Props = FormControlProps<{
      component: typeof Range
      model: ['start', 'end']
    }>
    expectTypeOf<Props>().toHaveProperty('format')
    expectTypeOf<Props>().not.toHaveProperty('start')
    expectTypeOf<Props>().not.toHaveProperty('end')
  })

  it('is empty when component is omitted', () => {
    expectTypeOf<FormControlProps<{ label: string }>>().toEqualTypeOf<{}>()
  })
})
