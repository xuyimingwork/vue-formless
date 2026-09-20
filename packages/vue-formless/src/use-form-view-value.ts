import {
  computed,
  ComputedRef,
  inject,
  provide,
  ref,
  useAttrs,
} from 'vue'
import { FORM_VIEW_KEY, type FormViewContext } from './injection-keys'
import { bindPathAccess } from './path-access'

export const PORT_NAMES = ['modelValue', 'model-value'] as const
export const PORT_EVENTS = ['onUpdate:modelValue', 'onUpdate:model-value'] as const

/**
 * 本层值的来源（decision.md「实现逻辑」三条）：
 *
 * - `controlled` — attrs 带 v-model key，值由使用方控制（受控组件，decision.md:26）；
 * - `inherit` — 无 key 但有上层 FormView，值继承自祖先（借 CSS `inherit` 的语义）；
 * - `local` — 两者都没有，值由本层自行持有（decision.md:28）。
 */
export type ValueSource = 'controlled' | 'inherit' | 'local'

export function useValueMeta(attrs:  Record<string, unknown>, hasContext: boolean): {
  key: ComputedRef<(typeof PORT_NAMES)[number] | undefined>
  event: ComputedRef<(typeof PORT_EVENTS)[number] | undefined>
  source: ComputedRef<ValueSource>
} {
  const key = computed(() => PORT_NAMES.find((name) => name in attrs))
  const event = computed(() => PORT_EVENTS.find((name) => typeof attrs[name] === 'function'))
  const source = computed<ValueSource>(() => key.value ? 'controlled' : hasContext ? 'inherit' : 'local')
  return { 
    key, 
    event, 
    source 
  }
}

export function useFormViewValue(): FormViewContext {
  // 当前组件的传入属性
  const attrs = useAttrs()

  // inject 只在 setup 时读取，此处不是响应式的
  const context = inject(FORM_VIEW_KEY)

  // 解析 value 的控制方
  const { source, key, event } = useValueMeta(attrs, !!context)

  // 本地变量
  const local = ref()

  // 非 inherit 的完整读写
  const bound = computed({
    get: () => {
      return source.value === 'controlled' ? attrs[key.value!] : local.value
    },
    set: (v: unknown) => {
      // controlled 场景下该步骤跳过，local 场景下，内部数据更新早于通知外部
      if (source.value === 'local') local.value = v
      if (event.value) (attrs[event.value] as any)(v)
    }
  })
  
  // 完整读写拆分为按属性读写
  const access = bindPathAccess(bound)

  const value = computed(() => {
    if (source.value === 'inherit') return context!.value.value
    return bound.value
  })
  function getIn(path: string) {
    if (source.value === 'inherit') return context!.getIn(path)
    return access.getIn(path)
  }
  function setIn(path: string, v: unknown) {
    if (source.value === 'inherit') return context!.setIn(path, v)
      return access.setIn(path, v)
  }

  // 由于 FormView 仅有值方面的上下文信息，因此上下文在值中一起处理
  provide(FORM_VIEW_KEY, {
    value, getIn, setIn
  })

  return { 
    value, getIn, setIn
  }
}
