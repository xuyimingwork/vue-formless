import { omitUndefined } from './utils'

/** Static `formless` bag a control may declare on `ComponentCustomOptions`. */
export interface ControlFormless {
  /** v-model ports on the control (design.md §7.1). */
  model?: string | string[]
  /**
   * Composite marker (design.md §8): "my inner `<FormField>`s need an inner
   * LayoutView whenever this field is boxed". Only `'embed'` is meaningful —
   * it is the control's **nature**, not a placement, so it is read at render
   * (`FormFieldCore`) and folded into `fl:field`, never merged as a preset layer.
   */
  field?: 'embed'
}

declare module 'vue' {
  interface ComponentCustomOptions {
    formless?: ControlFormless
  }
}

/**
 * Pure read of a control's static `formless` bag. Nothing is merged here: the
 * caller decides how to combine it (model as a fallback port list, `field` as
 * the composite marker).
 */
export function readControlFormless(component: unknown): ControlFormless {
  const kind = typeof component
  if (component == null || (kind !== 'object' && kind !== 'function')) return {}
  const bag = (component as { formless?: unknown }).formless
  if (bag == null || typeof bag !== 'object') return {}
  const { model, field } = bag as ControlFormless
  return omitUndefined({ model, field }) as ControlFormless
}
