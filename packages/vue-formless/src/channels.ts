/**
 * Channel prefixes on a FormField tag / slot name (design.md §5.2).
 * The kernel peels these once; the remainder is host fallthrough.
 *
 * `layout:`      → LayoutView (page window on FormView; wrap-embed inner on a field)
 * `layout-item:` → LayoutItem (this cell)
 * `item:`        → host Item shell (e.g. ElFormItem)
 */
export const FL_PREFIX = 'fl:'
export const LAYOUT_PREFIX = 'layout:'
export const LAYOUT_ITEM_PREFIX = 'layout-item:'
export const ITEM_PREFIX = 'item:'
export const ITEM_ON_PREFIX = 'onItem:'
