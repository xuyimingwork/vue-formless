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

/** Clamp a present column to 1–24. Missing values are not handled here. */
export function normalizeColumn(raw: unknown): number {
  const n = Math.floor(Number(raw))
  if (n === Infinity) return GRID_TOTAL
  if (!Number.isFinite(n)) return DEFAULT_LAYOUT.column
  return Math.min(GRID_TOTAL, Math.max(1, n))
}

/** Last present candidate, then `normalizeColumn` (later overrides, like mergeProps). */
export function mergeColumn(...raw: unknown[]): number {
  return normalizeColumn([...raw].reverse().find((v) => v != null))
}

/** Author-facing Col width: omit / `'Nx'` / `'max'` / absolute 1–24. */
export type ColSpanRaw = ColSpan | `${ColSpan}` | `${ColSpan}x` | 'max'

export type ColPlace = 'auto' | 'start' | 'end'
export type ColSpan = IntRange<1, typeof GRID_TOTAL>

export function normalizeColSpan(raw: unknown, column: number): ColSpan {
  const safeColumn = column > 0 ? column : DEFAULT_LAYOUT.column
  const slot = Math.max(1, Math.floor(GRID_TOTAL / safeColumn)) as ColSpan

  if (raw == null || raw === '') return slot

  if (typeof raw === 'number') {
    if (Number.isInteger(raw) && raw >= 1 && raw <= GRID_TOTAL) return raw as ColSpan
    warnInvalid('col:span', raw, '1x')
    return slot
  }

  if (typeof raw !== 'string') {
    warnInvalid('col:span', raw, '1x')
    return slot
  }

  const text = raw.trim()
  if (text === 'max') return GRID_TOTAL

  const nx = /^(\d+)x$/.exec(text)
  if (nx) {
    const n = Number(nx[1])
    if (n < 1) {
      warnInvalid('col:span', raw, '1x')
      return slot
    }
    return Math.min(GRID_TOTAL, n * slot) as ColSpan
  }

  if (/^\d+$/.test(text)) {
    const n = Number(text)
    if (n >= 1 && n <= GRID_TOTAL) return n as ColSpan
    warnInvalid('col:span', raw, '1x')
    return slot
  }

  warnInvalid('col:span', raw, '1x')
  return slot
}

export function normalizeColPlace(place: unknown): ColPlace {
  if (place == null || place === '' || place === 'auto') return 'auto'
  if (place === 'start' || place === 'end') return place
  warnInvalid('col:place', place, 'auto')
  return 'auto'
}

function warnInvalid(kind: 'col:span' | 'col:place', raw: unknown, fallback: string): void {
  const shown = typeof raw === 'string' ? `"${raw}"` : String(raw)
  console.warn(`[layout] ${kind} ${shown} is invalid; falling back to ${fallback}`)
}
