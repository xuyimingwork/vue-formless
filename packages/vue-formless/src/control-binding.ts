/**
 * Field binding (design.md §7.1):
 * - `model` — v-model names on the control (identity). Default `'modelValue'`.
 * - `prop`  — location(s) from FormView root (`name`, `buyers[0].name`). Default: the schema key.
 * `prop` array pairs with `model` (prefix-aligned). Extra model ports are unbound.
 */

export type ControlVModel = string | readonly string[]
export type ControlProp = string | readonly string[]

export interface ControlBindingOverrides {
  prop?: ControlProp
}

export interface ResolvedControlBinding {
  models: string[]
  props: string[]
}

/** A location's live value + write-back (the model source, provided by FormView). */
export interface ModelBinding {
  readonly value: unknown
  update: (value: unknown) => void
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
 * v-model props + handlers for a resolved binding's bound ports. `getModelBinding`
 * is the model source accessor supplied by the nearest FormView, so the value /
 * write-back are always resolved against the *current* model — never snapshotted.
 * Ports without a location (`props` shorter than `models`) stay off.
 */
export function modelBindings(
  binding: ResolvedControlBinding,
  getModelBinding: (prop: string) => ModelBinding | undefined,
): Record<string, unknown> {
  const bag: Record<string, unknown> = {}
  for (let i = 0; i < binding.props.length; i++) {
    const port = binding.models[i]!
    const mb = getModelBinding(binding.props[i]!)
    if (!mb) continue
    bag[port] = mb.value
    bag[`onUpdate:${port}`] = (next: unknown) => mb.update(next)
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
