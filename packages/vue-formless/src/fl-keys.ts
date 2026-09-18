const SHELL_KEYS = new Set([
  'item',
  'layout',
  'model',
  'prop',
  'span',
  'field',
  'component',
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
