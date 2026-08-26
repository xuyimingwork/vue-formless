import { describe, expect, it } from 'vitest'
import { overlayProps, resolveProps } from './overlay-props'

describe('resolveProps', () => {
  it('returns {} when spec is omitted', () => {
    expect(resolveProps(undefined, {})).toEqual({})
  })

  it('drops undefined from a static object', () => {
    expect(resolveProps({ a: 1, b: undefined }, {})).toEqual({ a: 1 })
  })

  it('calls a function with the snapshot', () => {
    expect(
      resolveProps((fl: { label?: string }) => ({ placeholder: fl.label }), { label: '姓名' }),
    ).toEqual({
      placeholder: '姓名',
    })
  })
})

describe('overlayProps', () => {
  it('lets later defined values win', () => {
    expect(overlayProps({ a: 1, b: 2 }, { b: 3, c: 4 })).toEqual({ a: 1, b: 3, c: 4 })
  })

  it('does not let undefined override', () => {
    expect(overlayProps({ placeholder: '请填写' }, { placeholder: undefined })).toEqual({
      placeholder: '请填写',
    })
  })

  it('treats empty string as a value', () => {
    expect(overlayProps({ placeholder: '请填写' }, { placeholder: '' })).toEqual({
      placeholder: '',
    })
  })
})
