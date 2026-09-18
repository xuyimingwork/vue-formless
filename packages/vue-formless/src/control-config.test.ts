import { describe, expect, it } from 'vitest'
import { readControlFormless } from './control-config'

describe('readControlFormless', () => {
  it('reads model / field from the component static bag', () => {
    expect(readControlFormless({ formless: { model: ['start', 'end'] } })).toEqual({
      model: ['start', 'end'],
    })
    expect(
      readControlFormless({ formless: { field: 'embed', model: ['start', 'end'] } }),
    ).toEqual({ field: 'embed', model: ['start', 'end'] })
  })

  it('returns an empty bag for a control that declares nothing', () => {
    expect(readControlFormless({})).toEqual({})
    expect(readControlFormless(undefined)).toEqual({})
    expect(readControlFormless(null)).toEqual({})
    expect(readControlFormless('not-a-component')).toEqual({})
  })

  it('reads the static bag off a functional component too', () => {
    const fn = () => null
    ;(fn as unknown as { formless?: unknown }).formless = { field: 'embed' }
    expect(readControlFormless(fn)).toEqual({ field: 'embed' })
  })
})
