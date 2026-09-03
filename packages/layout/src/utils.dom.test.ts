/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it } from 'vitest'
import { hostEl } from './utils'

describe('hostEl (dom)', () => {
  it('returns an Element as-is', () => {
    const el = document.createElement('div')
    expect(hostEl(el)).toBe(el)
  })

  it('reads $el when it is an Element', () => {
    const el = document.createElement('span')
    expect(hostEl({ $el: el })).toBe(el)
  })

  it('returns null when $el is not an Element', () => {
    expect(hostEl({ $el: 'div' })).toBeNull()
    expect(hostEl({ $el: {} })).toBeNull()
    expect(hostEl({ $el: null })).toBeNull()
  })
})
