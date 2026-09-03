import type { Scene, Tile } from './types'

const NESTED = [
  '<LayoutView :column="3" :gutter="16">',
  '  <LayoutItem>A</LayoutItem>',
  '  <LayoutItem>B</LayoutItem>',
  '  <LayoutItem>C</LayoutItem>',
  '  <LayoutItem span="max">',
  '    <LayoutView :column="2">',
  '      <LayoutItem>1</LayoutItem>',
  '      <LayoutItem>2</LayoutItem>',
  '      <LayoutItem span="max">max</LayoutItem>',
  '    </LayoutView>',
  '  </LayoutItem>',
  '</LayoutView>',
].join('\n')

function itemTag(t: Tile): string {
  const attrs: string[] = []
  if (t.span !== '1x') {
    attrs.push(typeof t.span === 'number' ? `:span="${t.span}"` : `span="${t.span}"`)
  }
  if (t.place !== 'auto') attrs.push(`place="${t.place}"`)
  const prop = attrs.length ? ` ${attrs.join(' ')}` : ''
  return `  <LayoutItem${prop}>${t.label}</LayoutItem>`
}

export function renderSnippet(opts: {
  scene: Scene
  column: number
  gutter: number
  disabled: boolean
  tiles: Tile[]
}): string {
  if (opts.scene === 'nested') return NESTED
  const view: string[] = [`:column="${opts.column}"`]
  if (opts.gutter) view.push(`:gutter="${opts.gutter}"`)
  if (opts.disabled) view.push('disabled')
  const items = opts.tiles.filter((t) => t.on).map(itemTag)
  return [
    `<LayoutView ${view.join(' ')}>`,
    ...(items.length ? items : ['  <!-- empty -->']),
    '</LayoutView>',
  ].join('\n')
}
