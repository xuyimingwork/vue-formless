import type { Component } from 'vue'
import type { ControlProp, ControlVModel } from './control-binding'
import type { HostProps } from './props-overlay'

/** `field` assembly modes (ADR-020). Omit = `'wrap'`. */
export type FieldMode = 'wrap' | 'embed' | 'wrap-embed'

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
 * Extra keys become `ItemFl` fields and optional `fl:*` tag props.
 */
export interface FieldSchema {
  /**
   * Input widget only (no FormItem). Receives v-model bindings from formless.
   * Widget may also declare static `formless: { model, item, field }`.
   */
  component?: Component
  /** Input defaults: static object, or derived from the field snapshot. */
  props?: HostProps<ItemFl>
  /**
   * v-model names on the widget (ADR-011). Default `'modelValue'`.
   * Locked with the component; tag cannot override. Prefer widget `formless.model`.
   */
  model?: ControlVModel
  /**
   * Location(s) from FormView root (ADR-011). Default: field key.
   * Overridable via `:fl:prop`. Empty string is illegal.
   * Nested: `buyers[0].name`, `` `buyers[${$index}].name` ``.
   */
  prop?: ControlProp
  /**
   * Outer ElFormItem for this field: FormView default, then this, then tag `:fl:item`.
   * Boolean only (ADR-020). Not “skip FormField”.
   */
  item?: boolean
  /**
   * Assembly tree (ADR-020). Omit = `'wrap'`.
   * Whole value replaced by nearer source (tag > widget > schema); no wrap∪embed merge.
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
 * Snapshot for `item.props` / field `props` functions (ADR-011 §6 revised).
 * Kernel wiring + FieldSchema extras. Not passed as a host component prop.
 *
 * `model` / `prop` are this cell's **normalized** binding arrays — index-aligned
 * (`model[i] ↔ prop[i]`), never empty and `prop` no longer than `model`. The
 * kernel sends no identity **name**: a host Item `prop` is the adapter's own
 * encoding, so an adapter that cannot encode the cell simply leaves it unbound.
 */
export type ItemFl = {
  /** This cell's v-model ports, index-aligned with `prop`. */
  model: string[]
  /** This cell's locations, index-aligned with `model`. */
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
  /** Ad-hoc widget (page `<FormField>`): the input component to render + bind. */
  'fl:component'?: Component
  'layout-item:span'?: string | number
  'layout-item:place'?: 'auto' | 'start' | 'end'
  'layout:column'?: number
} & FlExtraProps<FieldSchemaExtras>
