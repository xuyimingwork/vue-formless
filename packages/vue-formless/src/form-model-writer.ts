import { nextTick } from 'vue'
import { setIn } from './model-path'

export interface ModelUpdate {
  prop: string
  value: unknown
}

/**
 * FormView write path (ADR-008): never mutate `modelValue`.
 * Same-tick updates merge into one emit; nested props clone arrays on write.
 */
export function createFormModelWriter(
  getModel: () => unknown,
  emit: (next: unknown) => void,
): { update: (prop: string, value: unknown) => void } {
  let pending: ModelUpdate[] | null = null

  function update(prop: string, value: unknown): void {
    if (!pending) {
      pending = []
      nextTick(() => {
        if (!pending?.length) {
          pending = null
          return
        }
        let next = getModel()
        for (const item of pending) {
          next = setIn(next, item.prop, item.value)
        }
        pending = null
        emit(next)
      })
    }
    pending.push({ prop, value })
  }

  return { update }
}
