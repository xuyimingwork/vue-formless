import { nextTick } from 'vue'

/**
 * FormView write path (ADR-008): never mutate `modelValue`.
 * Same-tick updates (multi v-model / linked fields) merge into one emit,
 * because props stay stale until the parent re-renders.
 */
export function createFormModelWriter(
  getModel: () => Record<string, unknown>,
  emit: (next: Record<string, unknown>) => void,
): { update: (path: string, value: unknown) => void } {
  let patch: Record<string, unknown> | null = null

  function update(path: string, value: unknown): void {
    if (!patch) {
      patch = {}
      nextTick(() => {
        if (!patch) return
        emit({ ...getModel(), ...patch })
        patch = null
      })
    }
    patch[path] = value
  }

  return { update }
}
