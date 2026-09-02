import { ref, toValue, watch, type MaybeRefOrGetter, type Ref } from 'vue'
import { useMutationObserver } from './use-mutation-observer'

/** Document-order element children of `root`. Re-reads on `version` and childList. */
export function useDomChildren(
  root: MaybeRefOrGetter<Element | null | undefined>,
  version: MaybeRefOrGetter<number> = 0,
): Ref<Element[]> {
  const children = ref<Element[]>([])

  function read(): void {
    const el = toValue(root)
    children.value = el ? Array.from(el.children) : []
  }

  watch(() => [toValue(root), toValue(version)] as const, read, { immediate: true })
  useMutationObserver(root, read)

  return children 
}
