/**
 * Cell identity and Item snapshot (ADR-011 §6 / ADR-014 §3 / ADR-020 §16.2).
 *
 * Shared by `FormField` (identity root + assembly) and the factory shell, which
 * needs the same snapshot to resolve `FieldSchema.props` before it can pass
 * plain attrs down — one implementation, so the two can never drift.
 */
import {
  bindingForPort,
  resolveControlBinding,
  toBindingList,
  type ControlProp,
  type ControlVModel,
  type FieldLayer,
  type ResolvedControlBinding,
} from './control-binding'
import type { FormContext } from './injection-keys'
import type { ItemFl } from './field-schema'
import { omitShellKeys } from './fl-keys'
import { overlayProps } from './props-overlay'

/** This cell's merged `fl` bag: page < preset layer (factory/schema) < tag. */
export function mergedFieldFl(
  ctx: FormContext,
  formlessFl: Record<string, unknown>,
): Record<string, unknown> {
  return overlayProps({ item: ctx.item }, formlessFl)
}

/** This cell's own declaration: `fl:prop` locations + `fl:model` ports. */
export function resolveDeclaredBinding(
  fl: Record<string, unknown>,
): ResolvedControlBinding {
  const prop = fl.prop
  if (prop === '') {
    throw new Error('[vue-formless] fl:prop cannot be an empty string')
  }
  const models =
    fl.model === undefined ? undefined : toBindingList(fl.model as ControlVModel)
  if (prop === undefined) {
    return { models: models ?? ['modelValue'], props: [] }
  }
  const name =
    typeof prop === 'string'
      ? prop
      : Array.isArray(prop) && prop[0]
        ? String(prop[0])
        : 'field'
  return resolveControlBinding(name, {
    model: models,
    prop: prop as ControlProp,
  })
}

/**
 * Effective binding. Inside an ancestor identity `fl:model` **selects** one
 * declared port (ADR-013 1 identity : N cells); at the root it declares.
 */
export function cellBinding(
  fl: Record<string, unknown>,
  declared: ResolvedControlBinding,
  ancestor: FieldLayer | null,
): ResolvedControlBinding {
  if (ancestor == null) return declared
  const port = fl.model
  return typeof port === 'string' && port !== ''
    ? bindingForPort(ancestor, port)
    : ancestor
}

/**
 * Snapshot for `item.props` / field `props`: extras + the cell's **normalized**
 * `model` / `prop` arrays + live `getValues`. No identity **name** (ADR-011 §6
 * revised): the kernel gives the `model[i] ↔ prop[i]` map only. A cell whose
 * locations cannot be used as a host Item `prop` (several ports, a path the
 * adapter cannot encode) simply gets no binding on the host — validation for it
 * does not go through the host; the adapter decides, from `prop.length`.
 */
export function buildItemFl(
  fl: Record<string, unknown>,
  binding: ResolvedControlBinding,
  getValues: () => unknown[],
): ItemFl {
  return {
    ...omitShellKeys(fl),
    model: binding.models,
    prop: binding.props,
    getValues,
  }
}
