import type { ColPlace, ColSpanRaw } from '@vue-formless/layout'

export type SpanSpec = ColSpanRaw

export type Tile = {
  id: string
  label: string
  span: SpanSpec
  place: ColPlace
  on: boolean
}

export type Scene = 'play' | 'nested'
