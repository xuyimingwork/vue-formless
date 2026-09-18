import type { Component } from 'vue'
import type { ControlProp, ControlVModel } from './control-binding'
import type { HostProps } from './props-overlay'

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

/** Kernel `fl:` / `item:` / `layout:` / `layout-item:` keys on `<FormField>` / `<User.Xxx />`.
 * Schema extras are prefixed automatically.
 * `fl:model` declares the v-model ports at the identity root and selects one declared port inside it.
 * `layout:column` is formless density; other `layout:*` (e.g. gutter) stay attrs and fall through to LayoutView → Row.
 */
export type FormFieldTagProps = {
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
