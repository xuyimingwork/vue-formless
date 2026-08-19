import type {
  ControlNavPath,
  ControlProp,
  ResolvedControlBinding,
} from './control-model'
import type { ControlValidation, ValidatePolicy } from './identity-rules'

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
  /** Host Col span on the 24-grid when FormView layout hosting is on. */
  span?: number
}

/**
 * Snapshot passed to the adapter Item: Formless model, not host Item props.
 * Kernel does not pick ElFormItem `prop` — Item maps `binding` + `controlKey`.
 */
export interface ItemRenderInput {
  controlKey: string
  label?: string
  validation?: ControlValidation
  validate: ValidatePolicy
  binding: ResolvedControlBinding
  /** Current values for each `binding.props` leaf, FormView-root order. */
  getValues: () => unknown[]
  formless: FormlessAttr
}
