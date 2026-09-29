/**
 * Generic helpers shared across the kernel. No formless semantics.
 *
 * Names follow lodash (`upperFirst`) so the intent is obvious at the call site;
 * anything lodash has no equivalent for stays descriptive.
 */

/**
 * `Component` is a union; JSX needs a constructable host. The one copy the
 * formless kernel uses — `@vue-formless/layout` keeps its own, and neither
 * imports the other's.
 */
export type JsxHost = new () => { $props: Record<string, unknown> }

/** `name` → `Name`, `idCard` → `IdCard`, `''` → `''`. lodash `upperFirst`. */
export function upperFirst(s: string): string {
  if (!s) return s
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/**
 * Vue attr / boolean-attr → boolean. The last argument that is not `undefined`
 * wins; `''` (a bare attr) is `true`, everything else is its truthiness — so the
 * string `'false'` is `true`, matching Vue's own attr coercion. Returns
 * `undefined` only when every argument is `undefined`.
 *
 * A leading `boolean` seed is the floor: with it the result is always a
 * `boolean`, which is what lets the normalized snapshot declare a required
 * `item: boolean` instead of `boolean | undefined`.
 *
 * Not for three-way switches: `fl:form`'s `'auto'` cannot ride this (it would
 * read as `true`); FormView resolves that in its own `form` computed.
 */
export function getAttrBoolean(seed: boolean, ...values: unknown[]): boolean
export function getAttrBoolean(...values: unknown[]): boolean | undefined
export function getAttrBoolean(...values: unknown[]): boolean | undefined {
  const resolve = (value: unknown) => {
    if (value === undefined) return
    if (value === '') return true
    return !!value
  }
  return values.reduce((result, v) => {
    return typeof resolve(v) === 'boolean' ? resolve(v) : result
  }, undefined) as boolean | undefined
}

/** Type-level `upperFirst`: `'name'` → `'Name'` (design.md §11). */
export type UpperFirst<S extends string> = S extends `${infer F}${infer R}`
  ? `${Uppercase<F>}${R}`
  : S

/**
 * `layout-item` → `layoutItem`. Kebab-case only; segments before the last one
 * are left as they are (`fl` → `fl`). Used for channel names, bucket names, and
 * domain-table keys (`createFormFields` normalizes kebab keys to camelCase).
 */
export function toCamel(s: string): string {
  return s.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())
}

/** Type-level `toCamel` (built-in `Capitalize`): `'layout-item'` → `'layoutItem'`. */
export type ToCamel<S extends string> = S extends `${infer Head}-${infer Tail}`
  ? `${Head}${Capitalize<ToCamel<Tail>>}`
  : S
