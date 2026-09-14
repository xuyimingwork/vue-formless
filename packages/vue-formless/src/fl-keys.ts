const SHELL_KEYS = new Set([
  'item',
  'layout',
  'model',
  'prop',
  'span',
  'field',
  'component',
])

const SCHEMA_CORE_KEYS = new Set([
  'component',
  'props',
  'model',
  'prop',
  'item',
  'field',
  // leftover schema `layout` must not leak into Item snapshot extras
  'layout',
])

/** Drop outer-shell flags so they never land on inner Item `fl`. */
export function omitShellKeys(fl: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(fl)) {
    if (key === 'span' && value !== undefined) {
      console.warn('[vue-formless] fl:span is removed; use layout-item:span')
    }
    if (!SHELL_KEYS.has(key)) out[key] = value
  }
  return out
}

/** Non-core schema keys (label, validation, …) forwarded to Item `fl`. */
export function schemaExtras(field: Record<string, unknown>): Record<string, unknown> {
  const extras: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(field)) {
    if (!SCHEMA_CORE_KEYS.has(key) && value !== undefined) extras[key] = value
  }
  return extras
}
