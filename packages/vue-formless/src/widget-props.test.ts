import { describe, expectTypeOf, it } from 'vitest'
import { defineComponent } from 'vue'
import type { ComponentPublicProps, LockedVModelKeys, WidgetTagProps } from './widget-props'

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
    const Input = defineComponent({
      props: {
        placeholder: { type: String, default: '' },
        rows: { type: Number, default: 2 },
      },
      setup: () => () => null,
    })
    expectTypeOf<ComponentPublicProps<typeof Input>>().toHaveProperty('placeholder')
    expectTypeOf<ComponentPublicProps<typeof Input>>().toHaveProperty('rows')
  })

  it('is empty for omitted widgets', () => {
    expectTypeOf<ComponentPublicProps<undefined>>().toEqualTypeOf<{}>()
    expectTypeOf<ComponentPublicProps<never>>().toEqualTypeOf<{}>()
  })
})

describe('WidgetTagProps', () => {
  const Input = defineComponent({
    props: {
      placeholder: { type: String, default: '' },
      rows: { type: Number, default: 2 },
      modelValue: { type: String, default: '' },
    },
    setup: () => () => null,
  })

  it('keeps widget props and strips the default v-model port', () => {
    type Props = WidgetTagProps<{ component: typeof Input }>
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
    type Props = WidgetTagProps<{
      component: typeof Range
      model: ['start', 'end']
    }>
    expectTypeOf<Props>().toHaveProperty('format')
    expectTypeOf<Props>().not.toHaveProperty('start')
    expectTypeOf<Props>().not.toHaveProperty('end')
  })

  it('is empty when component is omitted', () => {
    expectTypeOf<WidgetTagProps<{ label: string }>>().toEqualTypeOf<{}>()
  })
})
