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
  const parent = inject(FORM_VIEW_KEY)

  // 判定数据提供方
  const owns = computed<'parent' | 'self' | 'self-local'>(() => {
    if (key.value) return 'self'
    if (parent) return 'parent'
    return 'self-local'
  })

  // 本地变量
  const local = ref()

  // self/self-local 时变量
  const self = computed(() => {
    if (owns.value === 'parent') return
    if (owns.value === 'self') return attrs[key.value!]
    return local.value
  })

  // self/self-local 时更新
  const update = (v: any) => {
    if (owns.value === 'parent') return
    // self 场景下该步骤跳过，self-local 场景下，内部数据更新早于通知外部
    if (owns.value === 'self-local') local.value = v
    // self/self-local 均告知外部值发生变化
    if (eventKey.value) (attrs[eventKey.value] as any)(v)
  }
  
  const own = bindPathAccess(computed({
    get: () => self.value,
    set: update
  }))

  const value = computed(() => {
    if (owns.value === 'parent') return parent!.value
    return self.value
  })
  function getIn(path: string) {
    if (owns.value === 'parent') return parent!.getIn(path)
    return own.getIn(path)
  }
  function setIn(path: string, v: unknown) {
    if (owns.value === 'parent') return parent!.setIn(path, v)
      return own.setIn(path, v)
  }

  // 由于 FormView 仅有值方面的上下文信息，因此上下文在值中一起处理
  provide(FORM_VIEW_KEY, {
    value, getIn, setIn
  })

  return { 
    value, getIn, setIn
  }
}
