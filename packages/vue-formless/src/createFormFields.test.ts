import { describe, expect, it } from 'vitest'
import { camelToPascal, pascalToCamel } from './case'
import { createFormFields } from './createFormFields'

describe('case', () => {
  it('converts camelCase ↔ PascalCase', () => {
    expect(camelToPascal('name')).toBe('Name')
    expect(camelToPascal('idCard')).toBe('IdCard')
    expect(pascalToCamel('Name')).toBe('name')
    expect(pascalToCamel('IdCard')).toBe('idCard')
  })
})

describe('createFormFields', () => {
  it('exposes PascalCase components for camelCase schema keys', () => {
    const User = createFormFields({
      name: { label: '姓名' },
      idCard: { label: '证件号' },
    })

    expect(User.Name).toBeTruthy()
    expect(User.IdCard).toBeTruthy()
    expect((User as { name?: unknown }).name).toBeUndefined()
  })
})
