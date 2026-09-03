import type { Scene, Tile } from './types'
import { cloneTiles, letters, tile } from './tiles'

export type PresetId = 'flow' | 'banner' | 'start' | 'end' | 'nested'

export const PRESETS: { id: PresetId; name: string; hint: string }[] = [
  { id: 'flow', name: '三列流水', hint: '默认一列宽，从左往右排，空位补黄块' },
  { id: 'banner', name: '通栏', hint: '第一格占满整行' },
  { id: 'start', name: '另起一行', hint: 'B 换到下一行开头，A 右边补占位' },
  { id: 'end', name: '靠行尾', hint: 'C 靠这一行末尾，前面补占位' },
  { id: 'nested', name: '嵌套', hint: '格子里再套一层，列数可以不一样' },
]

export const SIZE_CHIPS = [
  { id: '1x' as const, name: '一列' },
  { id: '2x' as const, name: '两列' },
  { id: 'max' as const, name: '整行' },
]

export const PLACE_CHIPS = [
  { id: 'start' as const, name: '换行' },
  { id: 'auto' as const, name: '顺着' },
  { id: 'end' as const, name: '靠尾' },
]

export type PresetSetup = {
  scene: Scene
  column: number
  gutter: number
  rowGap: number
  disabled: boolean
  tiles?: Tile[]
}

export function setupPreset(id: PresetId): PresetSetup {
  const base = { column: 3, gutter: 16, rowGap: 8, disabled: false }
  if (id === 'nested') return { ...base, scene: 'nested' }
  if (id === 'banner') {
    return {
      ...base,
      scene: 'play',
      tiles: cloneTiles([tile('A', 'max'), tile('B'), tile('C')]),
    }
  }
  if (id === 'start') {
    return {
      ...base,
      scene: 'play',
      tiles: cloneTiles([tile('A'), tile('B', '1x', 'start'), tile('C')]),
    }
  }
  if (id === 'end') {
    return {
      ...base,
      scene: 'play',
      tiles: cloneTiles([
        tile('A'),
        tile('B'),
        tile('C', '1x', 'end'),
        tile('D'),
      ]),
    }
  }
  return { ...base, scene: 'play', tiles: cloneTiles(letters(9)) }
}
