import type { FormItemRule } from 'element-plus'
import { resolveFormItemProp, type ItemFl } from 'vue-formless'
import {
  isEmptyValue,
  type ControlValidation,
  type IdentityRule,
  type ValidatePolicy,
} from './identity-rules'

const TRIGGER: FormItemRule['trigger'] = ['blur', 'change']

function pass(rule: IdentityRule, value: unknown): boolean {
  if (rule.pattern) return rule.pattern.test(String(value ?? ''))
  if (rule.validate) return rule.validate(value)
  return true
}

function resolveValidatePolicy(validate: unknown): ValidatePolicy {
  if (validate === 'required' || validate === 'none' || validate === 'optional') {
    return validate
  }
  return 'optional'
}

/** Compile schema `validation` + policy into ElFormItem `rules`. */
export function toEpRules(
  validation: ControlValidation | undefined,
  policy: ValidatePolicy,
): FormItemRule[] | undefined {
  if (policy === 'none' || !validation) return undefined

  const rules: FormItemRule[] = []

  if (policy === 'required' && validation.empty) {
    const empty = validation.empty
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

  if (validation.format) {
    const format = validation.format
    rules.push({
      trigger: TRIGGER,
      validator: (_rule, value, callback) => {
        if (isEmptyValue(value, validation.empty)) {
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

/** Map Item `fl` to ElFormItem props. Host `prop` is this adapter's encoding. */
export function toEpItemProps(fl: ItemFl): Record<string, unknown> {
  const validate = resolveValidatePolicy(fl.validate)
  const validation = fl.validation as ControlValidation | undefined
  return {
    label: fl.label,
    prop: resolveFormItemProp(fl.binding, fl.controlKey),
    rules: toEpRules(validation, validate),
    required: validate === 'required',
  }
}
