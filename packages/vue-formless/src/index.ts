// Public API (design.md §19): 5 runtime values + the types a consumer must name.
// Everything else in `src` is kernel-private.

// --- layout re-exports -----------------------------------------------------
// Values only: the layout prop types stay in `@vue-formless/layout`.
export { createLayoutView, LayoutItem } from '@vue-formless/layout'

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
export type { FormFieldComponent, FormFieldSlotProps } from './FormField'

// --- schema / binding types ------------------------------------------------
// Only the three a consumer has to name: the module-augmentation target
// (`FieldSchema`), the control bag that augments it (`ControlFormless`), and
// the adapter snapshot (`FormFieldFormless`). Their derivations —
// `FieldSchemaExtras`, `FieldSchemaInput`, `FieldMode`, `ControlProp` /
// `ControlVModel`, `HostProps`, `FormFieldFormlessRaw` — stay private;
// `FieldSchema`'s own members are reachable via indexed access.
export type {
  ControlFormless,
  FieldSchema,
  FormFieldFormless,
  FormFieldProps,
} from './field-schema'
