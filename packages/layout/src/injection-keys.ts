import type {
  Component,
  ComputedRef,
  InjectionKey,
  MaybeRefOrGetter,
} from 'vue'
import type { ColPlace, ColSpanSpec } from './grid'

export interface LayoutItemBinding {
  span: ComputedRef<number>
  blanks: ComputedRef<number[]>
  itemRef: (raw: unknown) => void
  Col: Component | undefined
  disabled: ComputedRef<boolean>
}

export type RegisterLayoutItem = (
  span?: MaybeRefOrGetter<ColSpanSpec | undefined>,
  place?: MaybeRefOrGetter<ColPlace | undefined>,
) => LayoutItemBinding

export const LAYOUT_VIEW_KEY: InjectionKey<RegisterLayoutItem | null> = Symbol(
  'vue-formless:layout-view',
)
