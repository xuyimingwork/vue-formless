// Public API (design.md §19): 5 runtime values + the types needed to use them.
// Everything else in `src` is kernel-private.

// --- layout re-exports -----------------------------------------------------
export { createLayoutView, LayoutItem } from '@vue-formless/layout'
export type {
  CreateLayoutViewOptions,
  LayoutItemPlace,
  LayoutItemProps,
  LayoutItemSpan,
  LayoutViewProps,
} from '@vue-formless/layout'

// --- FormView --------------------------------------------------------------
export { createFormView } from './create-form-view'
export type {
  CreateFormViewOptions,
  FormViewComponent,
  FormViewProps,
} from './create-form-view'

// --- createFormFields ------------------------------------------------------
export { createFormFields } from './create-form-fields'
export type { NamespacedFields } from './create-form-fields'

// --- FormField -------------------------------------------------------------
export { FormField } from './FormField'
export type {
  FormFieldComponent,
  FormFieldProps,
  FormFieldSlotProps,
} from './FormField'

// --- schema / binding types ------------------------------------------------
export type {
  FieldMode,
  FieldSchema,
  FieldSchemaExtras,
  ItemFl,
} from './field-schema'
export type { ControlProp, ControlVModel } from './control-binding'
export type { HostProps } from './props-overlay'
export type { ControlFormless } from './control-config'
