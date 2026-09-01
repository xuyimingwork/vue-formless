import type { Component } from 'vue'
import type {
  ControlProp,
  ControlVModel,
  ResolvedControlBinding,
} from './control-model'
import type { HostProps } from './overlay-props'

/** Kernel-owned ControlSchema keys. Not extras; tags already have matching `fl:*` where allowed. */
export type ControlSchemaKernelKey =
  | 'component'
  | 'props'
  | 'model'
  | 'prop'
  | 'item'

/**
 * Control identity. Adapter extras (e.g. `label`) via `declare module 'vue-formless'`.
 * Extra keys become `ItemFl` fields and optional `fl:*` tag props.
 */
export interface ControlSchema {
  /**
   * Input widget only (no FormItem). Receives v-model bindings from formless.
   * Widget may also declare static `formless: { model, item }`.
   */
  component?: Component
  /** Input defaults: static object, or derived from the cell snapshot. */
  props?: HostProps<ItemFl>
  /**
   * v-model names on the widget (ADR-011). Default `'modelValue'`.
   * Locked with the component; tag cannot override. Prefer widget `formless.model`.
   */
  model?: ControlVModel
  /**
   * Location(s) from FormView root (ADR-011). Default: control key.
   * Overridable via `:fl:prop`. Empty string is illegal.
   * Nested: `buyers[0].name`, `` `buyers[${$index}].name` ``.
   */
  prop?: ControlProp
  /**
   * Outer wrap: FormView default, then this, then tag `:fl:item`.
   * `'self'`: widget lays out cells via `useFormItem(port)` (ADR-017).
   */
  item?: boolean | 'self'
}

/** Adapter fields on ControlSchema (everything except kernel keys). */
export type ControlSchemaExtras = Omit<ControlSchema, ControlSchemaKernelKey>

/** Tag attrs: `label?: string` → `'fl:label'?: string`. Always optional (override, not required). */
export type FlExtraProps<T> = {
  [K in keyof T as K extends string ? `fl:${K}` : never]+?: T[K]
}

/**
 * Snapshot for `item.props` / control `props` functions.
 * Kernel wiring + ControlSchema extras. Not passed as a host component prop.
 */
export type ItemFl = {
  controlKey: string
  binding: ResolvedControlBinding
  getValues: () => unknown[]
  span?: number
  [extra: string]: unknown
} & ControlSchemaExtras

/** Kernel `fl:` keys on `<User.Xxx />`. Schema extras are prefixed automatically. */
export type FormControlProps = {
  'fl:prop'?: string | string[]
  'fl:span'?: number
  'fl:item'?: boolean
} & FlExtraProps<ControlSchemaExtras>

/** Kernel `fl:` keys on `FormView.Item` / `useFormItem()`. Schema extras are prefixed automatically. */
export type FormViewItemProps = {
  'fl:prop'?: string | string[]
  'fl:span'?: number
} & FlExtraProps<ControlSchemaExtras>
