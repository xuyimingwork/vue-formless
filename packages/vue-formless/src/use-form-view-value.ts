import {
  computed,
  inject,
  provide,
  ref,
  useAttrs,
} from 'vue'
import { FORM_VIEW_KEY, type FormViewContext } from './injection-keys'
import { bindPathAccess } from './path-access'

const CAMEL_NAME = 'modelValue'
const HYPHEN_NAME = 'model-value'
const CAMEL_EVENT_NAME = `onUpdate:${CAMEL_NAME}`
const HYPHEN_EVENT_NAME = `onUpdate:${HYPHEN_NAME}`

export function useFormViewValue(): FormViewContext {
  // 当前组件的传入属性
  const attrs = useAttrs()

  // 使用方选择的 key
  const key = computed(() => {
    if (CAMEL_NAME in attrs) return CAMEL_NAME
    if (HYPHEN_NAME in attrs) return HYPHEN_NAME
    return undefined
  })

  // 使用方的监听事件（只检测是否拥有该 key 无意义）
  const eventKey = computed(() => {
    if (typeof attrs[CAMEL_EVENT_NAME] === 'function') return CAMEL_EVENT_NAME
    if (typeof attrs[HYPHEN_EVENT_NAME] === 'function') return HYPHEN_EVENT_NAME
    return
  })

  // inject 只在 setup 时读取，此处不是响应式的
  const context = inject(FORM_VIEW_KEY)

  // 数据源
  const source = computed<'context' | 'props' | 'local'>(() => {
    if (key.value) return 'props'
    if (context) return 'context'
    return 'local'
  })

  // 本地变量
  const local = ref()

  // 非 context 的完整读写
  const bound = computed({
    get: () => {
      return source.value === 'props' ? attrs[key.value!] : local.value
    },
    set: (v: unknown) => {
      // props 场景下该步骤跳过，local 场景下，内部数据更新早于通知外部
      if (source.value === 'local') local.value = v
      if (eventKey.value) (attrs[eventKey.value] as any)(v)
    }
  })
  
  // 完整读写拆分为按属性读写
  const access = bindPathAccess(bound)

  const value = computed(() => {
    if (source.value === 'context') return context!.value.value
    return bound.value
  })
  function getIn(path: string) {
    if (source.value === 'context') return context!.getIn(path)
    return access.getIn(path)
  }
  function setIn(path: string, v: unknown) {
    if (source.value === 'context') return context!.setIn(path, v)
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
