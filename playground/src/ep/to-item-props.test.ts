import { describe, expect, it } from 'vitest'
import { toEpItemProps, toEpRules } from './to-item-props'
import type { ItemFl } from 'vue-formless'

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
  const mobileFl: ItemFl = {
    controlKey: 'mobile',
    label: '手机',
    validation: mobile,
    validate: 'required',
    binding: { models: ['modelValue'], props: ['mobile'] },
    getValues: () => [''],
  }

  it('maps fl to ElFormItem props', () => {
    const props = toEpItemProps(mobileFl)
    expect(props.label).toBe('手机')
    expect(props.prop).toBe('mobile')
    expect(props.required).toBe(true)
    expect(Array.isArray(props.rules)).toBe(true)
    expect((props.rules as unknown[]).length).toBe(2)
  })

  it('defaults missing validate to optional', () => {
    const props = toEpItemProps({
      ...mobileFl,
      validate: undefined,
    })
    expect(props.required).toBe(false)
    expect((props.rules as unknown[]).length).toBe(1)
  })

  it('omits rules when validate is none', () => {
    const props = toEpItemProps({
      ...mobileFl,
      validate: 'none',
    })
    expect(props.required).toBe(false)
    expect(props.rules).toBeUndefined()
  })

  it('encodes host prop: one leaf path vs multi-port control key', () => {
    expect(
      toEpItemProps({
        ...mobileFl,
        binding: { models: ['modelValue'], props: ['name'], path: 'buyers[0]' },
      }).prop,
    ).toBe('buyers.0.name')
    expect(
      toEpItemProps({
        ...mobileFl,
        controlKey: 'timeRange',
        binding: { models: ['start', 'end'], props: ['startTime', 'endTime'] },
      }).prop,
    ).toBe('timeRange')
  })
})
