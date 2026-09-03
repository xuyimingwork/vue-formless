import { inject, onMounted, onUnmounted, provide, ref, type InjectionKey, type Ref } from 'vue'

export const COMPACT_MQ = '(max-width: 1179px)'

const CompactKey: InjectionKey<Ref<boolean>> = Symbol('compact')

export function useMediaQuery(query: string) {
  const match = ref(false)
  let mq: MediaQueryList | undefined
  function sync() {
    if (mq) match.value = mq.matches
  }
  if (typeof window !== 'undefined') {
    mq = window.matchMedia(query)
    match.value = mq.matches
  }
  onMounted(() => {
    mq ??= window.matchMedia(query)
    mq.addEventListener('change', sync)
    sync()
  })
  onUnmounted(() => mq?.removeEventListener('change', sync))
  return match
}

export function provideCompact() {
  const compact = useMediaQuery(COMPACT_MQ)
  provide(CompactKey, compact)
  return compact
}

export function useCompact() {
  const compact = inject(CompactKey)
  if (!compact) throw new Error('Compact was not provided')
  return compact
}
