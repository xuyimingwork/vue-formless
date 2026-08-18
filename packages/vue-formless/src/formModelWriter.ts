import { nextTick } from 'vue'
import { setIn } from './modelPath'

export interface ModelUpdate {
  prop: string
  value: unknown
  path?: string
}

/**
 * FormView write path (ADR-008): never mutate `modelValue`.
 * Same-tick updates merge into one emit; nested paths clone arrays on write.
 */
export function createFormModelWriter(
  getModel: () => unknown,
  emit: (next: unknown) => void,
): { update: (prop: string, value: unknown, path?: string) => void } {
  let pending: ModelUpdate[] | null = null

  function update(prop: string, value: unknown, path?: string): void {
    if (!pending) {
      pending = []
      nextTick(() => {
        if (!pending?.length) {
          pending = null
          return
        }
        let next = getModel()
        for (const item of pending) {
          next = setIn(next, item.path, item.prop, item.value)
        }
        pending = null
        emit(next)
      })
    }
    pending.push({ prop, value, path })
  }

  return { update }
}
