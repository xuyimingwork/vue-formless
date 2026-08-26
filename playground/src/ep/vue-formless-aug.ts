import type { ControlValidation, ValidatePolicy } from './identity-rules'

declare module 'vue-formless' {
  interface ControlSchema {
    label?: string
    validation?: ControlValidation
  }

  interface FormControlProps {
    'fl:label'?: string
    'fl:validate'?: ValidatePolicy
  }

  interface FormViewItemProps {
    'fl:label'?: string
    'fl:validate'?: ValidatePolicy
  }

  interface ItemFl {
    label?: string
    validate?: ValidatePolicy
    validation?: ControlValidation
  }
}

export {}
