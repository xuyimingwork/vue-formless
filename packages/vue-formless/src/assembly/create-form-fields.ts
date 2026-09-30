import { toCamel, upperFirst, type ToCamel, type UpperFirst } from '../shared/utils'
import { type CreateFormFieldOptions, type FormControlProps } from '../shared/form-field-types'
import { createFormField, type FormFieldComponent } from './create-form-field'

/**
 * PascalCase field tags. `S` must not be `Record<string, _>` or `keyof` collapses
 * to `string` and Volar/TS lose `User.Name` / `User.IdCard` as named keys.
 * Tag props are `fl:*` plus the control's public props (v-model ports locked).
 *
 * Keys may be camelCase (`timeRange`) or kebab-case (`time-range`); both land on
 * the same tag (`<User.TimeRange />`). The runtime normalizes via
 * `upperFirst(toCamel(key))`, so the type must mirror it exactly. Normalizing
 * the tag is all this mapping does — `prop` is not derived from the tag name.
 */
export type FormFields<S> = {
  [K in keyof S & string as UpperFirst<ToCamel<K>>]: FormFieldComponent<FormControlProps<S[K]>>
}

/**
 * Build a static namespaced field table (design.md §11).
 * Schema keys are camelCase (`timeRange`) or kebab-case (`time-range`) field
 * names; only the **tag name** is normalized (`<User.TimeRange />`). The key as
 * written still supplies the default `prop`.
 */
export function createFormFields<const S extends { [K in keyof S]: CreateFormFieldOptions }>(
  options: S,
): FormFields<S> {
  const result = {} as FormFields<S>

  for (const key of Object.keys(options) as (keyof S & string)[]) {
    const field = options[key]
    if (!field) continue
    // Normalization touches the tag name only. The default `prop` stays the key
    // verbatim — it is a location, and the table does not reinterpret it (a
    // kebab key therefore needs an explicit `fl:prop`, since `parsePath` has no
    // unquoted `-`). `name` is debug-only, so it takes the finished tag form.
    const name = upperFirst(toCamel(key)) as UpperFirst<ToCamel<typeof key>> &
      keyof FormFields<S>
    result[name] = createFormField({
      name: name, prop: key,
      ...field
    }) as FormFields<S>[typeof name]
  }

  return result
}
