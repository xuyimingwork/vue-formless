# ADR-004：FormContext + 静态 Fields（原 FormLayout）

- **状态**：Accepted（修订）
- **日期**：2026-08-12
- **修订**：
  - 2026-08-12 — 布局栅格策略改由 [ADR-007](./007-layout-adapter-and-span-priority.md) 约定；本文不再主张内置 CSS Grid。
  - 2026-08-13 — 对外根组件改称 `FormView`，数据口为 `v-model`；见 [ADR-008](./008-form-view-vmodel-and-grid-gcd.md)。本文保留 Context / 静态 Fields 职责划分；文中历史名 `FormLayout` 均指后来的 `FormView`。
  - 2026-08-17 — 控件表默认页级；跨页单例降为 opt-in。见 [ADR-009](./009-controls-as-protagonist.md)。
  - 2026-08-18 — 控件不就地改 model；写入经 FormView `v-model` emit。见 [ADR-008](./008-form-view-vmodel-and-grid-gcd.md)。
  - 2026-08-18 — 列表一层 FormView + `:path`，嵌套 `FormView v-model="users[i]"` 已否。见 [ADR-009](./009-controls-as-protagonist.md) / [ADR-011](./011-model-and-path.md)。
  - 2026-08-18 — `model` 仅为组件 v-model 口名；叶子键是 `prop`。见 [ADR-011](./011-model-and-path.md)。Item 挂在 `createFormView`。见 [ADR-012](./012-input-item-and-rule-compile.md)。
- **来源**：动态表单架构设计推演

## 背景

字段组件需要知道：绑定哪个 model、栅格上下文、是否只读。若把数据绑进 `useFields(schema, model)` 的闭包，则每次渲染都要在 setup 里调 Hook 生成「带数据的组件」，Fields **无法**抽成跨页面静态单例。

若再由 Hook 生成包装过的 `<Form>`：

- 详情列表、表格筛选等非表单宿主场景别扭
- 宿主表单的校验等原生能力需丑陋的 ref 透传

业务仍希望模板扁平：少写层层 Row/Col 样板，但**不等于**库内自研一套栅格。

## 决策

确立职责公式（语义，非绑定某一 UI 库；根组件现名见 ADR-008）：

```text
FormView + User.Xxx  ≈  （可选）行容器 + 列格子 + 表单项 + 控件
```

职责划分：

1. **`createFormControls(schema)`**  
   纯静态、无数据；产出命名空间控件。默认在页面声明；跨页单例为 opt-in（ADR-009）。每项的 `component` 是输入；`model` 只声明组件 v-model 口名，叶子键是 `prop`（ADR-011）。**不**接收、**不**绑定具体布局 / FormItem 组件库。

2. **`FormView`（原推演名 FormLayout）**  
   - 提供 **FormContext**（以 `v-model` 接入的可写状态、只读/禁用、以及布局相关的页级默认等）  
   - **可选**作为字段的布局宿主（外部 Row/Col）  
   - 适配层同时可挂 **Item** 与 `toItemProps`（投影宿主 Item props），见 ADR-008 / ADR-012

3. **`User.Xxx`**  
   - 从 FormContext 取得运行时数据与布局默认  
   - 读 `getIn(model, path, prop)`，写 `update(prop, value, path)`，由 FormView emit  
   - 负责字段级绑定；无前缀插槽透传给输入；列宽以「可被字段覆盖的布局语义」表达

4. **校验 / 表单宿主**  
   外层仍用业务侧已有表单容器（如 `el-form`），**不由** `createFormControls` 生成。单格 Item props 由适配 `toItemProps` 投影，见 ADR-012。

表单级 `readonly` / `disabled` 经 FormContext 广播。

## 备选方案

1. **闭包绑定 model（Hook 每次生成 Fields）**：实现简单，但牺牲静态复用与「配置与数据分离」。
2. **Hook 同时返回 `Form` + `Fields`**：容器与模型越界耦合，场景受限。
3. **内置 CSS Grid 消化 Row/Col**（初版推演）：DOM 更平，但偏离中后台「Row/Col 心智」，且与「内核不依赖、不重复造布局」冲突 — **已放弃，见 ADR-007**。

## 后果

- **正向**：控件表与数据分离；多套控件同页混排；全局态可广播；内核与具体组件库解耦。跨页复用以控件实现为主，整张表单例为 opt-in（ADR-009）。
- **代价**：字段需在 FormView（或兼容 Context）下使用；布局细节依赖 ADR-007 / ADR-008 的适配约定。
- **关联**：命名空间字段见 ADR-003；栅格与 span 优先级见 ADR-007；FormView / `v-model` / 适配公约数见 ADR-008；输入 / Item / 校验合成见 [ADR-012](./012-input-item-and-rule-compile.md)；运行时 JSON 见 ADR-006。
