import type { Scene, Tile } from './types'

function nestedSnippet(gutter: number) {
  const g = gutter ? ` :gutter="${gutter}"` : ''
  return [
    `<LayoutView :column="3"${g}>`,
    '  <LayoutCell>A</LayoutCell>',
    '  <LayoutCell>B</LayoutCell>',
    '  <LayoutCell>C</LayoutCell>',
    '  <LayoutCell span="max">',
    `    <LayoutView :column="2"${g}>`,
    '      <LayoutCell>1</LayoutCell>',
    '      <LayoutCell>2</LayoutCell>',
    '      <LayoutCell span="max">max</LayoutCell>',
    '    </LayoutView>',
    '  </LayoutCell>',
    '</LayoutView>',
  ].join('\n')
}

function itemTag(t: Tile): string {
  const attrs: string[] = []
  if (t.span !== '1x') {
    attrs.push(typeof t.span === 'number' ? `:span="${t.span}"` : `span="${t.span}"`)
  }
  if (t.place !== 'auto') attrs.push(`place="${t.place}"`)
  const prop = attrs.length ? ` ${attrs.join(' ')}` : ''
  return `  <LayoutCell${prop}>${t.label}</LayoutCell>`
}

export function renderSnippet(opts: {
  scene: Scene
  column: number
  gutter: number
  disabled: boolean
  tiles: Tile[]
}): string {
  if (opts.scene === 'nested') return nestedSnippet(opts.gutter)
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
