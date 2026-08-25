/**
 * Control binding (ADR-011):
 * - `model` — v-model names on the widget (identity). Default `'modelValue'`.
 * - `prop`  — leaf key(s) on the node reached by `path`. Default: control key.
 * - `path`  — optional navigation string (`buyers[0]`, `[2]`). Scalar only.
 * `prop` array pairs with `model` (prefix-aligned). Extra model ports are unbound.
 */
import { formItemProp, getIn } from './model-path'

export type ControlVModel = string | string[]
export type ControlProp = string | string[]
/** Navigation path: scalar string with optional `[index]` segments. Not an array type. */
export type ControlNavPath = string

export interface ControlBindingOverrides {
  prop?: ControlProp
  path?: ControlNavPath
}

export interface ResolvedControlBinding {
  models: string[]
  props: string[]
  path?: string
}

export function toBindingList(value: ControlVModel | ControlProp): string[] {
  return Array.isArray(value) ? [...value] : [value]
}

export function resolveControlBinding(
  controlKey: string,
  options: { model?: ControlVModel; prop?: ControlProp; path?: ControlNavPath } = {},
  overrides: ControlBindingOverrides = {},
): ResolvedControlBinding {
  if (overrides.prop === '') {
    throw new Error(`[vue-formless] fl:prop cannot be an empty string (control "${controlKey}")`)
  }
  if (options.prop === '') {
    throw new Error(`[vue-formless] prop cannot be an empty string (control "${controlKey}")`)
  }

  const models = toBindingList(options.model ?? 'modelValue')
  const props = toBindingList(
    overrides.prop !== undefined ? overrides.prop : (options.prop ?? controlKey),
  )
  const path = overrides.path !== undefined ? overrides.path : options.path

  if (props.length > models.length) {
    throw new Error(
      `createFormControls: prop cannot be longer than model (control "${controlKey}": model has ${models.length}, prop has ${props.length})`,
    )
  }

  return { models, props, path }
}

/**
 * Optional Element-style encoding: one leaf → dotted path; several leaves →
 * control key. Kernel does not put this on Item `fl` — the adapter Item
 * calls this (or encodes another way) when mapping to host `prop`.
 */
export function resolveFormItemProp(
  binding: ResolvedControlBinding,
  controlKey: string,
): string {
  if (binding.props.length === 1) {
    return formItemProp(binding.path, binding.props[0]!)
  }
  return formItemProp(binding.path, controlKey)
}

/** Slice a multi-port binding to one v-model port (ADR-013 `useFormItem('start')`). */
export function bindingForPort(
  binding: ResolvedControlBinding,
  port: string,
): ResolvedControlBinding {
  const index = binding.models.indexOf(port)
  if (index === -1) {
    throw new Error(
      `[vue-formless] useFormItem("${port}"): not a v-model port of this control`,
    )
  }
  const prop = binding.props[index]
  if (prop === undefined) {
    throw new Error(
      `[vue-formless] useFormItem("${port}"): port is not bound to a prop`,
    )
  }
  return { models: [port], props: [prop], path: binding.path }
}

export function applyControlBinding(
  formModel: unknown,
  binding: ResolvedControlBinding,
  update: (prop: string, value: unknown, path?: string) => void,
): Record<string, unknown> {
  const bindings: Record<string, unknown> = {}
  for (let i = 0; i < binding.props.length; i++) {
    const vModelName = binding.models[i]!
    const prop = binding.props[i]!
    bindings[vModelName] = getIn(formModel, binding.path, prop)
    bindings[`onUpdate:${vModelName}`] = (next: unknown) => {
      update(prop, next, binding.path)
    }
  }
  return bindings
}
