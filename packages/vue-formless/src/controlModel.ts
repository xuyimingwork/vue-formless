/**
 * Control `model` mapping (ADR-009):
 * - omit            → { modelValue: controlKey }
 * - string "name"   → { modelValue: "name" }
 * - object          → v-model name → form key, e.g. { title: "name" }, { start: "startTime", end: "endTime" }
 */
export type ControlModel = string | Record<string, string>

export function resolveControlModel(
  controlKey: string,
  model?: ControlModel,
): Record<string, string> {
  if (model == null) return { modelValue: controlKey }
  if (typeof model === 'string') return { modelValue: model }
  return { ...model }
}

/** First form key — used as ElFormItem `prop` when there is a single binding. */
export function primaryModelKey(mapping: Record<string, string>, controlKey: string): string {
  const keys = Object.values(mapping)
  return keys.length === 1 ? keys[0]! : controlKey
}

export function applyControlModel(
  formModel: Record<string, unknown>,
  mapping: Record<string, string>,
): Record<string, unknown> {
  const bindings: Record<string, unknown> = {}
  for (const [vModelName, modelKey] of Object.entries(mapping)) {
    bindings[vModelName] = formModel[modelKey]
    bindings[`onUpdate:${vModelName}`] = (next: unknown) => {
      formModel[modelKey] = next
    }
  }
  return bindings
}
