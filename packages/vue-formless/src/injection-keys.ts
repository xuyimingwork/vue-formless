import type { Component, InjectionKey } from 'vue'
import type { ResolvedControlBinding } from './control-model'
import type { ItemFl } from './item-adapter'
import type { HostProps } from './overlay-props'

export interface FormContext {
  /** Current FormView `modelValue` (parent snapshot; do not mutate). */
  model: unknown
  /** Report a field write; FormView patches and emits `update:modelValue`. */
  update: (prop: string, value: unknown) => void
  /** Host Item (e.g. ElFormItem). Omit = FormCell never wraps Item. */
  Item?: Component
  /** Defaults for the host Item (static or from the cell snapshot). */
  itemProps?: HostProps<ItemFl>
  /** This FormView layer's Item switch. */
  isItemEnabled: () => boolean
  /** This FormView's `:fl:layout` switch (page). FormField wrap-embed uses it for the inner LayoutView. */
  isLayoutEnabled: () => boolean
  /** Factory `createLayoutView` result; reused for wrap-embed inner host. */
  LayoutView: Component
  /** `createFormView({ layout })` column density; inner extra rows use this, not the page `:row:column`. */
  factoryColumn: number
}

/** Binding + extras the namespaced Field provides; FormCell reads it. */
export interface FieldRuntime {
  fieldKey: string
  binding: ResolvedControlBinding
  extras: Record<string, unknown>
  /** Schema / widget `item`; tag `:fl:item` still wins via fl merge. */
  item?: boolean
}

export const FORM_VIEW_KEY: InjectionKey<FormContext | null> = Symbol(
  'vue-formless:form-view',
)

export const FIELD_RUNTIME_KEY: InjectionKey<FieldRuntime | null> = Symbol(
  'vue-formless:field-runtime',
)

export const FORM_CELL_PORT_KEY: InjectionKey<string | null> = Symbol(
  'vue-formless:form-cell-port',
)
