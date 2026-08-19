import { ElForm } from 'element-plus'
import { defineComponent, h, ref } from 'vue'
import { useFormContext } from 'vue-formless'

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

/** Adapter Form: ElForm + FormView model. FormView ref proxies this instance. */
export const EpForm = defineComponent({
  name: 'EpForm',
  inheritAttrs: false,
  setup(_, { slots, attrs, expose }) {
    const ctx = useFormContext()
    const formRef = ref<object | null>(null)
    expose(proxyExpose(formRef))

    return () =>
      h(
        ElForm,
        {
          ref: formRef,
          ...attrs,
          model: ctx.model as Record<string, unknown>,
        },
        slots,
      )
  },
})
