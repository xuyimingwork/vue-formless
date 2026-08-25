import type { ResolvedControlBinding } from './control-model'

/**
 * Adapter Item `props.fl`: extras + kernel wiring.
 * Does not include widget `model` lists or outer `item` / `layout` shell flags.
 */
export type ItemFl = Record<string, unknown> & {
  controlKey: string
  binding: ResolvedControlBinding
  getValues: () => unknown[]
}
