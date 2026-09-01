/**
 * Control binding (ADR-011):
 * - `model` — v-model names on the widget (identity). Default `'modelValue'`.
 * - `prop`  — location(s) from FormView root (`name`, `buyers[0].name`). Default: control key.
 * `prop` array pairs with `model` (prefix-aligned). Extra model ports are unbound.
 */
import { formItemProp, getIn } from './model-path'

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
  controlKey: string,
  options: { model?: ControlVModel; prop?: ControlProp } = {},
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

  if (props.length > models.length) {
    throw new Error(
      `createFormControls: prop cannot be longer than model (control "${controlKey}": model has ${models.length}, prop has ${props.length})`,
    )
  }
  if (props.some((p) => p === '')) {
    throw new Error(`[vue-formless] prop cannot be an empty string (control "${controlKey}")`)
  }

  return { models, props }
}

/**
 * Optional Element-style encoding: one location → dotted path; several →
 * control key. Kernel does not put this on Item `fl` — the adapter Item
 * calls this (or encodes another way) when mapping to host `prop`.
 */
export function resolveFormItemProp(
  binding: ResolvedControlBinding,
  controlKey: string,
): string {
  if (binding.props.length === 1) {
    return formItemProp(binding.props[0]!)
  }
  return controlKey
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
  return { models: [port], props: [prop] }
}

export function applyControlBinding(
  formModel: unknown,
  binding: ResolvedControlBinding,
  update: (prop: string, value: unknown) => void,
): Record<string, unknown> {
  const bindings: Record<string, unknown> = {}
  for (let i = 0; i < binding.props.length; i++) {
    const vModelName = binding.models[i]!
    const prop = binding.props[i]!
    bindings[vModelName] = getIn(formModel, prop)
    bindings[`onUpdate:${vModelName}`] = (next: unknown) => {
      update(prop, next)
    }
  }
  return bindings
}
