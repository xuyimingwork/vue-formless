export type PlaceholderKind = 'input' | 'select'

/** Default placeholder from label. Explicit placeholder on the control wins. */
export function defaultPlaceholder(kind: PlaceholderKind, label?: string): string | undefined {
  if (!label) return undefined
  return kind === 'select' ? `请选择${label}` : `请输入${label}`
}
