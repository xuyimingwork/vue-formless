import type { Component, ComputedRef, InjectionKey, MaybeRefOrGetter } from 'vue'

/**
 * `FORM_VIEW_KEY`：只供嵌套 FormView 继承（读/写源 + nested 判定）。
 *
 * 三个成员同源——都绑在这一层或祖先的 v-model 上：`value` 读整值，
 * `getIn` / `setIn` 相对同一个根按位置读写，所以调用方不必再传 value。
 *
 * 写通道只有一条（design.md §14.2）：`setIn` 一路转发到 owner 层的 writer，
 * 由它同 tick 合并后 emit。非 owner 层绝不自己 emit —— 否则多层各自从自己的
 * props 快照重建整值、互相覆盖。`value` 只是父快照，勿改。
 */
export interface FormViewContext {
  /** 本源整值（父快照，勿改）。消费方：嵌套 FormView（拼 `fl.modelValue` / 重建子路径）。 */
  readonly value: ComputedRef<unknown>
  /** 相对本源的位置读。 */
  getIn(path: string): unknown
  /** 相对本源的位置写。终点在 owner 层，emit 只在那里发生。 */
  setIn(path: string, value: unknown): void
}

/**
 * FormField 唯一消费的上行上下文，由 FormView 与 FormField 身份根共同提供：
 * - `getModelBinding`（model 源）+ `FormItem` / `LayoutView`（壳资源）来自 FormView；
 * - `getPropBinding`（口 → 位置对应）来自 FormField 身份根，缺失即「截断」。
 */
export interface FormFieldContext {
  /**
   * 
   * @param model 自身绑定名，如：['modelValue']
   */
  getProp?(model: (string | undefined)[]): string[]
  /**
   * FormView 提供，FormField 原样转发的数据更新工具
   * @param prop 路径
   */
  access(prop?: MaybeRefOrGetter<string>): { value: ComputedRef, update: (v: unknown) => void }
  /** 组装好的宿主 Item（由 FormView 提供，FormField 身份根透传）。 */
  FormItem?: Component
  /** 工厂绑定的 LayoutView（wrap-embed 内层窗口；由 FormView 提供，透传）。 */
  LayoutView?: Component
}

export const FORM_VIEW_KEY: InjectionKey<FormViewContext | null> = Symbol(
  'vue-formless:form-view',
)

export const FORM_FIELD_KEY: InjectionKey<FormFieldContext | null> = Symbol(
  'vue-formless:form-field',
)
