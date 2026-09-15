import { describe, expectTypeOf, it } from 'vitest'
import { defineComponent } from 'vue'
import type { ComponentPublicProps, LockedVModelKeys, ControlTagProps } from './control-props'

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

describe('ControlTagProps', () => {
  const Control = defineComponent({
    props: {
      placeholder: { type: String, default: '' },
      rows: { type: Number, default: 2 },
      modelValue: { type: String, default: '' },
    },
    setup: () => () => null,
  })

  it('keeps control props and strips the default v-model port', () => {
    type Props = ControlTagProps<{ component: typeof Control }>
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
    type Props = ControlTagProps<{
      component: typeof Range
      model: ['start', 'end']
    }>
    expectTypeOf<Props>().toHaveProperty('format')
    expectTypeOf<Props>().not.toHaveProperty('start')
    expectTypeOf<Props>().not.toHaveProperty('end')
  })

  it('is empty when component is omitted', () => {
    expectTypeOf<ControlTagProps<{ label: string }>>().toEqualTypeOf<{}>()
  })
})
