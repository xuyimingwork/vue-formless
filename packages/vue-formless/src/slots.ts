import type { Slot, Slots } from 'vue'
import { channelPrefix } from './channels'

/** `item:` slots go to the host Item, everything else to the control. */
export function splitSlots(slots: Slots): {
  itemSlots: Record<string, Slot>
  controlSlots: Record<string, Slot>
} {
  // Slots have no listener form, so the `item:` prefix is read straight off the table.
  const itemPrefix = channelPrefix('item')
  const itemSlots: Record<string, Slot> = {}
  const controlSlots: Record<string, Slot> = {}
  for (const name of Object.keys(slots)) {
    const slot = slots[name]
    if (!slot) continue
    if (name.startsWith(itemPrefix) && name.length > itemPrefix.length) {
      itemSlots[name.slice(itemPrefix.length)] = slot
    } else {
      controlSlots[name] = slot
    }
  }
  return { itemSlots, controlSlots }
}
