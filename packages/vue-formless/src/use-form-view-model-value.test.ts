import { nextTick } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { createModelWriter } from './use-form-view-model-value'

describe('createModelWriter', () => {
  it('does not mutate the source object', async () => {
    const source: Record<string, unknown> = { name: 'Ada' }
    const emit = vi.fn()
    const { update } = createModelWriter(() => source, emit)

    update('name', 'Bob')
    await nextTick()

    expect(source).toEqual({ name: 'Ada' })
    expect(emit).toHaveBeenCalledTimes(1)
    expect(emit.mock.calls[0]![0]).toEqual({ name: 'Bob' })
    expect(emit.mock.calls[0]![0]).not.toBe(source)
  })

  it('merges same-tick root updates into one emit', async () => {
    const propsModel: Record<string, unknown> = {}
    const emit = vi.fn()
    const { update } = createModelWriter(() => propsModel, emit)

    update('start', 1)
    update('end', 2)
    await nextTick()

    expect(emit).toHaveBeenCalledTimes(1)
    expect(emit.mock.calls[0]![0]).toEqual({ start: 1, end: 2 })
  })

  it('merges same-tick nested path updates into one emit', async () => {
    const order = { buyers: [{ name: 'Ada', gender: 'f' }] }
    const emit = vi.fn()
    const { update } = createModelWriter(() => order, emit)

    update('buyers[0].name', 'Bob')
    update('buyers[0].gender', 'm')
    await nextTick()

    expect(emit).toHaveBeenCalledTimes(1)
    expect(emit.mock.calls[0]![0]).toEqual({
      buyers: [{ name: 'Bob', gender: 'm' }],
    })
    expect(order.buyers[0]).toEqual({ name: 'Ada', gender: 'f' })
  })

  it('emits separately across ticks', async () => {
    let model: Record<string, unknown> = { a: 0 }
    const emit = vi.fn((next: Record<string, unknown>) => {
      model = next
    })
    const { update } = createModelWriter(() => model, emit)

    update('a', 1)
    await nextTick()
    update('a', 2)
    await nextTick()

    expect(emit).toHaveBeenCalledTimes(2)
    expect(emit.mock.calls[0]![0]).toEqual({ a: 1 })
    expect(emit.mock.calls[1]![0]).toEqual({ a: 2 })
  })

  it('recovers after a flush throws instead of wedging the writer', async () => {
    const model: Record<string, unknown> = { name: 'Ada' }
    const emit = vi.fn()
    let failNextFlush = true
    const { update } = createModelWriter(() => {
      if (failNextFlush) {
        failNextFlush = false
        throw new Error('boom while resolving the model')
      }
      return model
    }, emit)

    // The flush error is no longer swallowed: it rejects the nextTick promise.
    // Capture it so the runner does not report it as an unhandled rejection.
    const rejections: unknown[] = []
    const onRejection = (reason: unknown) => rejections.push(reason)
    process.on('unhandledRejection', onRejection)

    try {
      // The first flush fails while resolving the model.
      update('name', 'Bob')
      await nextTick()
      await new Promise((resolve) => setImmediate(resolve))

      expect(emit).not.toHaveBeenCalled()
      expect(rejections).toHaveLength(1)
      expect(rejections[0]).toBeInstanceOf(Error)

      // The failed flush must not wedge the writer: a later write still
      // schedules a fresh flush and emits.
      update('name', 'Bob')
      await nextTick()

      expect(emit).toHaveBeenCalledTimes(1)
      expect(emit.mock.calls[0]![0]).toEqual({ name: 'Bob' })
    } finally {
      process.off('unhandledRejection', onRejection)
    }
  })

  it('keeps a write made synchronously from emit', async () => {
    let model: Record<string, unknown> = { a: 0 }
    const emitted: Record<string, unknown>[] = []
    const emit = (next: Record<string, unknown>) => {
      model = next
      emitted.push(next)
      // Re-enter the writer while this flush is still on the stack: the write
      // must land in a fresh batch, not the one this flush is about to drop.
      if (next.a === 1 && next.b === undefined) update('b', 2)
    }
    const { update } = createModelWriter(() => model, emit)

    update('a', 1)
    await nextTick()
    await nextTick()

    expect(emitted).toHaveLength(2)
    expect(emitted[0]).toEqual({ a: 1 })
    expect(emitted[1]).toEqual({ a: 1, b: 2 })
  })
})
