import { defineComponent, inject, type VNodeChild } from 'vue'
import { FormField, type FormFieldComponent } from './FormField'
import {
  buildItemFl,
  fieldPropBinding,
  resolveDeclaredBinding,
  resolveFieldBinding,
} from './field-identity'
import { FORM_FIELD_KEY } from './injection-keys'
import { isFieldMode } from './field-mode'
import { readControlFormless } from './control-config'
import { schemaExtras } from './fl-keys'
import type { FieldSchema } from './field-schema'
import { overlayProps, resolveProps } from './props-overlay'
import { dispatch } from './dispatch'
import { upperFirst } from './utils'

/**
 * Constraint for factories only. `component` stays `unknown` so object
 * literals keep `typeof ElInput` instead of widening to Vue's `Component`.
 */
export type FieldSchemaInput = Omit<FieldSchema, 'component'> & {
  component?: unknown
}

/**
 * `createFormFieldComponent` input: one field schema plus its `name`. The name
 * only labels the debug component — the `fl:prop` default is the caller's job
 * (`createFormFields` passes the schema key as both), so a schema that always
 * declares `prop` may omit `name`.
 */
export type FieldFactoryInput = FieldSchemaInput & {
  /** Debug-only component name; omit when the schema always declares `prop`. */
  name?: string
}

/** Keys the factory owns; the tag must not restate them (identity is locked, design.md §7.2). */
const LOCKED_TAG_KEYS = new Set(['fl:model', 'fl:component'])

/**
 * `FieldSchema` → the equivalent layer of `fl:*` tag attrs: every schema key
 * has an `fl:` twin (`component` / `props` / `prop` / `model` / `item` / `field`)
 * and extras become `fl:label`… The schema is therefore just a preset attr
 * layer under the author's tag — nothing here is FormField-private.
 */
function schemaToFieldAttrs(schema: FieldSchemaInput): Record<string, unknown> {
  const controlFormless = readControlFormless(schema.component)
  const attrs: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(
    schemaExtras(schema as Record<string, unknown>),
  )) {
    attrs[`fl:${key}`] = value
  }
  return {
    ...attrs,
    'fl:model': controlFormless.model ?? schema.model,
    // The caller supplies the schema-key default (a tag :fl:prop still wins).
    'fl:prop': controlFormless.prop ?? schema.prop,
    'fl:item': controlFormless.item !== undefined ? controlFormless.item : schema.item,
    'fl:field': controlFormless.field ?? schema.field,
    'fl:component': schema.component,
  }
}

/**
 * One namespaced Field: `FormField` with the schema preset as the **lower attr
 * layer** (design.md §16.3). The tag's attrs overlay it (near wins) except the
 * locked identity keys; the resulting attrs are handed to `FormField` verbatim,
 * which owns the identity, the `provide` and the assembly tree.
 *
 * `props` may be a snapshot function, and attrs can only carry plain values, so
 * the factory evaluates it here — with the *same* identity/snapshot helpers
 * FormField uses (one implementation, no drift) — and passes the result down as
 * bare attrs, i.e. as if the author had written them.
 */
export function createFormFieldComponent(
  input: FieldFactoryInput,
): FormFieldComponent {
  const { name: fieldKey, ...schema } = input
  const preset = schemaToFieldAttrs(schema)

  return defineComponent({
    name: fieldKey ? `FormField${upperFirst(fieldKey)}` : 'FormFieldNamed',
    inheritAttrs: false,
    setup(_, { attrs, slots }) {
      const formFieldContext = inject(FORM_FIELD_KEY, null)

      return (): VNodeChild => {
        const tagAttrs: Record<string, unknown> = {}
        for (const [key, value] of Object.entries(attrs as Record<string, unknown>)) {
          if (LOCKED_TAG_KEYS.has(key)) continue
          // Whole-value replacement only accepts a valid mode; a bad tag value
          // must not clobber the schema/control mode (§8).
          if (key === 'fl:field' && value !== undefined && !isFieldMode(value)) continue
          tagAttrs[key] = value
        }

        /**
         * A merged bag (preset + tag), not the component's own attrs, and this
         * runs in the render function — so read the one channel directly instead
         * of going through `useDispatch`.
         */
        const fl = dispatch(overlayProps(preset, tagAttrs), ['fl']).fl
        const declared = resolveDeclaredBinding(fl)
        const getPropBinding = fieldPropBinding(() => declared, formFieldContext)
        const binding = resolveFieldBinding(declared, getPropBinding)
        const getValues = () =>
          binding.props.map((p) => formFieldContext?.getModelBinding(p)?.value)
        const snapshot = buildItemFl(
          fl,
          binding,
          getValues,
        )
        const controlProps = resolveProps(schema.props, snapshot)

        // preset (fl:* layer) < schema control props < tag attrs.
        return <FormField {...overlayProps(preset, controlProps, tagAttrs)} v-slots={slots} />
      }
    },
  }) as FormFieldComponent
}
