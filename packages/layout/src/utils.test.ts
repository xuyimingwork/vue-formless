import { describe, expect, it } from 'vitest'
import { hostEl } from './utils'

describe('hostEl (node)', () => {
  it('returns null for non-objects', () => {
    expect(hostEl(null)).toBeNull()
    expect(hostEl(undefined)).toBeNull()
    expect(hostEl(1)).toBeNull()
    expect(hostEl('div')).toBeNull()
  })

  it('returns null when Element is not in the environment', () => {
    expect(typeof Element).toBe('undefined')
    expect(hostEl({})).toBeNull()
    expect(hostEl({ $el: {} })).toBeNull()
  })
})
