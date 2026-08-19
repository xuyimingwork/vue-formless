import type { FormItemRule } from 'element-plus'
import {
  isEmptyValue,
  resolveFormItemProp,
  type ControlValidation,
  type IdentityRule,
  type ItemRenderInput,
  type ValidatePolicy,
} from 'vue-formless'

const TRIGGER: FormItemRule['trigger'] = ['blur', 'change']

function pass(rule: IdentityRule, value: unknown): boolean {
  if (rule.pattern) return rule.pattern.test(String(value ?? ''))
  if (rule.validate) return rule.validate(value)
  return true
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

/** Map a control snapshot to ElFormItem props. Host `prop` is this adapter's encoding. */
export function toEpItemProps(input: ItemRenderInput): Record<string, unknown> {
  return {
    label: input.label,
    prop: resolveFormItemProp(input.binding, input.controlKey),
    rules: toEpRules(input.validation, input.validate),
    required: input.validate === 'required',
  }
}
