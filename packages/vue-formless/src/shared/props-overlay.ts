import type { HostProps } from './field-schema'
import { omitUndefined } from './utils'

export function resolveProps<TFl>(
  spec: HostProps<TFl> | undefined,
  fl: TFl,
): Record<string, unknown> {
  if (spec == null) return {}
  if (typeof spec === 'function') return omitUndefined(spec(fl) ?? {})
  return omitUndefined(spec)
}

/** Later layers win. `undefined` does not override. Empty string is a value. */
export function mergeAttrs(
  ...layers: Array<Record<string, unknown> | undefined>
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const layer of layers) {
    if (layer == null) continue
    for (const [key, value] of Object.entries(layer)) {
      if (value !== undefined) out[key] = value
    }
  }
  return out
}
