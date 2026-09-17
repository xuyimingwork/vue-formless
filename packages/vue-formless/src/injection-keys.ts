import type { Component, InjectionKey } from 'vue'
import type { ModelBinding } from './control-binding'

/** `FORM_VIEW_KEY`：只供嵌套 FormView 继承（读/写源 + nested 判定）。 */
export interface FormViewContext {
  /** 当前 FormView 的 `modelValue`（父快照，勿改）。 */
  model: unknown
  /** 上报字段写入；嵌套 FormView 转发到祖先 writer。 */
  update: (prop: string, value: unknown) => void
}

/**
 * FormField 唯一消费的上行上下文，由 FormView 与 FormField 身份根共同提供：
 * - `getModelBinding`（model 源）+ `FormItem` / `LayoutView`（壳资源）来自 FormView；
 * - `getPropBinding`（口 → 位置对应）来自 FormField 身份根，缺失即「截断」。
 */
export interface FormFieldContext {
  /** 位置 → 现值 + 写回（model 源，由 FormView 提供）。 */
  getModelBinding(prop: string): ModelBinding | undefined
  /** 口 → 对应关系（身份映射，由 FormField 身份根提供）。缺省 = 无外层身份。 */
  getPropBinding?(model: string): { model: string; prop: string } | undefined
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
