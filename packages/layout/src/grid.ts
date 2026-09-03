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

/** First present candidate, then `normalizeColumn`. */
export function getColumn(...raw: unknown[]): number {
  return normalizeColumn(raw.find((v) => v != null) ?? DEFAULT_LAYOUT.column)
}

/** Author-facing Col width: omit / `'Nx'` / `'max'` / absolute 1–24. */
export type ColSpanRaw = ColSpan | `${ColSpan}` | `${ColSpan}x` | 'max'

export type ColPlace = 'auto' | 'start' | 'end'
export type ColSpan = IntRange<1, typeof GRID_TOTAL>

export function resolveColSpan(raw?: ColSpanRaw, column: number): ColSpan {
  const safeColumn = column > 0 ? column : DEFAULT_LAYOUT.column
  const slot = Math.max(1, Math.floor(GRID_TOTAL / safeColumn)) as ColSpan

  if (raw == null || raw === '') return slot

  if (typeof raw === 'number') {
    assertColSpan(raw)
    return raw
  }

  const text = raw.trim()
  if (text === 'max') return GRID_TOTAL

  const nx = /^(\d+)x$/.exec(text)
  if (nx) {
    const n = Number(nx[1])
    if (n < 1) {
      throw new Error(`[vue-formless] col:span "${raw}" is invalid`)
    }
    return Math.min(GRID_TOTAL, n * slot) as ColSpan
  }

  if (/^\d+$/.test(text)) {
    const n = Number(text)
    assertColSpan(n)
    return n
  }

  throw new Error(`[vue-formless] col:span "${raw}" is invalid`)
}

export function assertColSpan(n: number): asserts n is ColSpan {
  if (!Number.isInteger(n) || n < 1 || n > GRID_TOTAL) {
    throw new Error(`[vue-formless] col:span ${n} must be an integer 1–${GRID_TOTAL}`)
  }
}

export function resolveColPlace(place: unknown): ColPlace {
  if (place == null || place === '' || place === 'auto') return 'auto'
  if (place === 'start' || place === 'end') return place
  throw new Error(`[vue-formless] col:place "${String(place)}" is invalid`)
}
