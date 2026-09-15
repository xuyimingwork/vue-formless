import { inject } from 'vue'
import { FORM_VIEW_KEY, type FormContext } from './injection-keys'

export type { FormContext } from './injection-keys'

export function useFormContext(): FormContext {
  const formViewContext = inject(FORM_VIEW_KEY, null)
  if (!formViewContext) {
    throw new Error('[vue-formless] useFormContext() must be used inside <FormView>.')
  }
  return formViewContext
}
