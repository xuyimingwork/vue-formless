export interface FormLayoutOptions {
  /** Columns per row → default Col span = GRID_TOTAL / column. */
  column?: number
}

/** FormView `:fl:layout` is a boolean switch. Density is factory / `:row:*`. */
export type FormLayoutProp = boolean

/** Host Col span modulus (Element / Ant Design 24-grid). Not a bind-time option. */
export const GRID_TOTAL = 24

/** Kernel column when factory and tag omit it. Gutter is a Row attr on FormView, not occupancy. */
export const DEFAULT_LAYOUT: Required<FormLayoutOptions> = {
  column: 1,
}

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
export type ColSpanSpec = string | number

export type ColPlace = 'auto' | 'start' | 'end'

export function resolveColSpan(spec: ColSpanSpec | undefined, column: number): number {
  const safeColumn = column > 0 ? column : DEFAULT_LAYOUT.column
  const slot = Math.max(1, Math.floor(GRID_TOTAL / safeColumn))

  if (spec == null || spec === '') return slot

  if (typeof spec === 'number') {
    assertAbsoluteSpan(spec)
    return spec
  }

  const text = spec.trim()
  if (text === 'max') return GRID_TOTAL

  const nx = /^(\d+)x$/.exec(text)
  if (nx) {
    const n = Number(nx[1])
    if (n < 1) {
      throw new Error(`[vue-formless] col:span "${spec}" is invalid`)
    }
    return Math.min(GRID_TOTAL, n * slot)
  }

  if (/^\d+$/.test(text)) {
    const n = Number(text)
    assertAbsoluteSpan(n)
    return n
  }

  throw new Error(`[vue-formless] col:span "${spec}" is invalid`)
}

function assertAbsoluteSpan(n: number): void {
  if (!Number.isInteger(n) || n < 1 || n > GRID_TOTAL) {
    throw new Error(`[vue-formless] col:span ${n} must be an integer 1–${GRID_TOTAL}`)
  }
}

export function resolveColPlace(place: unknown): ColPlace {
  if (place == null || place === '' || place === 'auto') return 'auto'
  if (place === 'start' || place === 'end') return place
  throw new Error(`[vue-formless] col:place "${String(place)}" is invalid`)
}

export function toOptionalNumber(value: unknown): number | undefined {
  if (value == null || value === '') return undefined
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return undefined
  return n
}

/** `used` mutation for `place`. Returns blank Col spans to insert before this cell. */
export function takePlaceBlanks(
  used: { n: number },
  n: number,
  place: ColPlace,
): number[] {
  const blanks: number[] = []
  if (place === 'auto') {
    if (used.n + n > GRID_TOTAL) used.n = 0
    return blanks
  }
  if (place === 'start') {
    if (used.n > 0) {
      blanks.push(GRID_TOTAL - used.n)
      used.n = 0
    }
    return blanks
  }
  if (used.n + n > GRID_TOTAL && used.n > 0) {
    blanks.push(GRID_TOTAL - used.n)
    used.n = 0
  }
  const pad = GRID_TOTAL - used.n - n
  if (pad > 0) {
    blanks.push(pad)
    used.n += pad
  }
  return blanks
}
