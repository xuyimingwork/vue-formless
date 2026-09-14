import type { FieldMode } from './field-schema'
import { omitUndefined } from './record-utils'

/** Static `formless` bag a widget may declare on `ComponentCustomOptions`. */
export interface WidgetFormless {
  model?: string | string[]
  item?: boolean
  field?: FieldMode
  prop?: string | string[]
}

declare module 'vue' {
  interface ComponentCustomOptions {
    formless?: WidgetFormless
  }
}

export function readWidgetFormless(component: unknown): WidgetFormless {
  if (component == null || typeof component !== 'object') return {}
  const bag = (component as { formless?: unknown }).formless
  if (bag == null || typeof bag !== 'object') return {}
  const { model, item, field, prop } = bag as WidgetFormless
  return omitUndefined({ model, item, field, prop }) as WidgetFormless
}
