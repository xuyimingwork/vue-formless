import { defineComponent, h, type Component, type PropType } from 'vue'
import { ElFormItem, ElInput, ElOption, ElSelect, ElRow, ElCol } from 'element-plus'
import { createFormView } from 'vue-formless'

/**
 * App-level FormView bound to Element Plus grid (once per project).
 */
export const FormView = createFormView({
  Row: ElRow,
  Col: ElCol,
  total: 24,
})

type EpFieldProps = {
  label?: string
  rules?: unknown
  prop?: string
  modelValue?: unknown
  disabled?: boolean
  readonly?: boolean
  clearable?: boolean
}

/**
 * Wrap a control so it accepts formless-injected label / rules / prop
 * and renders ElFormItem + control (FormItem is part of the field UI, not a global registry).
 */
export function epField(Control: Component) {
  return defineComponent({
    name: 'EpField',
    inheritAttrs: false,
    props: {
      label: { type: String, default: undefined },
      rules: { type: [Array, Object] as PropType<unknown>, default: undefined },
      prop: { type: String, default: undefined },
      modelValue: { type: null, default: undefined },
      disabled: { type: Boolean, default: false },
      readonly: { type: Boolean, default: false },
      clearable: { type: Boolean, default: undefined },
    },
    emits: ['update:modelValue'],
    setup(props: EpFieldProps, { attrs, slots, emit }) {
      return () =>
        h(
          ElFormItem,
          {
            label: props.label,
            prop: props.prop,
            rules: props.rules as never,
          },
          () =>
            h(
              Control,
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
            ),
        )
    },
  })
}

/** Default text / textarea field for Element Plus. */
export const EpInput = epField(ElInput)

const GenderSelectControl = defineComponent({
  name: 'GenderSelectControl',
  props: {
    modelValue: { type: String, default: '' },
    disabled: Boolean,
    clearable: { type: Boolean, default: true },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    return () =>
      h(
        ElSelect,
        {
          modelValue: props.modelValue,
          'onUpdate:modelValue': (v: string) => emit('update:modelValue', v),
          disabled: props.disabled,
          clearable: props.clearable,
          placeholder: '请选择',
          style: { width: '100%' },
        },
        () => [
          h(ElOption, { label: '男', value: 'male' }),
          h(ElOption, { label: '女', value: 'female' }),
          h(ElOption, { label: '其他', value: 'other' }),
        ],
      )
  },
})

export const EpGenderSelect = epField(GenderSelectControl)
