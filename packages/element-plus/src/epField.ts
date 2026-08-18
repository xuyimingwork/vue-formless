import { defineComponent, h, type Component, type PropType } from 'vue'
import { ElFormItem } from 'element-plus'
import { defaultPlaceholder, type PlaceholderKind } from './placeholder'

export function epField(Control: Component, kind: PlaceholderKind = 'input') {
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
    setup(props, { attrs, slots, emit }) {
      return () => {
        const placeholder =
          (attrs.placeholder as string | undefined) ?? defaultPlaceholder(kind, props.label)

        return h(
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
                placeholder,
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
      }
    },
  })
}
