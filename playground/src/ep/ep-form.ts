import { ElForm } from 'element-plus'
import { defineComponent, h, ref, type PropType } from 'vue'
import type { FormFl } from 'vue-formless'

function proxyExpose(host: { value: object | null }): object {
  return new Proxy(
    {},
    {
      get(_target, key) {
        const inner = host.value
        if (inner == null) return undefined
        const value = Reflect.get(inner, key, inner)
        return typeof value === 'function'
          ? (value as (...args: unknown[]) => unknown).bind(inner)
          : value
      },
      has(_target, key) {
        return host.value != null && key in host.value
      },
    },
  )
}

/** Adapter Form: ElForm + FormView `modelValue`. FormView ref proxies this instance. */
export const EpForm = defineComponent({
  name: 'EpForm',
  inheritAttrs: false,
  props: {
    modelValue: { required: true },
    fl: {
      type: Object as PropType<FormFl>,
      default: () => ({ layout: false, form: true, item: true }),
    },
  },
  setup(props, { slots, attrs, expose }) {
    const formRef = ref<object | null>(null)
    expose(proxyExpose(formRef))

    return () =>
      h(
        ElForm,
        {
          ref: formRef,
          ...attrs,
          model: props.modelValue as Record<string, unknown>,
        },
        slots,
      )
  },
})
