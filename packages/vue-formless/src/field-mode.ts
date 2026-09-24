import type { FieldMode } from './field-schema'

/** A valid `fl:field` placement — the four writable values. */
export function isFieldMode(value: unknown): value is FieldMode {
  return (
    value === 'auto'
    || value === 'wrap'
    || value === 'embed'
    || value === 'wrap-embed'
  )
}
