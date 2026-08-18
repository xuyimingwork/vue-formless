/**
 * Control binding (ADR-011):
 * - `model` — v-model names on the widget (identity). Default `'modelValue'`.
 * - `path`  — keys on the current FormView object. Default: control key.
 * Path is a prefix of model (index-aligned). Extra model ports are unbound.
 */
export type ControlVModel = string | string[]
export type ControlPath = string | string[]

export interface ResolvedControlBinding {
  models: string[]
  paths: string[]
}

export function toBindingList(value: ControlVModel | ControlPath): string[] {
  return Array.isArray(value) ? [...value] : [value]
}

export function resolveControlBinding(
  controlKey: string,
  options: { model?: ControlVModel; path?: ControlPath } = {},
  pathOverride?: ControlPath,
): ResolvedControlBinding {
  const models = toBindingList(options.model ?? 'modelValue')
  const paths = toBindingList(
    pathOverride !== undefined ? pathOverride : (options.path ?? controlKey),
  )

  if (paths.length > models.length) {
    throw new Error(
      `createFormControls: path cannot be longer than model (control "${controlKey}": model has ${models.length}, path has ${paths.length})`,
    )
  }

  return { models, paths }
}

/** First form key — used as ElFormItem `prop` when there is a single binding. */
export function primaryPath(binding: ResolvedControlBinding, controlKey: string): string {
  return binding.paths.length === 1 ? binding.paths[0]! : controlKey
}

export function applyControlBinding(
  formModel: Record<string, unknown>,
  binding: ResolvedControlBinding,
): Record<string, unknown> {
  const bindings: Record<string, unknown> = {}
  for (let i = 0; i < binding.paths.length; i++) {
    const vModelName = binding.models[i]!
    const modelKey = binding.paths[i]!
    bindings[vModelName] = formModel[modelKey]
    bindings[`onUpdate:${vModelName}`] = (next: unknown) => {
      formModel[modelKey] = next
    }
  }
  return bindings
}
