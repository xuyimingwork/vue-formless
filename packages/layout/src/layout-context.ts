import type { Component, ComputedRef, InjectionKey } from 'vue'
import type { LayoutOccupancy } from './occupancy'

/** `Component` is a union; JSX needs a constructable host. */
export type JsxHost = new () => { $props: Record<string, unknown> }

export interface LayoutContext {
  disabled: ComputedRef<boolean>
  column: number
  gutter: number | undefined
  Col: Component | undefined
  occupancy: LayoutOccupancy
}

export const layoutContextKey: InjectionKey<LayoutContext> = Symbol(
  'vue-formless.layoutContext',
)
