import { describe, expect, it } from 'vitest'
import { mergeInternalItem, resolveControlShell } from './control-shell'

const pageOn = { pageItem: true, pageLayoutOn: true }

describe('mergeInternalItem', () => {
  it('prefers the widget bag', () => {
    expect(mergeInternalItem('self', true)).toBe('self')
    expect(mergeInternalItem(false, true)).toBe(false)
    expect(mergeInternalItem(undefined, false)).toBe(false)
    expect(mergeInternalItem(undefined, undefined)).toBeUndefined()
  })

  it('throws when self and false are both written', () => {
    expect(() => mergeInternalItem('self', false)).toThrow(/conflicts/)
    expect(() => mergeInternalItem(false, 'self')).toThrow(/conflicts/)
  })
})

describe('resolveControlShell', () => {
  it('follows the page when nothing else is written', () => {
    expect(resolveControlShell({ ...pageOn })).toEqual({
      wrapItem: true,
      wrapCol: true,
      extraRow: false,
      self: false,
    })
    expect(
      resolveControlShell({ pageItem: false, pageLayoutOn: false }),
    ).toEqual({
      wrapItem: false,
      wrapCol: false,
      extraRow: false,
      self: false,
    })
  })

  it('lets the tag turn item off while keeping Col', () => {
    expect(
      resolveControlShell({ ...pageOn, tagItem: false }),
    ).toEqual({
      wrapItem: false,
      wrapCol: true,
      extraRow: false,
      self: false,
    })
  })

  it('lets the tag turn item on when the page left it off', () => {
    expect(
      resolveControlShell({
        pageItem: false,
        pageLayoutOn: true,
        tagItem: true,
      }),
    ).toEqual({
      wrapItem: true,
      wrapCol: true,
      extraRow: false,
      self: false,
    })
  })

  it('skips Item for internal false, keeps Col', () => {
    expect(
      resolveControlShell({ ...pageOn, internalItem: false }),
    ).toEqual({
      wrapItem: false,
      wrapCol: true,
      extraRow: false,
      self: false,
    })
  })

  it('lets the tag wrap Item over internal false', () => {
    expect(
      resolveControlShell({
        ...pageOn,
        internalItem: false,
        tagItem: true,
      }),
    ).toEqual({
      wrapItem: true,
      wrapCol: true,
      extraRow: false,
      self: false,
    })
  })

  it('skips outer Item and Col for pure self', () => {
    expect(
      resolveControlShell({ ...pageOn, internalItem: 'self' }),
    ).toEqual({
      wrapItem: false,
      wrapCol: false,
      extraRow: false,
      self: true,
    })
  })

  it('wraps Col-Item-Row when self plus explicit tag item true', () => {
    expect(
      resolveControlShell({
        ...pageOn,
        internalItem: 'self',
        tagItem: true,
      }),
    ).toEqual({
      wrapItem: true,
      wrapCol: true,
      extraRow: true,
      self: true,
    })
  })

  it('wraps only outer Item when self plus tag item true but layout is off', () => {
    expect(
      resolveControlShell({
        pageItem: true,
        pageLayoutOn: false,
        internalItem: 'self',
        tagItem: true,
      }),
    ).toEqual({
      wrapItem: true,
      wrapCol: false,
      extraRow: false,
      self: true,
    })
  })

  it('treats self plus tag item false as pure self', () => {
    expect(
      resolveControlShell({
        ...pageOn,
        internalItem: 'self',
        tagItem: false,
      }),
    ).toEqual({
      wrapItem: false,
      wrapCol: false,
      extraRow: false,
      self: true,
    })
  })

  it('lets internal true force Item when the page left it off', () => {
    expect(
      resolveControlShell({
        pageItem: false,
        pageLayoutOn: true,
        internalItem: true,
      }),
    ).toEqual({
      wrapItem: true,
      wrapCol: true,
      extraRow: false,
      self: false,
    })
  })
})
