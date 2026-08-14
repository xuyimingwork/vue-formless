export interface FormLayoutOptions {
  /** Columns per row → defaultSpan = total / column. @default 2 when layout is on */
  column?: number
  /** Passed through to Row when supported. @default 16 when layout is on */
  gutter?: number
}

/** `layout` prop: omit/false = Context only; true = hosted with defaults; object = hosted with density. */
export type FormLayoutProp = boolean | FormLayoutOptions

export interface ResolvedFormLayout {
  enabled: boolean
  column: number
  gutter: number
  /** Derived: total / column (integer division). */
  defaultSpan: number
}

/** Defaults used when `layout` is `true` or when object omits fields. */
export const DEFAULT_LAYOUT: Required<FormLayoutOptions> = {
  column: 2,
  gutter: 16,
}

export function resolveLayout(
  layout: FormLayoutProp | undefined,
  total: number,
): ResolvedFormLayout {
  if (layout === false || layout == null) {
    return {
      enabled: false,
      column: DEFAULT_LAYOUT.column,
      gutter: DEFAULT_LAYOUT.gutter,
      defaultSpan: Math.floor(total / DEFAULT_LAYOUT.column),
    }
  }

  const opts: FormLayoutOptions = layout === true ? {} : layout
  const column = opts.column ?? DEFAULT_LAYOUT.column
  const gutter = opts.gutter ?? DEFAULT_LAYOUT.gutter
  const safeColumn = column > 0 ? column : DEFAULT_LAYOUT.column

  return {
    enabled: true,
    column: safeColumn,
    gutter,
    defaultSpan: Math.max(1, Math.floor(total / safeColumn)),
  }
}
