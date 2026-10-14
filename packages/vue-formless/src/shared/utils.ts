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

/**
 * `name` → `Name`, `idCard` → `IdCard`, `''` → `''`. lodash `upperFirst`.
 * @param s the string to capitalize
 */
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
 *
 * @param seed   a boolean floor; the result is then always a boolean
 * @param values the attr values to resolve, nearest wins
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

/** Type-level `upperFirst`: `'name'` → `'Name'`. */
export type UpperFirst<S extends string> = S extends `${infer F}${infer R}`
  ? `${Uppercase<F>}${R}`
  : S

/**
 * `layout-item` → `layoutItem`. Kebab-case only; segments before the last one
 * are left as they are (`fl` → `fl`). Used for channel names, bucket names, and
 * domain-table keys (`createFormFields` normalizes kebab keys to camelCase).
 * @param s the kebab-case string to convert
 */
export function toCamel(s: string): string {
  return s.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())
}

/** Type-level `toCamel` (built-in `Capitalize`): `'layout-item'` → `'layoutItem'`. */
export type ToCamel<S extends string> = S extends `${infer Head}-${infer Tail}`
  ? `${Head}${Capitalize<ToCamel<Tail>>}`
  : S

/**
 * A deferred `expose()` target: a Proxy whose property reads (`get`) and `in`
 * checks forward to the **current** value of a ref-like holder.
 *
 * The holder is `null` until the host mounts (SSR renders no instance), so
 * `expose()` gets a stable object that stays valid even before the real instance
 * API exists. Reads return `undefined` while it's null; methods are bound to the
 * inner object so `this` is the host instance once it does.
 *
 * @param host a holder whose current value the proxy forwards to
 */
export function createExposeProxy<T extends object>(host: { value: T | null }): T {
  return new Proxy(
    {},
    {
      get(_target, key) {
        const inner = host.value
        if (inner == null) return undefined
        const value = Reflect.get(inner, key, inner)
        return typeof value === 'function' ? (value as (...args: unknown[]) => unknown).bind(inner) : value
      },
      has(_target, key) {
        return host.value != null && key in host.value
      },
    },
  ) as T
}

/**
 * Compose an expose target: keys not named in `override` forward to `base`
 * (itself a live `createExposeProxy`, so reads resolve lazily), while keys in
 * `override` shadow them. Lazy keys use an accessor getter — `Reflect.get`
 * re-evaluates it on every read, so e.g. `{ get itemRef() { ... } }` can return
 * `null` before the host mounts and the live instance afterwards. Plain values
 * are returned as-is (a nested `createExposeProxy` keeps its own lazy
 * forwarding + method binding).
 *
 * @param base     the live proxy whose keys are forwarded by default
 * @param override named keys that shadow `base`; accessor getters stay lazy
 */
export function mergeExposeProxy(
  base: Record<string, unknown>,
  override: Record<string, unknown>,
): Record<string, unknown> {
  return new Proxy(
    {},
    {
      get(_target, key) {
        if (key in override) return Reflect.get(override, key)
        return Reflect.get(base, key)
      },
      has(_target, key) {
        return key in override || key in base
      },
    },
  )
}
