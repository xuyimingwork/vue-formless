import { inject, type Component, type InjectionKey, type Ref } from 'vue'
import type { WrapControl } from './wrap-control'

/** External grid primitives bound by `createFormView` (ADR-007 / ADR-008). */
export interface FormGridAdapter {
  Row: Component
  Col: Component
}

export interface FormContext {
  /** Current FormView `modelValue` (parent snapshot; do not mutate). */
  model: unknown
  /** Report a field write; FormView patches and emits `update:modelValue`. */
  update: (prop: string, value: unknown) => void
  /**
   * FormView-owned shell: Col? → Item? → body.
   * Used by `useFormItem` / `FormView.Item`, not by widget authors.
   */
  wrap: WrapControl
  /** This FormView / Layout layer's Item switch. */
  isItemEnabled: () => boolean
  /** True inside hosted layout (Row/Col wrap is available). */
  isLayoutEnabled: () => boolean
}

export const formContextKey: InjectionKey<FormContext> = Symbol('vue-formless.formContext')

export function useFormContext(): FormContext {
  const ctx = inject(formContextKey, null)
  if (!ctx) {
    throw new Error('[vue-formless] useFormContext() must be used inside <FormView>.')
  }
  return ctx
}

export type MaybeRefModel<T> = T | Ref<T>
