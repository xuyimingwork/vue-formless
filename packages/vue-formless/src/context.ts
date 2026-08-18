import { inject, type Component, type InjectionKey, type Ref } from 'vue'

/** External grid primitives bound by `createFormView` (ADR-007 / ADR-008). */
export interface FormGridAdapter {
  Row: Component
  Col: Component
  /** Total column units (Element / Ant Design default 24). */
  total: number
}

export interface FormContext<T extends Record<string, unknown> = Record<string, unknown>> {
  /** Current FormView `modelValue` (parent snapshot; do not mutate). */
  model: T
  /** Report a field write; FormView patches and emits `update:modelValue`. */
  update: (path: string, value: unknown) => void
  readonly: boolean
  disabled: boolean
  /** Page-level default span when layout hosting is on (`total / column`). */
  defaultSpan?: number
  column?: number
  gutter?: number
  /**
   * Present when FormView was created with Row/Col.
   * `layout: true` means hosting is on — fields wrap with Col; escape with `bare` / omit layout.
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
