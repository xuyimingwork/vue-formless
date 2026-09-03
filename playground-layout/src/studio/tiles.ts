import type { ColPlace } from '@vue-formless/layout'
import type { SpanSpec, Tile } from './types'

export const GRID = 24

const HUES = [168, 22, 262, 199, 330, 88, 38, 187, 280, 348, 152, 48]

let seq = 0

export function tile(
  label: string,
  span: SpanSpec = '1x',
  place: ColPlace = 'auto',
  on = true,
): Tile {
  return { id: String(++seq), label, span, place, on }
}

export function cloneTiles(list: Tile[]): Tile[] {
  return list.map((t) => ({ ...t, id: String(++seq) }))
}

export function labelAt(i: number): string {
  return String.fromCharCode(65 + (i % 26))
}

export function letters(n: number): Tile[] {
  return Array.from({ length: n }, (_, i) => tile(labelAt(i)))
}

export function tileHue(label: string): string {
  let n = 0
  for (const c of label) n += c.charCodeAt(0)
  return `hsl(${HUES[n % HUES.length]} 42% 40%)`
}

export function span1xOf(column: number): number {
  return Math.floor(GRID / column)
}

export function absOf(span: SpanSpec, column: number): number {
  const span1x = span1xOf(column)
  if (typeof span === 'number') return span
  if (span === 'max') return GRID
  if (typeof span === 'string' && span.endsWith('x')) {
    const n = Math.floor(Number(span.slice(0, -1)))
    const mul = Number.isNaN(n) ? 1 : Math.max(1, n)
    return Math.min(GRID, Math.max(1, mul * span1x))
  }
  return span1x
}

export function bumpAbs(t: Tile, column: number, dir: -1 | 1) {
  t.span = Math.min(GRID, Math.max(1, absOf(t.span, column) + dir)) as SpanSpec
}

export function resizeTiles(list: Tile[], n: number): Tile[] {
  n = Math.min(GRID, Math.max(0, Math.floor(n)))
  if (!Number.isFinite(n) || n === list.length) return list
  if (n > list.length) {
    const extra: Tile[] = []
    for (let i = list.length; i < n; i++) extra.push(tile(labelAt(i)))
    return [...list, ...extra]
  }
  return list.slice(0, n)
}
