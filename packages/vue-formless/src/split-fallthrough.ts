import type { Slot, Slots } from 'vue'

const ITEM_PREFIX = 'item:'
const ITEM_ON_PREFIX = 'onItem:'
const FL_PREFIX = 'fl:'
const ROW_PREFIX = 'row:'
const COL_PREFIX = 'col:'
const ROW_KEYS = new Set(['column', 'gutter'])
const COL_KEYS = new Set(['span', 'place'])

function devWarn(message: string): void {
  console.warn(message)
}

export function splitSlots(slots: Slots): {
  itemSlots: Record<string, Slot>
  inputSlots: Record<string, Slot>
} {
  const itemSlots: Record<string, Slot> = {}
  const inputSlots: Record<string, Slot> = {}
  for (const name of Object.keys(slots)) {
    const slot = slots[name]
    if (!slot) continue
    if (name.startsWith(ITEM_PREFIX) && name.length > ITEM_PREFIX.length) {
      itemSlots[name.slice(ITEM_PREFIX.length)] = slot
    } else {
      inputSlots[name] = slot
    }
  }
  return { itemSlots, inputSlots }
}

/** `:fl:prop` → `{ prop }`; leftover attrs unchanged. */
export function splitFlAttrs(attrs: Record<string, unknown>): {
  fl: Record<string, unknown>
  rest: Record<string, unknown>
} {
  const fl: Record<string, unknown> = {}
  const rest: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(attrs)) {
    if (key.startsWith(FL_PREFIX) && key.length > FL_PREFIX.length) {
      fl[key.slice(FL_PREFIX.length)] = value
    } else {
      rest[key] = value
    }
  }
  return { fl, rest }
}

export interface LayoutAttrBags {
  row: { column?: unknown; gutter?: unknown }
  col: { span?: unknown; place?: unknown }
  rest: Record<string, unknown>
}

/** Peel closed `row:` / `col:` keys. Unknown names are dropped (dev warn). */
export function splitLayoutAttrs(attrs: Record<string, unknown>): LayoutAttrBags {
  const row: LayoutAttrBags['row'] = {}
  const col: LayoutAttrBags['col'] = {}
  const rest: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(attrs)) {
    if (key.startsWith(ROW_PREFIX) && key.length > ROW_PREFIX.length) {
      const name = key.slice(ROW_PREFIX.length)
      if (ROW_KEYS.has(name)) {
        ;(row as Record<string, unknown>)[name] = value
      } else {
        devWarn(`[vue-formless] unknown row:${name} is ignored`)
      }
    } else if (key.startsWith(COL_PREFIX) && key.length > COL_PREFIX.length) {
      const name = key.slice(COL_PREFIX.length)
      if (COL_KEYS.has(name)) {
        ;(col as Record<string, unknown>)[name] = value
      } else {
        devWarn(`[vue-formless] unknown col:${name} is ignored`)
      }
    } else {
      rest[key] = value
    }
  }
  return { row, col, rest }
}

/**
 * `:item:label-width` → attrs `item:label-width` → Item `label-width`.
 * `@item:validate` → attrs `onItem:validate` → Item `onValidate`.
 */
export function splitFallthrough(attrs: Record<string, unknown>): {
  itemAttrs: Record<string, unknown>
  itemOn: Record<string, unknown>
  inputAttrs: Record<string, unknown>
} {
  const itemAttrs: Record<string, unknown> = {}
  const itemOn: Record<string, unknown> = {}
  const inputAttrs: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(attrs)) {
    if (key.startsWith(ITEM_ON_PREFIX) && key.length > ITEM_ON_PREFIX.length) {
      itemOn[toOnKey(key.slice(ITEM_ON_PREFIX.length))] = value
    } else if (key.startsWith(ITEM_PREFIX) && key.length > ITEM_PREFIX.length) {
      itemAttrs[key.slice(ITEM_PREFIX.length)] = value
    } else {
      inputAttrs[key] = value
    }
  }
  return { itemAttrs, itemOn, inputAttrs }
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
