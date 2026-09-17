import { describe, expect, it } from 'vitest'
import { useFormViewAttrs } from './use-form-attrs'

describe('useFormViewAttrs', () => {
  it('claims fl / layout and leaves layout-item:* / item:* to the host Form', () => {
    const validate = () => {}
    const bags = useFormViewAttrs({
      'fl:layout': true,
      'layout:gutter': 16,
      'layout-item:span': 2,
      'item:label': 'x',
      'onItem:validate': validate,
      labelWidth: 96,
    })
    expect(bags.fl.value).toEqual({ layout: true })
    expect(bags.layout.value).toEqual({ gutter: 16 })
    expect(bags).not.toHaveProperty('layout-item')
    expect(bags.default.value).toEqual({
      'layout-item:span': 2,
      'item:label': 'x',
      'onItem:validate': validate,
      labelWidth: 96,
    })
  })
})
