import type { FieldMode } from './field-schema'

/** A valid `fl:field` mode. */
export function isFieldMode(value: unknown): value is FieldMode {
  return value === 'wrap' || value === 'embed' || value === 'wrap-embed'
}

/**
 * Whole-value replacement (ADR-020 §8): a valid `fl:field` replaces the
 * schema/widget mode (already merged into the attr layer by the factory);
 * anything else is `'wrap'`, the omitted default.
 */
export function resolveFieldMode(tagField: unknown): FieldMode {
  return isFieldMode(tagField) ? tagField : 'wrap'
}
