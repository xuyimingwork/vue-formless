/**
 * Field binding (design.md §7.1):
 * - `model` — v-model names on the control (identity). Default `'modelValue'`.
 * - `prop`  — location(s) from FormView root (`name`, `buyers[0].name`). Default: the schema key.
 * `prop` array pairs with `model` (prefix-aligned). Extra model ports are unbound.
 */
import { getIn } from './path-access'

export type ControlVModel = string | readonly string[]
export type ControlProp = string | readonly string[]

export interface ControlBindingOverrides {
  prop?: ControlProp
}

export interface ResolvedControlBinding {
  models: string[]
  props: string[]
}

export function toBindingList(value: ControlVModel | ControlProp): string[] {
  return typeof value === 'string' ? [value] : [...value]
}

export function resolveControlBinding(
  key: string,
  options: { model?: ControlVModel; prop?: ControlProp } = {},
  overrides: ControlBindingOverrides = {},
): ResolvedControlBinding {
  if (overrides.prop === '') {
    throw new Error(`[vue-formless] fl:prop cannot be an empty string (field "${key}")`)
  }
  if (options.prop === '') {
    throw new Error(`[vue-formless] prop cannot be an empty string (field "${key}")`)
  }

  const models = toBindingList(options.model ?? 'modelValue')
  const props = toBindingList(
    overrides.prop !== undefined ? overrides.prop : (options.prop ?? key),
  )

  if (props.length > models.length) {
    throw new Error(
      `createFormFields: prop cannot be longer than model (field "${key}": model has ${models.length}, prop has ${props.length})`,
    )
  }
  if (props.some((p) => p === '')) {
    throw new Error(`[vue-formless] prop cannot be an empty string (field "${key}")`)
  }

  return { models, props }
}

/** Slice a multi-port binding to one v-model port (design.md §7.2 / §14.3, `fl:model="start"`). */
export function bindingForPort(
  binding: ResolvedControlBinding,
  port: string,
): ResolvedControlBinding {
  const index = binding.models.indexOf(port)
  if (index === -1) {
    throw new Error(
      `[vue-formless] fl:model="${port}": not a v-model port of this field`,
    )
  }
  const prop = binding.props[index]
  if (prop === undefined) {
    throw new Error(
      `[vue-formless] fl:model="${port}": port is not bound to a prop`,
    )
  }
  return { models: [port], props: [prop] }
}

/**
 * Identity layer value (design.md §16.2): the effective
 * binding **plus** the port-keyed accessor built on it. The root `FormField`
 * provides it and closes over the page scope; consumers ask by **port**, so
 * locations are resolved inside and page paths never travel down.
 */
export interface FieldLayer extends ResolvedControlBinding {
  /** Live values at this layer's locations, in binding order (design.md §14.1). */
  getValues(): unknown[]
  /** Write one declared v-model port by name. */
  setValue(port: string, value: unknown): void
}

/**
 * Build a layer over a live binding + the scope it reads/writes. Everything is
 * read lazily: `fl:prop` may be restated on the tag and a nested FormView may
 * swap the model source, so neither the location nor the model is snapshotted.
 */
export function createFieldLayer(
  getBinding: () => ResolvedControlBinding,
  getModel: () => unknown,
  update: (prop: string, value: unknown) => void,
): FieldLayer {
  return {
    get models() {
      return getBinding().models
    },
    get props() {
      return getBinding().props
    },
    getValues: () => getBinding().props.map((p) => getIn(getModel(), p)),
    setValue: (port, value) => {
      // Resolve port → location here: the caller never handles paths.
      update(bindingForPort(getBinding(), port).props[0]!, value)
    },
  }
}

/** v-model props + handlers for the layer's bound ports (unbound ports stay off). */
export function modelBindings(layer: FieldLayer): Record<string, unknown> {
  const values = layer.getValues()
  const bag: Record<string, unknown> = {}
  for (let i = 0; i < layer.props.length; i++) {
    const port = layer.models[i]!
    bag[port] = values[i]
    bag[`onUpdate:${port}`] = (next: unknown) => layer.setValue(port, next)
  }
  return bag
}

/** Page attrs must not override factory v-model ports on the control. */
export function stripPortBindings(
  attrs: Record<string, unknown>,
  models: string[],
): Record<string, unknown> {
  const skip = new Set<string>()
  for (const name of models) {
    skip.add(name)
    skip.add(`onUpdate:${name}`)
  }
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(attrs)) {
    if (!skip.has(key)) out[key] = value
  }
  return out
}
