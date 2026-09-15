import type { Slot, Slots } from 'vue'
import { ITEM_PREFIX } from './channels'

/** `item:` slots go to the host Item, everything else to the control. */
export function splitSlots(slots: Slots): {
  itemSlots: Record<string, Slot>
  controlSlots: Record<string, Slot>
} {
  const itemSlots: Record<string, Slot> = {}
  const controlSlots: Record<string, Slot> = {}
  for (const name of Object.keys(slots)) {
    const slot = slots[name]
    if (!slot) continue
    if (name.startsWith(ITEM_PREFIX) && name.length > ITEM_PREFIX.length) {
      itemSlots[name.slice(ITEM_PREFIX.length)] = slot
    } else {
      controlSlots[name] = slot
    }
  }
  return { itemSlots, controlSlots }
}
