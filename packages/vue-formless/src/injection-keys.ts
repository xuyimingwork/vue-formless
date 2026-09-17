import type { Component, InjectionKey } from 'vue'

export interface FormContext {
  /** Current FormView `modelValue` (parent snapshot; do not mutate). */
  model: unknown
  /** Report a field write; FormView patches and emits `update:modelValue`. */
  update: (prop: string, value: unknown) => void
  /** Assembled host Item (e.g. ElFormItem). Unbound = passthrough children. */
  FormItem: Component
  /** Same factory-bound LayoutView; wrap-embed creates an inner window with it. */
  LayoutView: Component
  getModelBinding(prop?: string): { value: any, update: (v: any) => void }
}

export const FORM_VIEW_KEY: InjectionKey<FormContext | null> = Symbol(
  'vue-formless:form-view',
)

/**
 * Identity layer (design.md §7.2 / §16.2): the effective v-model port ↔ location
 * map a field resolves for itself, **plus** its port-keyed read/write accessor.
 * The **root** `FormField` provides it (closing over the page scope); every
 * nested slice consumes it to select a port — `fl:model` on a slice is a
 * selection, never a declaration. Consumers ask by port, never by location.
 */
export const FORM_FIELD_KEY: InjectionKey<{
  getProp(model?: string): any
} | null> = Symbol(
  'vue-formless:form-field',
)
