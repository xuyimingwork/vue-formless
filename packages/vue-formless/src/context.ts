import { inject } from 'vue'
import { FORM_VIEW_KEY, type FormViewContext } from './injection-keys'

export type { FormViewContext } from './injection-keys'

export function useFormViewContext(): FormViewContext {
  const formViewContext = inject(FORM_VIEW_KEY, null)
  if (!formViewContext) {
    throw new Error('[vue-formless] useFormViewContext() must be used inside <FormView>.')
  }
  return formViewContext
}
