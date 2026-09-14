// Public API (design.md §19): 5 runtime values + the types needed to use them.
// Everything else in `src` is kernel-private.

// --- layout re-exports -----------------------------------------------------
export { createLayoutView, LayoutItem } from '@vue-formless/layout'
export type {
  ColPlace,
  ColSpanRaw,
  CreateLayoutViewOptions,
  LayoutItemProps,
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
  FieldCell,
  FieldSchema,
  FieldSchemaExtras,
  ItemFl,
} from './item-adapter'
export type { ControlProp, ControlVModel } from './control-model'
export type { HostProps } from './overlay-props'
export type { WidgetFormless } from './fl-config'
