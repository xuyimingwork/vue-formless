import { describe, expect, it } from 'vitest'
import { takePlaceBlanks } from './use-place-blanks'

describe('takePlaceBlanks', () => {
  it('auto does not insert blanks and resets used on overflow', () => {
    const used = { n: 16 }
    expect(takePlaceBlanks(used, 16, 'auto')).toEqual([])
    expect(used.n).toBe(0)
  })

  it('start seals the current row when used > 0', () => {
    const used = { n: 8 }
    expect(takePlaceBlanks(used, 8, 'start')).toEqual([16])
    expect(used.n).toBe(0)
  })

  it('end pads so the cell occupies the last n slots', () => {
    const used = { n: 0 }
    expect(takePlaceBlanks(used, 8, 'end')).toEqual([16])
    expect(used.n).toBe(16)
  })
})
