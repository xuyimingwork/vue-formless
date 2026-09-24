import type { Component } from 'vue'

/** Static host props, or derived from that layer's snapshot. */
export type HostProps<TFl> =
  | Record<string, unknown>
  | ((fl: TFl) => Record<string, unknown> | undefined)

/**
 * Field binding (design.md §7.1):
 * - `model` — v-model names on the control (identity). Default `'modelValue'`.
 * - `prop`  — location(s) from FormView root (`name`, `buyers[0].name`). Default: the schema key.
 * `prop` array pairs with `model` (prefix-aligned). Extra model ports are unbound.
 */
export type ControlVModel = string | readonly string[]
export type ControlProp = string | readonly string[]

/** Static `formless` bag a control may declare on `ComponentCustomOptions`. */
export interface ControlFormless {
  /** v-model ports on the control (design.md §7.1). */
  model?: string | string[]
  /**
   * Composite marker (design.md §8): "my inner `<FormField>`s need an inner
   * LayoutView whenever this field is boxed". Only `'embed'` is meaningful —
   * it is the control's **nature**, not a placement, so it is read at render
   * (`FormFieldCore`) and folded into `fl:field`, never merged as a preset layer.
   */
  field?: 'embed'
}

declare module 'vue' {
  interface ComponentCustomOptions {
    formless?: ControlFormless
  }
}

/**
 * `field` assembly placement (design.md §8) — the four **writable** values.
 * Omit = `'auto'`: defer to the control's static `formless.field`.
 */
export type FieldMode = 'auto' | 'wrap' | 'embed' | 'wrap-embed'

/** Kernel-owned FieldSchema keys. Not extras; tags already have matching `fl:*` where allowed. */
export type FieldSchemaKernelKey =
  | 'component'
  | 'props'
  | 'model'
  | 'prop'
  | 'item'
  | 'field'

/**
 * Field identity. Adapter extras (e.g. `label`) via `declare module 'vue-formless'`.
 * Extra keys become `ItemFl` keys and optional `fl:*` tag props.
 */
export interface FieldSchema {
  /**
   * The control only (no host Item). Receives v-model bindings from formless.
   * A control may also declare static `formless: { model, item, field }`.
   */
  component?: Component
  /** Control defaults: static object, or derived from the field snapshot. */
  props?: HostProps<ItemFl>
  /**
   * v-model names on the control (design.md §7.1). Default `'modelValue'`.
   * Locked with the component; tag cannot override. Prefer control `formless.model`.
   */
  model?: ControlVModel
  /**
   * Location(s) from FormView root (design.md §7.1). Default: field key.
   * Overridable via `:fl:prop`. Empty string is illegal.
   * Nested: `buyers[0].name`, `` `buyers[${$index}].name` ``.
   */
  prop?: ControlProp
  /**
   * Host Item shell for this field: FormView default, then this, then tag `:fl:item`.
   * Boolean only (design.md §9). Not “skip FormField”.
   */
  item?: boolean
  /**
   * Assembly placement (design.md §8). Omit = `'auto'`.
   * Schema and tag merge by nearest-wins; the control is **not** a merge layer —
   * its static `formless.field` is read at render and folded in (`auto`).
   */
  field?: FieldMode
}

/** Adapter fields on FieldSchema (everything except kernel keys). */
export type FieldSchemaExtras = Omit<FieldSchema, FieldSchemaKernelKey>

/**
 * FieldSchema widened for owner-supplied controls: `component` stays loose so a
 * field table can pass any control and let the tag infer its public props.
 */
export type FieldSchemaInput = Omit<FieldSchema, 'component'> & {
  component?: unknown
}

/** One field-table entry: the schema plus an optional debug-only tag name. */
export type FieldFactoryInput = FieldSchemaInput & {
  /** Debug-only component name; omit when the schema always declares `prop`. */
  name?: string
}

/** Tag attrs: `label?: string` → `'fl:label'?: string`. Always optional (override, not required). */
export type FlExtraProps<T> = {
  [K in keyof T as K extends string ? `fl:${K}` : never]+?: T[K]
}

/**
 * Snapshot for `item.props` / field `props` functions (design.md §10.1 / §20.9).
 * Kernel wiring + FieldSchema extras. Not passed as a host component prop.
 *
 * `model` / `prop` are this field's **normalized** binding arrays — index-aligned
 * (`model[i] ↔ prop[i]`), never empty and `prop` no longer than `model`. The
 * kernel sends no identity **name**: a host Item `prop` is the adapter's own
 * encoding, so an adapter that cannot encode the field simply leaves it unbound.
 */
export type ItemFl = {
  /** This field's v-model ports, index-aligned with `prop`. */
  model: string[]
  /** This field's locations, index-aligned with `model`. */
  prop: string[]
  /** Live values at those locations, in binding order. */
  getValues: () => unknown[]
  [extra: string]: unknown
} & FieldSchemaExtras

/**
 * Public props of `<FormField>` / `<User.Xxx />`. Kernel `fl:` / `item:` /
 * `layout:` / `layout-item:` keys on `<FormField>` / `<User.Xxx />`.
 * Schema extras are prefixed automatically.
 * `fl:model` declares the v-model ports at the identity root and selects one declared port inside it.
 * `layout:column` is formless density; other `layout:*` (e.g. gutter) stay attrs and fall through to LayoutView → Row.
 */
export type FormFieldProps = {
  'fl:prop'?: string | string[]
  'fl:model'?: string | string[]
  'fl:item'?: boolean
  'fl:field'?: FieldMode
  /** Ad-hoc control (page `<FormField>`): the component to render + bind. */
  'fl:component'?: Component
  'layout-item:span'?: string | number
  'layout-item:place'?: 'auto' | 'start' | 'end'
  'layout:column'?: number
} & FlExtraProps<FieldSchemaExtras>
