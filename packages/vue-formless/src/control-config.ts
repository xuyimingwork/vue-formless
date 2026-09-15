import type { FieldMode } from './field-schema'
import { omitUndefined } from './utils'

/** Static `formless` bag a control may declare on `ComponentCustomOptions`. */
export interface ControlFormless {
  model?: string | string[]
  item?: boolean
  field?: FieldMode
  prop?: string | string[]
}

declare module 'vue' {
  interface ComponentCustomOptions {
    formless?: ControlFormless
  }
}

export function readControlFormless(component: unknown): ControlFormless {
  if (component == null || typeof component !== 'object') return {}
  const bag = (component as { formless?: unknown }).formless
  if (bag == null || typeof bag !== 'object') return {}
  const { model, item, field, prop } = bag as ControlFormless
  return omitUndefined({ model, item, field, prop }) as ControlFormless
}
