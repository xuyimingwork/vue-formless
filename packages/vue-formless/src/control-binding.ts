/**
 * Field binding (design.md §7.1):
 * - `model` — v-model names on the control (identity). Default `'modelValue'`.
 * - `prop`  — location(s) from FormView root (`name`, `buyers[0].name`). Default: the schema key.
 * `prop` array pairs with `model` (prefix-aligned). Extra model ports are unbound.
 */

export type ControlVModel = string | readonly string[]
export type ControlProp = string | readonly string[]
