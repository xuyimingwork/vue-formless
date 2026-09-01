export type ControlItemSetting = boolean | 'self'

export interface ResolveControlShellInput {
  pageItem: boolean
  pageLayoutOn: boolean
  internalItem?: ControlItemSetting
  internalLayout?: boolean
  /** Tag `:fl:item`. Omitted ≠ `true`. */
  tagItem?: boolean
  /** Tag `:fl:layout`. Omitted ≠ `true`. */
  tagLayout?: boolean
}

export interface ResolvedControlShell {
  wrapItem: boolean
  wrapCol: boolean
  extraRow: boolean
  self: boolean
}

/** Widget `formless.item` vs schema `item`. `'self'` vs `false` is illegal. */
export function mergeInternalItem(
  widget?: ControlItemSetting,
  schema?: ControlItemSetting,
): ControlItemSetting | undefined {
  if (
    (widget === 'self' && schema === false) ||
    (widget === false && schema === 'self')
  ) {
    throw new Error(
      '[vue-formless] formless.item "self" conflicts with schema item: false',
    )
  }
  return widget ?? schema
}

export function mergeInternalLayout(
  widget?: boolean,
  schema?: boolean,
): boolean | undefined {
  if (widget === false || schema === false) return false
  return widget ?? schema
}

/**
 * FormView < internal < tag (ADR-017).
 * Pure `'self'` skips outer Item+Col. `'self'` + explicit tag item true
 * wraps outer Item (and Col when page layout is on) and asks for an inner Row.
 */
export function resolveControlShell(
  input: ResolveControlShellInput,
): ResolvedControlShell {
  const self = input.internalItem === 'self'

  const wrapColFromLayers =
    input.pageLayoutOn &&
    input.tagLayout !== false &&
    !(input.tagLayout === undefined && input.internalLayout === false)

  let wrapItem: boolean
  if (input.tagItem === true) wrapItem = true
  else if (input.tagItem === false) wrapItem = false
  else if (self) wrapItem = false
  else if (input.internalItem === false) wrapItem = false
  else if (input.internalItem === true) wrapItem = true
  else wrapItem = input.pageItem

  let wrapCol = wrapColFromLayers
  if (self && input.tagItem !== true) {
    wrapItem = false
    wrapCol = false
  }

  const extraRow = self && input.tagItem === true && wrapCol

  return { wrapItem, wrapCol, extraRow, self }
}
