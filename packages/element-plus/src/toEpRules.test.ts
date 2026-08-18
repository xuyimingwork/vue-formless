import { describe, expect, it } from 'vitest'
import { toEpRules } from './toEpRules'

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
  it('returns undefined when novalidate or no identity', () => {
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
