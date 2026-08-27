const SHELL_KEYS = new Set(['item', 'layout', 'model'])
const SCHEMA_CORE_KEYS = new Set([
  'component',
  'props',
  'model',
  'prop',
  'item',
  'layout',
])

export interface WidgetFormless {
  model?: string | string[]
  item?: boolean
  layout?: boolean
}

export function omitUndefined(
  record: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(record)) {
    if (value !== undefined) out[key] = value
  }
  return out
}

/** Drop outer-shell flags so they never land on inner Item `fl`. */
export function omitShellKeys(fl: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(fl)) {
    if (!SHELL_KEYS.has(key)) out[key] = value
  }
  return out
}

/** Non-core schema keys (label, validation, …) forwarded to Item `fl`. */
export function schemaExtras(control: Record<string, unknown>): Record<string, unknown> {
  const extras: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(control)) {
    if (!SCHEMA_CORE_KEYS.has(key) && value !== undefined) extras[key] = value
  }
  return extras
}

export function readWidgetFormless(component: unknown): WidgetFormless {
  if (component == null || typeof component !== 'object') return {}
  const bag = (component as { formless?: unknown }).formless
  if (bag == null || typeof bag !== 'object') return {}
  const { model, item, layout } = bag as WidgetFormless
  return omitUndefined({ model, item, layout }) as WidgetFormless
}

/** Kernel `fl:*` declared as component props (`fl:prop` → `prop`). */
export function declaredFl(props: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(props)) {
    if (!key.startsWith('fl:') || key.length <= 3 || value === undefined) continue
    out[key.slice(3)] = value
  }
  return out
}

/** Page attrs must not override factory v-model ports on the widget. */
export function stripPortBindings(
  attrs: Record<string, unknown>,
  models: string[],
): Record<string, unknown> {
  const skip = new Set<string>()
  for (const name of models) {
    skip.add(name)
    skip.add(`onUpdate:${name}`)
  }
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(attrs)) {
    if (!skip.has(key)) out[key] = value
  }
  return out
}
