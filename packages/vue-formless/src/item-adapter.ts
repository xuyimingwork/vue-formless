import type { ResolvedControlBinding } from './control-model'

/**
 * Adapter Item `props.fl`: kernel wiring + opaque extras.
 * Extra fields (`label`, `validate`, …) are typed by the adapter via module augmentation.
 */
export interface ItemFl {
  controlKey: string
  binding: ResolvedControlBinding
  getValues: () => unknown[]
  [extra: string]: unknown
}
