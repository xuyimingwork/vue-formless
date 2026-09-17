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
  type ResolvedControlBinding,
} from './control-binding'
import type { FormFieldContext } from './injection-keys'
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
 * One FormField's effective `getPropBinding` accessor: with its own `fl:prop` it
 * resolves the port against its own declaration, otherwise it forwards to the
 * ancestor identity layer. The identity root thus owns the `model[i] ↔ prop[i]`
 * map; a slice borrows only the location. `ancestor` carries `getPropBinding`
 * (an identity root) or omits it (a FormView boundary, i.e. "truncated").
 */
export function fieldPropBinding(
  getDeclared: () => ResolvedControlBinding,
  ancestor: FormFieldContext | null,
): (model: string) => { model: string; prop: string } | undefined {
  return (model) => {
    const declared = getDeclared()
    if (declared.props.length > 0) {
      const pair = bindingForPort(declared, model)
      return { model: pair.models[0]!, prop: pair.props[0]! }
    }
    return ancestor?.getPropBinding?.(model)
  }
}

/**
 * Effective binding. A field with its own `fl:prop` is simply its declaration
 * (prefix-aligned `model`/`prop`, unbound ports kept off); a slice without one
 * resolves each declared port against `getPropBinding` (the ancestor map). With
 * no ancestor identity, every port resolves to no location and the binding is
 * empty — the field renders but is not wired.
 */
export function resolveFieldBinding(
  declared: ResolvedControlBinding,
  getPropBinding: (model: string) => { model: string; prop: string } | undefined,
): ResolvedControlBinding {
  if (declared.props.length > 0) return declared
  return {
    models: declared.models,
    props: declared.models
      .map((m) => getPropBinding(m)?.prop)
      .filter((p): p is string => p != null),
  }
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
