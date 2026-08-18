import type { Component } from 'vue'
import type { ControlNavPath, ControlProp } from './controlModel'
import type { ControlValidation, ValidatePolicy } from './identityRules'

/** Runtime config on `<User.Xxx :formless="…" />`. Does not steal input prop names. */
export interface FormlessAttr {
  /** Override schema label. */
  label?: string
  /** Override schema leaf keys. */
  prop?: ControlProp
  /** Override schema navigation. */
  path?: ControlNavPath
  /** This-render policy for schema `validation`. Default `'optional'`. */
  validate?: ValidatePolicy
  /** Col span when FormView layout hosting is on. */
  span?: number
}

/**
 * Snapshot passed to the Item adapter: merged Formless model, not host Item props.
 */
export interface ItemRenderInput {
  controlKey: string
  label?: string
  validation?: ControlValidation
  validate: ValidatePolicy
  formItemProp: string
  formless: FormlessAttr
}

export type ToItemProps = (input: ItemRenderInput) => Record<string, unknown>

export interface FormItemAdapter {
  Item: Component
  toItemProps: ToItemProps
}
