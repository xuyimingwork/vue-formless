import type {
  Component,
  ComputedRef,
  InjectionKey,
  MaybeRefOrGetter,
} from 'vue'
import type { ColPlace, ColSpanRaw } from './grid'

export interface LayoutItemBinding {
  span: ComputedRef<number>
  blanks: ComputedRef<number[]>
  itemRef: (raw: unknown) => void
  Col: Component | undefined
  disabled: ComputedRef<boolean>
}

export type RegisterLayoutItem = (
  span?: MaybeRefOrGetter<ColSpanRaw | undefined>,
  place?: MaybeRefOrGetter<ColPlace | undefined>,
) => LayoutItemBinding

export const LAYOUT_VIEW_KEY: InjectionKey<RegisterLayoutItem | null> = Symbol(
  'vue-formless:layout-view',
)
