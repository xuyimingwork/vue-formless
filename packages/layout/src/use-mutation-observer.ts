import { onBeforeUnmount, onMounted } from 'vue'

/** Minimal MutationObserver wrapper. Does not watch target changes. */
export function useMutationObserver(
  target: () => Element | null | undefined,
  callback: MutationCallback,
  options: MutationObserverInit = { childList: true },
): void {
  let observer: MutationObserver | null = null

  onMounted(() => {
    const el = target()
    if (!el || typeof MutationObserver === 'undefined') return
    observer = new MutationObserver(callback)
    observer.observe(el, options)
  })

  onBeforeUnmount(() => {
    observer?.disconnect()
    observer = null
  })
}
