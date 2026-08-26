import type { ResolvedControlBinding } from './control-model'

/**
 * Snapshot for `item.props` / control `props` functions: kernel wiring + opaque extras.
 * Extra fields (`label`, `validate`, …) are typed by the adapter via module augmentation.
 * Not passed as a host component prop.
 */
export interface ItemFl {
  controlKey: string
  binding: ResolvedControlBinding
  getValues: () => unknown[]
  [extra: string]: unknown
}
