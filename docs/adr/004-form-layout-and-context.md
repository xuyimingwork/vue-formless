# ADR-004：FormLayout + FormContext，静态 Fields

- **状态**：Accepted（修订）
- **日期**：2026-08-12
- **修订**：同日 — 布局栅格策略改由 [ADR-007](./007-layout-adapter-and-span-priority.md) 约定；本文不再主张内置 CSS Grid。
- **来源**：动态表单架构设计推演

## 背景

字段组件需要知道：绑定哪个 model、栅格上下文、是否只读。若把数据绑进 `useFields(schema, model)` 的闭包，则每次渲染都要在 setup 里调 Hook 生成「带数据的组件」，Fields **无法**抽成跨页面静态单例。

若再由 Hook 生成包装过的 `<Form>`：

- 详情列表、表格筛选等非表单宿主场景别扭
- 宿主表单的校验等原生能力需丑陋的 ref 透传

业务仍希望模板扁平：少写层层 Row/Col 样板，但**不等于**库内自研一套栅格。

## 决策

确立职责公式（语义，非绑定某一 UI 库）：

```text
FormLayout + User.Xxx  ≈  行容器 + 列格子 + 表单项 + 控件
```

职责划分：

1. **`createFormFields(schema)`**  
   纯静态、无数据；产出命名空间组件（可放在 `models/*.ts` 单例导出）。**不**接收、**不**绑定具体布局组件库。

2. **`FormLayout`**  
   - 提供 **FormContext**（model、只读/禁用、以及布局相关的页级默认等）  
   - 作为字段的布局宿主（如何落到外部 Row/Col，见 ADR-007）

3. **`User.Xxx`**  
   - 从 FormContext 取得运行时数据与布局默认  
   - 负责字段级绑定与插槽透传；列宽等以「可被 Item 覆盖的布局语义」表达

4. **校验 / 表单宿主**  
   外层仍用业务侧已有表单容器（如 `el-form`），**不由** `createFormFields` 生成。

表单级 `readonly` / `disabled` 经 FormContext 广播。

## 备选方案

1. **闭包绑定 model（Hook 每次生成 Fields）**：实现简单，但牺牲静态复用与「配置与数据分离」。
2. **Hook 同时返回 `Form` + `Fields`**：容器与模型越界耦合，场景受限。
3. **内置 CSS Grid 消化 Row/Col**（初版推演）：DOM 更平，但偏离中后台「Row/Col 心智」，且与「内核不依赖、不重复造布局」冲突 — **已放弃，见 ADR-007**。

## 后果

- **正向**：模型单例跨页复用；多模型同 Layout 混排；全局态可广播；内核与具体组件库解耦。
- **代价**：字段需在 FormLayout（或兼容 Context）下使用；布局细节依赖 ADR-007 的适配约定。
- **关联**：命名空间字段见 ADR-003；栅格与 span 优先级见 ADR-007；运行时 JSON 见 ADR-006。
