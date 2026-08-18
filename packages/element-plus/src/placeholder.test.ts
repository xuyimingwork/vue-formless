import { describe, expect, it } from 'vitest'
import { defaultPlaceholder } from './placeholder'

describe('defaultPlaceholder', () => {
  it('builds 请输入 / 请选择 from label', () => {
    expect(defaultPlaceholder('input', '姓名')).toBe('请输入姓名')
    expect(defaultPlaceholder('select', '性别')).toBe('请选择性别')
  })

  it('returns undefined without label', () => {
    expect(defaultPlaceholder('input', undefined)).toBeUndefined()
  })
})
