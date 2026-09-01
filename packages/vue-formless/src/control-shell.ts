export type ControlItemSetting = boolean | 'self'

export interface ResolveControlShellInput {
  pageItem: boolean
  pageLayoutOn: boolean
  internalItem?: ControlItemSetting
  /** Tag `:fl:item`. Omitted ≠ `true`. */
  tagItem?: boolean
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

/**
 * FormView < internal < tag (ADR-017).
 * Pure `'self'` skips outer Item+Col. `'self'` + explicit tag item true
 * wraps outer Item (and Col when page layout is on) and asks for an inner Row.
 * Col follows the Row host only; no control/cell layout switch.
 */
export function resolveControlShell(
  input: ResolveControlShellInput,
): ResolvedControlShell {
  const self = input.internalItem === 'self'

  let wrapItem: boolean
  if (input.tagItem === true) wrapItem = true
  else if (input.tagItem === false) wrapItem = false
  else if (self) wrapItem = false
  else if (input.internalItem === false) wrapItem = false
  else if (input.internalItem === true) wrapItem = true
  else wrapItem = input.pageItem

  let wrapCol = input.pageLayoutOn
  if (self && input.tagItem !== true) {
    wrapItem = false
    wrapCol = false
  }

  const extraRow = self && input.tagItem === true && input.pageLayoutOn

  return { wrapItem, wrapCol, extraRow, self }
}
