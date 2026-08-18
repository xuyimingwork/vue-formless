import { defineComponent, h, type PropType } from 'vue'
import { ElInput, ElOption, ElSelect } from 'element-plus'

/** Thin input: v-model only. FormItem is applied by FormView (ADR-012). */
export const EpInput = defineComponent({
  name: 'EpInput',
  inheritAttrs: false,
  props: {
    modelValue: { type: null, default: undefined },
    disabled: Boolean,
    readonly: Boolean,
    clearable: { type: Boolean, default: undefined },
  },
  emits: ['update:modelValue'],
  setup(props, { attrs, slots, emit }) {
    return () =>
      h(
        ElInput,
        {
          ...attrs,
          modelValue: props.modelValue,
          'onUpdate:modelValue': (v: unknown) => emit('update:modelValue', v),
          disabled: props.disabled,
          readonly: props.readonly || undefined,
          clearable: props.clearable ?? !props.readonly,
          style: { width: '100%', ...(attrs.style as object) },
        },
        slots,
      )
  },
})

export type SelectOption = { label: string; value: string | number }

export const EpSelect = defineComponent({
  name: 'EpSelect',
  inheritAttrs: false,
  props: {
    modelValue: { type: [String, Number], default: undefined },
    disabled: Boolean,
    clearable: { type: Boolean, default: true },
    placeholder: { type: String, default: undefined },
    options: { type: Array as PropType<SelectOption[]>, default: () => [] },
  },
  emits: ['update:modelValue'],
  setup(props, { attrs, emit }) {
    return () =>
      h(
        ElSelect,
        {
          ...attrs,
          modelValue: props.modelValue,
          'onUpdate:modelValue': (v: string | number) => emit('update:modelValue', v),
          disabled: props.disabled,
          clearable: props.clearable,
          placeholder: props.placeholder,
          style: { width: '100%', ...(attrs.style as object) },
        },
        () => props.options.map((opt) => h(ElOption, { label: opt.label, value: opt.value })),
      )
  },
})
