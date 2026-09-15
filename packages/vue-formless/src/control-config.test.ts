import { describe, expect, it } from 'vitest'
import { readControlFormless } from './control-config'

describe('readControlFormless', () => {
  it('reads model / item / field from the component static bag', () => {
    expect(
      readControlFormless({
        formless: { item: false, model: ['start', 'end'] },
      }),
    ).toEqual({ item: false, model: ['start', 'end'] })
    expect(
      readControlFormless({
        formless: { field: 'embed', model: ['start', 'end'] },
      }),
    ).toEqual({ field: 'embed', model: ['start', 'end'] })
    expect(
      readControlFormless({
        formless: { field: 'embed', layout: false, model: ['start', 'end'] },
      }),
    ).toEqual({ field: 'embed', model: ['start', 'end'] })
    expect(readControlFormless({})).toEqual({})
  })
})
