import { inject, type Component, type InjectionKey, type Ref } from 'vue'

/** External grid primitives bound by `createFormView` (ADR-007 / ADR-008). */
export interface FormGridAdapter {
  Row: Component
  Col: Component
  /** Total column units (Element / Ant Design default 24). */
  total: number
}

export interface FormContext<T extends Record<string, unknown> = Record<string, unknown>> {
  model: T
  readonly: boolean
  disabled: boolean
  /** Page-level default span when FormView hosts the grid. */
  defaultSpan?: number
  columns?: number
  gutter?: number
  /**
   * Present when FormView was created with Row/Col and `layout` is on.
   * Field components wrap with `Col` + `span`; escape with `bare` / `layout=false`.
   */
  grid?: FormGridAdapter & { layout: boolean }
}

export const formContextKey: InjectionKey<FormContext> = Symbol('vue-formless.formContext')

export function useFormContext<T extends Record<string, unknown> = Record<string, unknown>>(): FormContext<T> {
  const ctx = inject(formContextKey, null)
  if (!ctx) {
    throw new Error('[vue-formless] useFormContext() must be used inside <FormView>.')
  }
  return ctx as FormContext<T>
}

export type MaybeRefModel<T> = T | Ref<T>
