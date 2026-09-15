import type {
  Component,
  ComputedRef,
  InjectionKey,
  MaybeRefOrGetter,
} from 'vue'
import type { ColSpan, LayoutItemPlace, LayoutItemSpan } from './grid'

export interface LayoutItemBinding {
  span: ComputedRef<ColSpan>
  blank: ComputedRef<{
    before: number[]
    after: number[]
  }>
  ref: (raw: unknown) => void,
  place: ComputedRef<LayoutItemPlace>
  placed: ComputedRef<boolean>
  Col: Component | undefined
  disabled: ComputedRef<boolean>
}

export type RegisterLayoutItem = (
  span?: MaybeRefOrGetter<LayoutItemSpan | undefined>,
  place?: MaybeRefOrGetter<LayoutItemPlace | undefined>,
) => LayoutItemBinding

export const LAYOUT_VIEW_KEY: InjectionKey<RegisterLayoutItem | null> = Symbol(
  'vue-formless:layout-view',
)
