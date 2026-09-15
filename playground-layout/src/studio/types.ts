import type { LayoutItemPlace, LayoutItemSpan } from '@vue-formless/layout'

export type SpanSpec = LayoutItemSpan

export type Tile = {
  id: string
  label: string
  span: SpanSpec
  place: LayoutItemPlace
  on: boolean
}

export type Scene = 'play' | 'nested'
