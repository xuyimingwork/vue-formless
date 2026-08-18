import type { Slot, Slots } from 'vue'

const ITEM_SLOT_PREFIX = 'item:'
const ITEM_ON_PREFIX = 'onItem:'

export function splitSlots(slots: Slots): {
  itemSlots: Record<string, Slot>
  inputSlots: Record<string, Slot>
} {
  const itemSlots: Record<string, Slot> = {}
  const inputSlots: Record<string, Slot> = {}
  for (const name of Object.keys(slots)) {
    const slot = slots[name]
    if (!slot) continue
    if (name.startsWith(ITEM_SLOT_PREFIX) && name.length > ITEM_SLOT_PREFIX.length) {
      itemSlots[name.slice(ITEM_SLOT_PREFIX.length)] = slot
    } else {
      inputSlots[name] = slot
    }
  }
  return { itemSlots, inputSlots }
}

/** `@item:validate` → attrs `onItem:validate` → Item `onValidate`. */
export function splitFallthrough(attrs: Record<string, unknown>): {
  itemOn: Record<string, unknown>
  inputAttrs: Record<string, unknown>
} {
  const itemOn: Record<string, unknown> = {}
  const inputAttrs: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(attrs)) {
    if (key.startsWith(ITEM_ON_PREFIX) && key.length > ITEM_ON_PREFIX.length) {
      itemOn[toOnKey(key.slice(ITEM_ON_PREFIX.length))] = value
    } else {
      inputAttrs[key] = value
    }
  }
  return { itemOn, inputAttrs }
}

function toOnKey(event: string): string {
  const colon = event.indexOf(':')
  if (colon === -1) return `on${capitalize(event)}`
  return `on${capitalize(event.slice(0, colon))}:${event.slice(colon + 1)}`
}

function capitalize(s: string): string {
  if (!s) return s
  return s.charAt(0).toUpperCase() + s.slice(1)
}
