import { defineComponent, h, type PropType } from 'vue'
import { ElInput, ElOption, ElSelect } from 'element-plus'
import { epField } from './epField'

export const EpInput = epField(ElInput, 'input')

export type SelectOption = { label: string; value: string | number }

const SelectControl = defineComponent({
  name: 'EpSelectControl',
  props: {
    modelValue: { type: [String, Number], default: undefined },
    disabled: Boolean,
    clearable: { type: Boolean, default: true },
    placeholder: { type: String, default: undefined },
    options: { type: Array as PropType<SelectOption[]>, default: () => [] },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    return () =>
      h(
        ElSelect,
        {
          modelValue: props.modelValue,
          'onUpdate:modelValue': (v: string | number) => emit('update:modelValue', v),
          disabled: props.disabled,
          clearable: props.clearable,
          placeholder: props.placeholder,
          style: { width: '100%' },
        },
        () => props.options.map((opt) => h(ElOption, { label: opt.label, value: opt.value })),
      )
  },
})

export const EpSelect = epField(SelectControl, 'select')
