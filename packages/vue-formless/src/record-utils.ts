/** Generic record helpers shared across the kernel. No formless semantics. */

export function omitUndefined(
  record: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(record)) {
    if (value !== undefined) out[key] = value
  }
  return out
}

/** Shallow copy of `record` without `keys`. Values are copied as-is. */
export function omit(
  record: Record<string, unknown>,
  keys: Iterable<string>,
): Record<string, unknown> {
  const skip = new Set(keys)
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(record)) {
    if (!skip.has(key)) out[key] = value
  }
  return out
}
