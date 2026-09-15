import { describe, expect, it } from 'vitest'
import type { Slot, Slots } from 'vue'
import { splitSlots } from './slots'

describe('splitSlots', () => {
  it('strips item: prefix for Item slots', () => {
    const append = (() => []) as unknown as Slot
    const label = (() => []) as unknown as Slot
    const item = (() => []) as unknown as Slot
    const slots = {
      append,
      'item:label': label,
      item,
    } as unknown as Slots
    const split = splitSlots(slots)
    expect(split.controlSlots).toEqual({ append, item })
    expect(split.itemSlots).toEqual({ label })
  })
})
