import type {
  Component,
  ComputedRef,
  InjectionKey,
  MaybeRefOrGetter,
} from 'vue'
import type { ColPlace, ColSpanSpec } from './density'

/** `Component` is a union; JSX needs a constructable host. */
export type JsxHost = new () => { $props: Record<string, unknown> }

export interface LayoutCellSlot {
  span: ComputedRef<number>
  blanks: ComputedRef<number[]>
  itemRef: (raw: unknown) => void
  Col: Component | undefined
  disabled: ComputedRef<boolean>
}

export type LayoutAttach = (
  span?: MaybeRefOrGetter<ColSpanSpec | undefined>,
  place?: MaybeRefOrGetter<ColPlace | undefined>,
) => LayoutCellSlot

export const layoutItemKey: InjectionKey<LayoutAttach | null> = Symbol(
  'vue-formless.layoutItem',
)
