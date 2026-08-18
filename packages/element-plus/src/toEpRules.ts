import type { FormItemRule } from 'element-plus'
import {
  isEmptyValue,
  type IdentityRule,
  type IdentityRules,
  type ValidatePolicy,
} from 'vue-formless'

const TRIGGER: FormItemRule['trigger'] = ['blur', 'change']

function pass(rule: IdentityRule, value: unknown): boolean {
  if (rule.pattern) return rule.pattern.test(String(value ?? ''))
  if (rule.validate) return rule.validate(value)
  return true
}

/** Compile identity rules + policy into ElFormItem rules (ADR-012). */
export function toEpRules(
  identity: IdentityRules | undefined,
  policy: ValidatePolicy,
): FormItemRule[] | undefined {
  if (policy === 'none' || !identity) return undefined

  const rules: FormItemRule[] = []

  if (policy === 'required' && identity.empty) {
    const empty = identity.empty
    rules.push({
      trigger: TRIGGER,
      validator: (_rule, value, callback) => {
        if (isEmptyValue(value, empty)) {
          callback(new Error(empty.message ?? '必填'))
          return
        }
        callback()
      },
    })
  }

  if (identity.format) {
    const format = identity.format
    rules.push({
      trigger: TRIGGER,
      validator: (_rule, value, callback) => {
        if (isEmptyValue(value, identity.empty)) {
          callback()
          return
        }
        if (!pass(format, value)) {
          callback(new Error(format.message ?? '格式不正确'))
          return
        }
        callback()
      },
    })
  }

  return rules.length ? rules : undefined
}
