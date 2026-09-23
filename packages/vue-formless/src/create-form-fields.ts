import { upperFirst, type UpperFirst } from './utils'
import {
  createFormFieldComponent,
  type FieldSchemaInput,
} from './create-field-component'
import { createFormField, type FormFieldComponent } from './FormField'
import type { FieldSchema } from './field-schema'
import type { ControlTagProps } from './control-props'

export type { FieldSchemaInput } from './create-field-component'
export type { FormFieldComponent } from './FormField'
export type { FieldMode, FieldSchema, FormFieldTagProps, ItemFl } from './field-schema'
export type { ControlProp, ControlVModel } from './control-binding'
export type { HostProps } from './props-overlay'
export type {
  ComponentPublicProps,
  LockedVModelKeys,
  ControlTagProps,
} from './control-props'

/** Loose schema bag. Prefer inferring `S` from an object literal via `createFormFields`. */
export type FormFieldsSchema = Record<string, FieldSchema>

/**
 * PascalCase field tags. `S` must not be `Record<string, _>` or `keyof` collapses
 * to `string` and Volar/TS lose `User.Name` / `User.IdCard` as named keys.
 * Tag props are `fl:*` plus the control's public props (v-model ports locked).
 */
export type NamespacedFields<S> = {
  [K in keyof S & string as UpperFirst<K>]: FormFieldComponent<ControlTagProps<S[K]>>
}

/**
 * Build a static namespaced field table (design.md §11).
 * Schema keys are camelCase field names → `<User.TimeRange />`.
 */
export function createFormFields<const S extends { [K in keyof S]: FieldSchemaInput }>(
  schema: S,
): NamespacedFields<S> {
  const result = {} as NamespacedFields<S>

  for (const schemaKey of Object.keys(schema) as (keyof S & string)[]) {
    const field = schema[schemaKey]
    if (!field) continue
    const pascalKey = upperFirst(schemaKey) as UpperFirst<typeof schemaKey> &
      keyof NamespacedFields<S>
    result[pascalKey] = createFormField(
      Object.assign({ name: schemaKey, prop: schemaKey }, field),
    ) as NamespacedFields<S>[typeof pascalKey]
  }

  return result
}
