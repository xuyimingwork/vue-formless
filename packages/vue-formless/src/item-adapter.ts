import type { Component } from 'vue'
import type {
  ControlProp,
  ControlVModel,
  ResolvedControlBinding,
} from './control-model'
import type { HostProps } from './overlay-props'

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
 * Snapshot for `item.props` / field `props` functions.
 * Kernel wiring + FieldSchema extras. Not passed as a host component prop.
 */
export type ItemFl = {
  fieldKey: string
  binding: ResolvedControlBinding
  getValues: () => unknown[]
  [extra: string]: unknown
} & FieldSchemaExtras

/** Kernel `fl:` / `col:` / `row:` keys on `<FormField>` / `<User.Xxx />`. Schema extras are prefixed automatically.
 * `fl:model` selects one declared v-model port inside a namespaced Field.
 * `row:column` is formless density; other `row:*` (e.g. gutter) stay attrs and fall through to LayoutView → Row.
 */
export type FormFieldTagProps = {
  'fl:prop'?: string | string[]
  'fl:model'?: string | string[]
  'fl:item'?: boolean
  'fl:field'?: FieldMode
  'col:span'?: string | number
  'col:place'?: 'auto' | 'start' | 'end'
  'row:column'?: number
} & FlExtraProps<FieldSchemaExtras>

/** @deprecated Use `FormFieldTagProps`. */
export type FormViewItemProps = FormFieldTagProps
