import type { FieldMode } from './field-schema'

/** The tree `FormField` actually assembles (design.md §8): nature already folded in. */
export type ResolvedFieldMode = 'wrap' | 'embed' | 'wrap-embed'

/** A valid `fl:field` placement — the four writable values. */
export function isFieldMode(value: unknown): value is FieldMode {
  return (
    value === 'auto'
    || value === 'wrap'
    || value === 'embed'
    || value === 'wrap-embed'
  )
}

/** Omit / anything unrecognized = `'auto'` (defer to the control's declaration). */
export function normalizeField(field: unknown): FieldMode {
  return isFieldMode(field) ? field : 'auto'
}

/**
 * nature × placement → tree (design.md §8).
 *
 * `placement` is the schema/tag `field` value; `composite` is the control's
 * static `formless.field === 'embed'`, read at render by `FormFieldCore`. The
 * two are **not** merged as layers — they are combined here.
 *
 * | placement      | leaf           | composite      |
 * |----------------|----------------|----------------|
 * | `'auto'`       | `'wrap'`       | `'embed'`      |
 * | `'wrap'`       | `'wrap'`       | `'wrap-embed'` |
 * | `'embed'`      | `'embed'`      | `'embed'`      |
 * | `'wrap-embed'` | `'wrap-embed'` | `'wrap-embed'` |
 *
 * `'wrap-embed'` stays writable as the escape hatch: it forces the inner window
 * even when the control forgot (or cannot) declare itself composite.
 */
export function resolveFieldMode(field: unknown, composite: boolean): ResolvedFieldMode {
  const placement = normalizeField(field)
  if (placement === 'auto') return composite ? 'embed' : 'wrap'
  if (placement === 'wrap') return composite ? 'wrap-embed' : 'wrap'
  return placement
}
