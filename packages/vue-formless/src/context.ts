import { inject, type Component, type InjectionKey, type Ref } from 'vue'
import type { ToRules } from './identityRules'

/** External grid primitives bound by `createFormView` (ADR-007 / ADR-008). */
export interface FormGridAdapter {
  Row: Component
  Col: Component
  /** Total column units (Element / Ant Design default 24). */
  total: number
}

/** FormItem + rule compile bound by `createFormView` (ADR-012). */
export interface FormItemAdapter {
  Item: Component
  toRules?: ToRules
}

export interface FormContext {
  /** Current FormView `modelValue` (parent snapshot; do not mutate). */
  model: unknown
  /** Report a field write; FormView patches and emits `update:modelValue`. */
  update: (prop: string, value: unknown, path?: string) => void
  readonly: boolean
  disabled: boolean
  /** Page-level default span when layout hosting is on (`total / column`). */
  defaultSpan?: number
  column?: number
  gutter?: number
  /**
   * Present when FormView was created with Row/Col.
   * `layout: true` means hosting is on — fields wrap with Col; escape with `formless.bare`.
   */
  grid?: FormGridAdapter & { layout: boolean }
  /** Present when FormView was created with Item. Independent of grid hosting. */
  item?: FormItemAdapter
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
