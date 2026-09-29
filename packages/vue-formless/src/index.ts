// Public API (design.md §19): 5 runtime values + the types a consumer must name.
// Everything else in `src` is kernel-private.

// --- layout re-exports -----------------------------------------------------
// Values only: the layout prop types stay in `@vue-formless/layout`.
export { createLayoutView, LayoutItem } from '@vue-formless/layout'

// --- FormView --------------------------------------------------------------
export { createFormView } from './assembly/create-form-view'
export type {
  CreateFormViewOptions,
  FormViewComponent,
  FormViewProps,
} from './assembly/create-form-view'

// --- createFormFields ------------------------------------------------------
export { createFormFields } from './assembly/create-form-fields'
export type { NamespacedFields } from './assembly/create-form-fields'

// --- FormField -------------------------------------------------------------
export { FormField } from './assembly/create-form-field'
export type { FormFieldComponent, FormFieldSlotProps } from './assembly/create-form-field'

// --- declaration / binding types -------------------------------------------
// The types a consumer has to name: the module-augmentation anchor
// (`FormFieldCustomOptions`), the factory input it feeds (`CreateFormFieldOptions`),
// the control bag that augments Vue's `ComponentCustomOptions`
// (`FormControlFormless`), and the adapter snapshot (`FormFieldFormless`). Their
// derivations — `FormFieldExtras`, `FormFieldKernelKeys`, `FormFieldFormlessRaw`,
// `FormFieldFormlessField(Raw)`, `FormFieldVModel(Raw)` / `FormFieldProp(Raw)`,
// `FormFieldCustomTagProps`, `HostProps` — stay private; the declaration's own
// members are reachable via indexed access.
export type {
  CreateFormFieldOptions,
  FormFieldCustomOptions,
  FormControlFormless,
  FormFieldFormless,
  FormFieldProps,
} from './shared/field-schema'
