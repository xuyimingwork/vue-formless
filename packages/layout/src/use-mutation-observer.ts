import {
  onBeforeUnmount,
  onMounted,
  toValue,
  watch,
  type MaybeRefOrGetter,
} from 'vue'

/** Minimal MutationObserver wrapper. Re-binds when `target` resolves to a new element. */
export function useMutationObserver(
  target: MaybeRefOrGetter<Element | null | undefined>,
  callback: MutationCallback,
  options: MutationObserverInit = { childList: true },
): void {
  if (typeof MutationObserver === 'undefined') return

  let observer: MutationObserver | null = null

  function bind(el: Element | null | undefined): void {
    observer?.disconnect()
    observer = null
    if (!el) return
    observer = new MutationObserver(callback)
    observer.observe(el, options)
  }

  onMounted(() => bind(toValue(target)))
  const stop = watch(() => toValue(target), bind, { flush: 'post' })

  onBeforeUnmount(() => {
    stop()
    observer?.disconnect()
    observer = null
  })
}
