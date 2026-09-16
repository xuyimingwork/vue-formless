import type { FieldMode } from './field-schema'

/** A valid `fl:field` mode. */
export function isFieldMode(value: unknown): value is FieldMode {
  return value === 'wrap' || value === 'embed' || value === 'wrap-embed'
}

/**
 * Whole-value replacement (design.md §8): a valid `fl:field` replaces the
 * schema/control mode (already merged into the attr layer by the factory);
 * anything else is `'wrap'`, the omitted default.
 */
export function normalizeField(field: unknown): FieldMode {
  if (field === 'embed') return field
  if (field === 'wrap-embed') return field
  return 'wrap'
}
