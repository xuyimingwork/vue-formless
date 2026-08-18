/**
 * Control identity rules (ADR-010 / ADR-012).
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

export interface IdentityRules {
  empty?: IdentityRule
  format?: IdentityRule
}

/** How this render uses identity rules (tag `:formless`). */
export type ValidatePolicy = 'optional' | 'required' | 'none'

export function resolveValidatePolicy(formless: {
  required?: boolean
  novalidate?: boolean
} = {}): ValidatePolicy {
  if (formless.novalidate) return 'none'
  if (formless.required) return 'required'
  return 'optional'
}

export function isEmptyValue(value: unknown, empty?: IdentityRule): boolean {
  if (empty?.validate) return !empty.validate(value)
  if (value == null) return true
  if (typeof value === 'string') return value.trim() === ''
  if (Array.isArray(value)) return value.length === 0
  return false
}

export type ToRules = (
  identity: IdentityRules | undefined,
  policy: ValidatePolicy,
) => unknown
