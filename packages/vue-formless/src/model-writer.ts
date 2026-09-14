import { nextTick } from 'vue'
import { setIn } from './path-access'

export interface ModelUpdate {
  prop: string
  value: unknown
}

/**
 * Coalescing path writer over one model source: never mutates the source.
 * Same-tick updates merge into one emit on nextTick; nested props clone
 * arrays on write. Generic — no notion of FormView layers or the parent
 * chain; owning layers call it, inherited layers forward to an ancestor.
 */
export function createModelWriter(
  getModel: () => unknown,
  emit: (next: unknown) => void,
): { update: (prop: string, value: unknown) => void } {
  let pending: ModelUpdate[] | null = null

  function update(prop: string, value: unknown): void {
    if (!pending) {
      pending = []
      nextTick(() => {
        // Detach the batch before flushing: a throwing `getModel` / `emit`
        // must not wedge the writer, since `pending` is already null and the
        // next update schedules a fresh flush. It also keeps a re-entrant
        // update (fired synchronously from `emit`) out of this batch instead
        // of appending it to an array this flush is about to drop.
        const batch = pending
        pending = null

        // Invariant: non-empty while a flush is scheduled; the guard just
        // keeps a (hypothetical) empty batch from emitting an unchanged model.
        if (!batch?.length) return

        let next = getModel()
        for (const item of batch) {
          next = setIn(next, item.prop, item.value)
        }
        emit(next)
      })
    }
    pending.push({ prop, value })
  }

  return { update }
}
