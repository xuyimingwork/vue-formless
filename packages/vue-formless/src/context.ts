import { inject, type Component, type InjectionKey, type Ref } from 'vue'
import type { WrapControl } from './wrap-control'

export interface FormContext {
  /** Current FormView `modelValue` (parent snapshot; do not mutate). */
  model: unknown
  /** Report a field write; FormView patches and emits `update:modelValue`. */
  update: (prop: string, value: unknown) => void
  /**
   * FormView-owned Item shell.
   * Used by `useFormItem` / `FormView.Item`, not by widget authors.
   */
  wrap: WrapControl
  /** This FormView layer's Item switch. */
  isItemEnabled: () => boolean
  /** This FormView's `:fl:layout` switch (page, not nearest LayoutView). */
  isLayoutEnabled: () => boolean
  /** Factory `createLayoutView` result; reused for gear-4 inner host. */
  LayoutView: Component
  /** `createFormView({ layout })` density; inner extra rows use this, not the page `:row:*`. */
  factoryColumn: number
  factoryGutter: number
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
