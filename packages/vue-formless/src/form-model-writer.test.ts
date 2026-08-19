import { nextTick } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { createFormModelWriter } from './form-model-writer'

describe('createFormModelWriter', () => {
  it('does not mutate the source object', async () => {
    const source: Record<string, unknown> = { name: 'Ada' }
    const emit = vi.fn()
    const { update } = createFormModelWriter(() => source, emit)

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
    const { update } = createFormModelWriter(() => propsModel, emit)

    update('start', 1)
    update('end', 2)
    await nextTick()

    expect(emit).toHaveBeenCalledTimes(1)
    expect(emit.mock.calls[0]![0]).toEqual({ start: 1, end: 2 })
  })

  it('merges same-tick nested path updates into one emit', async () => {
    const order = { buyers: [{ name: 'Ada', gender: 'f' }] }
    const emit = vi.fn()
    const { update } = createFormModelWriter(() => order, emit)

    update('name', 'Bob', 'buyers[0]')
    update('gender', 'm', 'buyers[0]')
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
    const { update } = createFormModelWriter(() => model, emit)

    update('a', 1)
    await nextTick()
    update('a', 2)
    await nextTick()

    expect(emit).toHaveBeenCalledTimes(2)
    expect(emit.mock.calls[0]![0]).toEqual({ a: 1 })
    expect(emit.mock.calls[1]![0]).toEqual({ a: 2 })
  })
})
