import { markRaw } from 'vue'
import { camelToPascal, type CamelToPascal } from './case'
import {
  createFormFieldComponent,
  type CreateFormFieldOptions,
  type FieldSchemaInput,
  type FormFieldComponent,
} from './FormField'
import type { FieldSchema } from './item-adapter'
import type { WidgetTagProps } from './widget-props'

export type {
  CreateFormFieldOptions,
  FieldSchemaInput,
  FormFieldComponent,
} from './FormField'
export type { FieldSchema, FormFieldProps, ItemFl, FieldCell } from './item-adapter'
export type { ControlProp, ControlVModel } from './control-model'
export type { HostProps } from './overlay-props'
export type {
  ComponentPublicProps,
  LockedVModelKeys,
  WidgetTagProps,
} from './widget-props'

export type CreateFormFieldsOptions = CreateFormFieldOptions

/** Loose schema bag. Prefer inferring `S` from an object literal via `createFormFields`. */
export type FormFieldsSchema = Record<string, FieldSchema>

/**
 * PascalCase field tags. `S` must not be `Record<string, _>` or `keyof` collapses
 * to `string` and Volar/TS lose `User.Name` / `User.IdCard` as named keys.
 * Tag props are `fl:*` plus the widget's public props (v-model ports locked).
 */
export type NamespacedFields<S> = {
  [K in keyof S & string as CamelToPascal<K>]: FormFieldComponent<WidgetTagProps<S[K]>>
}

/**
 * Build a static namespaced field table (ADR-009 / ADR-020).
 * Schema keys are camelCase field names → `<User.TimeRange />`.
 */
export function createFormFields<const S extends { [K in keyof S]: FieldSchemaInput }>(
  schema: S,
  options?: CreateFormFieldsOptions,
): NamespacedFields<S> {
  const normalized = normalizeSchema(schema)
  const result = {} as NamespacedFields<S>

  for (const fieldKey of Object.keys(normalized) as (keyof S & string)[]) {
    const item = normalized[fieldKey]
    if (!item) continue
    const pascalKey = camelToPascal(fieldKey) as CamelToPascal<typeof fieldKey> &
      keyof NamespacedFields<S>
    result[pascalKey] = createFormFieldComponent(
      fieldKey,
      item,
      options,
    ) as NamespacedFields<S>[typeof pascalKey]
  }

  return result
}

function normalizeSchema<S extends { [K in keyof S]: FieldSchemaInput }>(schema: S): S {
  const out: Record<string, FieldSchemaInput> = {
    ...(schema as Record<string, FieldSchemaInput>),
  }
  for (const key of Object.keys(out)) {
    const item = out[key]
    if (!item) continue
    out[key] = {
      ...item,
      component: item.component && typeof item.component === 'object'
        ? markRaw(item.component)
        : item.component,
    }
  }
  return out as S
}
