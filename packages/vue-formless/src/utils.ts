/**
 * Generic helpers shared across the kernel. No formless semantics.
 *
 * Names follow lodash (`upperFirst` / `omit`) so the intent is obvious at the
 * call site; anything lodash has no equivalent for stays descriptive.
 */

/** `name` → `Name`, `idCard` → `IdCard`, `''` → `''`. lodash `upperFirst`. */
export function upperFirst(s: string): string {
  if (!s) return s
  return s.charAt(0).toUpperCase() + s.slice(1)
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

/** Type-level `upperFirst`: `'name'` → `'Name'` (design.md §11). */
export type UpperFirst<S extends string> = S extends `${infer F}${infer R}`
  ? `${Uppercase<F>}${R}`
  : S

/**
 * `layout-item` → `layoutItem`. Kebab-case only; segments before the last one
 * are left as they are (`fl` → `fl`). Used for channel names and bucket names.
 */
export function toCamel(s: string): string {
  return s.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())
}

/** Type-level `toCamel` (built-in `Capitalize`): `'layout-item'` → `'layoutItem'`. */
export type ToCamel<S extends string> = S extends `${infer Head}-${infer Tail}`
  ? `${Head}${Capitalize<ToCamel<Tail>>}`
  : S

/** Shallow copy of `record` without `keys`. Values are copied as-is. lodash `omit`. */
export function omit(
  record: Record<string, unknown>,
  keys: Iterable<string>,
): Record<string, unknown> {
  const skip = new Set(keys)
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(record)) {
    if (!skip.has(key)) out[key] = value
  }
  return out
}

/** The `undefined`-valued entries dropped. Roughly lodash `omitBy(_, isUndefined)`. */
export function omitUndefined(
  record: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(record)) {
    if (value !== undefined) out[key] = value
  }
  return out
}
