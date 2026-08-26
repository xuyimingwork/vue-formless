import { omitUndefined } from './fl-config'

/** Static host props, or derived from that layer's snapshot. */
export type HostProps<TFl> =
  | Record<string, unknown>
  | ((fl: TFl) => Record<string, unknown> | undefined)

export function resolveProps<TFl>(
  spec: HostProps<TFl> | undefined,
  fl: TFl,
): Record<string, unknown> {
  if (spec == null) return {}
  if (typeof spec === 'function') return omitUndefined(spec(fl) ?? {})
  return omitUndefined(spec)
}

/** Later layers win. `undefined` does not override. Empty string is a value. */
export function overlayProps(
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
