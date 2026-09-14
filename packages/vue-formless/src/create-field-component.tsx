import { defineComponent, inject, type VNodeChild } from 'vue'
import { FormField, type FormFieldComponent } from './FormField'
import { createFieldLayer } from './control-binding'
import { useFormContext } from './context'
import {
  buildItemFl,
  cellBinding,
  mergedFieldFl,
  resolveDeclaredBinding,
} from './field-identity'
import { FORM_FIELD_KEY } from './injection-keys'
import { isFieldMode } from './field-mode'
import { readWidgetFormless } from './widget-config'
import { schemaExtras } from './fl-keys'
import type { FieldSchema, ItemFl } from './field-schema'
import { overlayProps, resolveProps, type HostProps } from './props-overlay'
import { splitFlAttrs } from './attrs'
import { camelToPascal } from './string-case'

export interface CreateFormFieldOptions {
  /** Defaults for every field in this cluster (static or from the cell snapshot). */
  props?: HostProps<ItemFl>
}

/**
 * Constraint for factories only. `component` stays `unknown` so object
 * literals keep `typeof ElInput` instead of widening to Vue's `Component`.
 */
export type FieldSchemaInput = Omit<FieldSchema, 'component'> & {
  component?: unknown
}

/** Keys the factory owns; the tag must not restate them (identity is locked, ADR-021 §7). */
const LOCKED_TAG_KEYS = new Set(['fl:model', 'fl:component'])

/**
 * `FieldSchema` → the equivalent layer of `fl:*` tag attrs: every schema key
 * has an `fl:` twin (`component` / `props` / `prop` / `model` / `item` / `field`)
 * and extras become `fl:label`… The schema is therefore just a preset attr
 * layer under the author's tag — nothing here is FormField-private.
 */
function schemaToFieldAttrs(
  schemaKey: string,
  schema: FieldSchemaInput,
): Record<string, unknown> {
  const widgetFormless = readWidgetFormless(schema.component)
  const attrs: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(
    schemaExtras(schema as Record<string, unknown>),
  )) {
    attrs[`fl:${key}`] = value
  }
  return {
    ...attrs,
    'fl:model': widgetFormless.model ?? schema.model,
    // Location default = the schema key (a tag :fl:prop still wins).
    'fl:prop': widgetFormless.prop ?? schema.prop ?? schemaKey,
    'fl:item': widgetFormless.item !== undefined ? widgetFormless.item : schema.item,
    'fl:field': widgetFormless.field ?? schema.field,
    'fl:component': schema.component,
  }
}

/**
 * One namespaced Field: `FormField` with the schema preset as the **lower attr
 * layer** (ADR-020 §16.3). The tag's attrs overlay it (near wins) except the
 * locked identity keys; the resulting attrs are handed to `FormField` verbatim,
 * which owns the identity, the `provide` and the assembly tree.
 *
 * `props` may be a snapshot function, and attrs can only carry plain values, so
 * the factory evaluates it here — with the *same* identity/snapshot helpers
 * FormField uses (one implementation, no drift) — and passes the result down as
 * bare attrs, i.e. as if the author had written them.
 */
export function createFormFieldComponent(
  schemaKey: string,
  schema: FieldSchemaInput,
  cluster?: CreateFormFieldOptions,
): FormFieldComponent {
  const preset = schemaToFieldAttrs(schemaKey, schema)

  return defineComponent({
    name: `Field_${camelToPascal(schemaKey)}`,
    inheritAttrs: false,
    setup(_, { attrs, slots }) {
      const ctx = useFormContext()
      const ancestor = inject(FORM_FIELD_KEY, null)

      return (): VNodeChild => {
        const tagAttrs: Record<string, unknown> = {}
        for (const [key, value] of Object.entries(attrs as Record<string, unknown>)) {
          if (LOCKED_TAG_KEYS.has(key)) continue
          // Whole-value replacement only accepts a valid mode; a bad tag value
          // must not clobber the schema/widget mode (§8).
          if (key === 'fl:field' && value !== undefined && !isFieldMode(value)) continue
          tagAttrs[key] = value
        }

        const { fl } = splitFlAttrs(overlayProps(preset, tagAttrs))
        const declared = resolveDeclaredBinding(fl)
        const binding = cellBinding(fl, declared, ancestor)
        const layer = createFieldLayer(
          () => binding,
          () => ctx.model,
          ctx.update,
        )
        const snapshot = buildItemFl(
          mergedFieldFl(ctx, fl),
          binding,
          layer.getValues,
        )
        const inputProps = overlayProps(
          resolveProps(cluster?.props, snapshot),
          resolveProps(schema.props, snapshot),
        )

        // preset (fl:* layer) < schema/cluster widget props < tag attrs.
        return <FormField {...overlayProps(preset, inputProps, tagAttrs)} v-slots={slots} />
      }
    },
  }) as FormFieldComponent
}
