import { describe, expect, it } from 'vitest'
import { readWidgetFormless } from './widget-config'

describe('readWidgetFormless', () => {
  it('reads model / item / field from the component static bag', () => {
    expect(
      readWidgetFormless({
        formless: { item: false, model: ['start', 'end'] },
      }),
    ).toEqual({ item: false, model: ['start', 'end'] })
    expect(
      readWidgetFormless({
        formless: { field: 'embed', model: ['start', 'end'] },
      }),
    ).toEqual({ field: 'embed', model: ['start', 'end'] })
    expect(
      readWidgetFormless({
        formless: { field: 'embed', layout: false, model: ['start', 'end'] },
      }),
    ).toEqual({ field: 'embed', model: ['start', 'end'] })
    expect(readWidgetFormless({})).toEqual({})
  })
})
