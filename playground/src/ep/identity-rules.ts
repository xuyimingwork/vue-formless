/**
 * Data validation on a control (ADR-010 / ADR-012).
 * Not host FormItem RuleItem[] — no `required: true`, no `trigger`.
 */

export interface IdentityRule {
  /**
   * Return true if the check passes.
   * For `empty`: true means the value is filled.
   */
  validate?: (value: unknown) => boolean
  pattern?: RegExp
  message?: string
}

/** How this value is checked. Lives on the control extras, not the tag. */
export interface ControlValidation {
  empty?: IdentityRule
  format?: IdentityRule
}

/** How this render uses `validation` (`:fl:validate`). Default `'optional'` in the adapter. */
export type ValidatePolicy = 'optional' | 'required' | 'none'

export function isEmptyValue(value: unknown, empty?: IdentityRule): boolean {
  if (empty?.validate) return !empty.validate(value)
  if (value == null) return true
  if (typeof value === 'string') return value.trim() === ''
  if (Array.isArray(value)) return value.length === 0
  return false
}
