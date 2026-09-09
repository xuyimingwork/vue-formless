import { inject, type Ref } from 'vue'
import { FORM_VIEW_KEY, type FormContext } from './injection-keys'

export type { FormContext } from './injection-keys'

export function useFormContext(): FormContext {
  const ctx = inject(FORM_VIEW_KEY, null)
  if (!ctx) {
    throw new Error('[vue-formless] useFormContext() must be used inside <FormView>.')
  }
  return ctx
}

export type MaybeRefModel<T> = T | Ref<T>
