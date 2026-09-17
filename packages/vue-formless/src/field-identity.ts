/**
 * Field identity and Item snapshot (design.md §16.2 / §10.1).
 *
 * Used by the factory shell to resolve the field's declared binding and the
 * `ItemFl` snapshot before it can pass plain attrs down.
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
import type { ItemFl } from './field-schema'
import { omitShellKeys } from './fl-keys'

/** This field's own declaration: `fl:prop` locations + `fl:model` ports. */
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
 * declared port (design.md §7.2, 1 identity : N fields); at the root it declares.
 */
export function fieldBinding(
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
 * Snapshot for `item.props` / field `props`: extras + the field's **normalized**
 * `model` / `prop` arrays + live `getValues`. No identity **name**
 * (design.md §20.9): the kernel gives the `model[i] ↔ prop[i]` map only. A field
 * whose locations cannot be used as a host Item `prop` (several ports, a path
 * the adapter cannot encode) simply gets no binding on the host — validation
 * for it does not go through the host; the adapter decides, from `prop.length`.
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
