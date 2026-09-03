/** Host Col span modulus (Element / Ant Design 24-grid). */
export const GRID_TOTAL = 24

// 通用生成器（0 到 N-1）
type _Enumerate<N extends number, Acc extends number[] = []> =
  Acc['length'] extends N
    ? Acc[number]
    : _Enumerate<N, [...Acc, Acc['length']]>

/**
 * 通用整数范围类型工具
 * @example IntRange<1, 24> 会生成 1 到 24 的联合类型
 */
type IntRange<F extends number, T extends number> =
  Exclude<_Enumerate<T>, _Enumerate<F>> | T

/** Kernel column when factory and the LayoutView `column` prop are omitted. */
export const DEFAULT_LAYOUT = {
  column: 1,
} as const


export type ColPlace = 'auto' | 'start' | 'end'

export type ColSpan = IntRange<1, typeof GRID_TOTAL>
export type ColSpanRaw = ColSpan | `${ColSpan}` | `${ColSpan}x` | 'max'


function clampCol(n: number): ColSpan {
  return Math.min(GRID_TOTAL, Math.max(1, n)) as ColSpan
}

function getSpan1x(column: number): ColSpan {
  return Math.floor(GRID_TOTAL / normalizeColumn(column)) as ColSpan
}

/** Coerce then clamp to 1–24. Unparseable values fall back to `DEFAULT_LAYOUT.column`. */
export function normalizeColumn(raw: unknown): number {
  const n = Math.floor(Number(raw))
  if (Number.isNaN(n)) return DEFAULT_LAYOUT.column
  return clampCol(n)
}

/** Last present candidate, then `normalizeColumn` (later overrides, like mergeProps). */
export function mergeColumn(...raw: unknown[]): number {
  return normalizeColumn([...raw].reverse().find((v) => v != null))
}

export function normalizeColSpan(raw: unknown, column: number): ColSpan {
  const span1x = getSpan1x(column)

  // 未知参数类型，使用默认值
  if (typeof raw !== 'number' && typeof raw !== 'string') return span1x

  // 参数预处理
  raw = typeof raw === 'string' ? raw.trim().toLowerCase() : raw

  // 字符串无参，使用默认值（Number('') 是 0）
  if (raw === '') return span1x

  // max 模式
  if (raw === 'max') return GRID_TOTAL

  // nx 模式
  if (typeof raw === 'string' && raw.endsWith('x')) {
    const n = Math.floor(Number(raw.substring(0, raw.length - 1)))
    if (Number.isNaN(n)) return span1x  
    return clampCol(clampCol(n) * span1x)
  }

  // 数字模式
  raw = Math.floor(Number(raw))
  if (Number.isNaN(raw)) return span1x
  return clampCol(raw as number)
}

export function normalizeColPlace(place: unknown): ColPlace {
  place = typeof place === 'string' ? place.trim().toLowerCase() : place
  if (place === 'start' || place === 'end') return place
  return 'auto'
}
