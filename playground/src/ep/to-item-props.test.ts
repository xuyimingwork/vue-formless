import { describe, expect, it } from 'vitest'
import { toEpItemProps, toEpRules } from './to-item-props'

function run(
  rules: ReturnType<typeof toEpRules>,
  value: unknown,
): Promise<string | undefined> {
  if (!rules?.length) return Promise.resolve(undefined)
  return new Promise((resolve) => {
    let pending = rules.length
    let error: string | undefined
    for (const rule of rules) {
      const validator = rule.validator
      if (!validator) {
        pending -= 1
        if (pending === 0) resolve(error)
        continue
      }
      validator(
        rule,
        value,
        (err?: string | Error) => {
          if (err && !error) error = typeof err === 'string' ? err : err.message
          pending -= 1
          if (pending === 0) resolve(error)
        },
      )
    }
  })
}

const mobile = {
  empty: { message: '请输入手机号' },
  format: { pattern: /^1\d{10}$/, message: '手机号格式不正确' },
}

describe('toEpRules', () => {
  it('returns undefined when policy is none or no validation', () => {
    expect(toEpRules(mobile, 'none')).toBeUndefined()
    expect(toEpRules(undefined, 'required')).toBeUndefined()
  })

  it('optional skips empty but runs format when filled', async () => {
    expect(await run(toEpRules(mobile, 'optional'), '')).toBeUndefined()
    expect(await run(toEpRules(mobile, 'optional'), '123')).toBe('手机号格式不正确')
    expect(await run(toEpRules(mobile, 'optional'), '13800138000')).toBeUndefined()
  })

  it('required fails empty then format', async () => {
    expect(await run(toEpRules(mobile, 'required'), '  ')).toBe('请输入手机号')
    expect(await run(toEpRules(mobile, 'required'), '123')).toBe('手机号格式不正确')
    expect(await run(toEpRules(mobile, 'required'), '13800138000')).toBeUndefined()
  })
})

describe('toEpItemProps', () => {
  it('maps snapshot to ElFormItem props', () => {
    const props = toEpItemProps({
      controlKey: 'mobile',
      label: '手机',
      validation: mobile,
      validate: 'required',
      formItemProp: 'mobile',
      formless: { validate: 'required' },
    })
    expect(props.label).toBe('手机')
    expect(props.prop).toBe('mobile')
    expect(props.required).toBe(true)
    expect(Array.isArray(props.rules)).toBe(true)
    expect((props.rules as unknown[]).length).toBe(2)
  })

  it('omits rules when validate is none', () => {
    const props = toEpItemProps({
      controlKey: 'mobile',
      label: '手机',
      validation: mobile,
      validate: 'none',
      formItemProp: 'mobile',
      formless: { validate: 'none' },
    })
    expect(props.required).toBe(false)
    expect(props.rules).toBeUndefined()
  })
})
