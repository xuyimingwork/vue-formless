export function hostEl(source: unknown): Element | null {
  if (source == null || typeof source !== 'object') return null
  if (typeof Element !== 'undefined' && source instanceof Element) return source
  const el = (source as { $el?: unknown }).$el
  return typeof Element !== 'undefined' && el instanceof Element ? el : null
}
