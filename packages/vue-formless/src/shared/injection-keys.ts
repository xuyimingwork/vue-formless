import type { Component, ComputedRef, InjectionKey, MaybeRefOrGetter } from 'vue'
import type { FormItemComponent } from '../assembly/create-form-item'

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
  getProp?(model: (string | undefined)[]): (string | undefined)[]
  /**
   * FormView 提供，FormField 原样转发的数据更新工具
   * @param prop 路径
   */
  access(prop?: MaybeRefOrGetter<string>): { value: ComputedRef, update: (v: unknown) => void }
  /** 组装好的宿主 Item（由 FormView 提供，FormField 身份根透传）。 */
  FormItem?: FormItemComponent
  /** 工厂绑定的 LayoutView（wrap-embed 内层窗口；由 FormView 提供，透传）。 */
  LayoutView?: Component
  /**
   * 最近 FormView 下行的**页级 `fl`**（惰性），且**只装 FormField 会读的那部分**。
   * 今天只有一个键 `item`：`fl:layout` / `fl:form` 是 FormView 自己的开关，它已自行消费，
   * 不下行，所以页桶里其余键对 FormField 没有任何意义。
   *
   * 页 `fl:item` 与本格 `fl.item` 的合并因此落在 FormFieldCore 一处（design.md §9 / §16.3），
   * 格上的 `item` 才是归一化后的布尔。
   *
   * 它不是本格物化值：随 `access` / 壳资源一路透传，且只有 FormView 回答——身份根
   * 重写 `getProp` 时不动它，所以组合体内层格拿到的是同一个页默认。
   *
   * 值是**原始 attrs 形态**（裸 `fl:item` 是 `''`），由 FormFieldCore 与格值一起交给
   * `getAttrBoolean` 归一。类型按项目既有契约写成 `boolean`（同 `FormViewProps['fl:item']` /
   * `CreateFormFieldOptions.item` / `FormFieldProps['fl:item']`）；全可选的形状也让 provider 侧无需窄化。
   */
  fl?: MaybeRefOrGetter<{ item?: boolean }>
}

export const FORM_VIEW_KEY: InjectionKey<FormViewContext | null> = Symbol(
  'vue-formless:form-view',
)

export const FORM_FIELD_KEY: InjectionKey<FormFieldContext | null> = Symbol(
  'vue-formless:form-field',
)
