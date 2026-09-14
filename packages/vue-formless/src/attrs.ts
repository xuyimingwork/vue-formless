import { computed, type ComputedRef } from 'vue'
import {
  FL_PREFIX,
  LAYOUT_ITEM_PREFIX,
  LAYOUT_PREFIX,
} from './channels'

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

/**
 * Peel `prefix` keys and strip the prefix (`layout-item:span` → `span`).
 * Open bag: unknown names stay in `taken` for the host to ignore.
 */
export function takePrefixed(
  attrs: Record<string, unknown>,
  prefix: string,
): { taken: Record<string, unknown>; rest: Record<string, unknown> } {
  const taken: Record<string, unknown> = {}
  const rest: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(attrs)) {
    if (key.startsWith(prefix) && key.length > prefix.length) {
      taken[key.slice(prefix.length)] = value
    } else {
      rest[key] = value
    }
  }
  return { taken, rest }
}

/**
 * Vue attr / boolean-attr → boolean.
 * `true` / `''` (bare attr) → true; `false` / `'false'` → false; missing → `defaultValue`.
 */
export function toAttrBoolean(value: unknown, defaultValue = false): boolean {
  if (value === undefined || value === null) return defaultValue
  if (value === true || value === '') return true
  if (value === false || value === 'false') return false
  if (value === 'true') return true
  return defaultValue
}

export interface FormlessPropBags {
  /** Unprefixed host fallthrough (`item:` / listeners stay here). */
  props: Record<string, unknown>
  /** `layout:*` → LayoutView (page window / wrap-embed inner). */
  layoutProps: Record<string, unknown>
  /** `layout-item:*` → LayoutItem (this cell). */
  layoutItemProps: Record<string, unknown>
  formlessProps: Record<string, unknown>
}

/** Peel `fl:` / `layout:` / `layout-item:` once. */
export function splitFormlessProps(attrs: Record<string, unknown>): FormlessPropBags {
  const { fl: formlessProps, rest: afterFl } = splitFlAttrs(attrs)
  // `layout-item:` first: it shares the `layout` stem but not the `layout:` prefix.
  const { taken: layoutItemProps, rest: afterItem } = takePrefixed(
    afterFl,
    LAYOUT_ITEM_PREFIX,
  )
  const { taken: layoutProps, rest: props } = takePrefixed(afterItem, LAYOUT_PREFIX)
  return { props, layoutProps, layoutItemProps, formlessProps }
}

/** Reactive bags over Vue `attrs` (or any attr record). Shared by FormView / Field / Cell. */
export function useFormlessProps(attrs: Record<string, unknown>): {
  props: ComputedRef<Record<string, unknown>>
  layoutProps: ComputedRef<Record<string, unknown>>
  layoutItemProps: ComputedRef<Record<string, unknown>>
  formlessProps: ComputedRef<Record<string, unknown>>
} {
  const bags = computed(() => splitFormlessProps(attrs))
  return {
    props: computed(() => bags.value.props),
    layoutProps: computed(() => bags.value.layoutProps),
    layoutItemProps: computed(() => bags.value.layoutItemProps),
    formlessProps: computed(() => bags.value.formlessProps),
  }
}
