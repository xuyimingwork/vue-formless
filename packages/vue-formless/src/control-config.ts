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
