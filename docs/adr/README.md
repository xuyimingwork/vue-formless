# Architecture Decision Records

> **阅读须知（2026-09 修订）：** 本目录是**历史决策记录**，正文按写作当时的词表写成。
> **当前最终 API 以项目代码、[`docs/design.md`](../design.md) 与 [`docs/decision.md`](../decision.md) 为准**：正文与代码冲突时，按代码 / decision.md 修正。
> 每篇 ADR 顶部增加了「修订」小节，说明该篇结论的**最终状态**；未改写的历史提案 / 已否段落保留当时措辞，阅读时请对照下面的翻译表。

## 词表翻译（历史 → 当前）

| 历史词 | 当前词 / 最终状态 |
|--------|------------------|
| `FormCell`、内核格 `FormItem` | `FormField`（`FormItem` 一词只留给宿主 ElFormItem） |
| `LayoutCell` | `LayoutItem` |
| `cell:` 前缀 | `layout-item:` |
| `row:` 前缀 | `layout:` |
| `item:` 前缀 | 不变（宿主 Item 通道） |
| `:formless` 袋子 | `fl:` 前缀（逐键平铺，无袋子） |
| `fl:cell` / `fl:tree`（组树三态） | `fl:field`（值域 `'auto' \| 'embed' \| 'wrap-embed'`） |
| `fl:grid`（栅格开关） | 未落地；开关仍写 `fl:layout`（boolean） |
| `useFormCell(port)` | `fl:model`（在该 Field 已声明的口里选一个） |
| `FORM_CELL_PORT_KEY` / `bindingForPort` | 退场（并入 `FormFieldCore`） |
| `getModelBinding` / `getPropBinding` | `FORM_FIELD_KEY.access(prop)` / `.getProp(model)` |
| `overlayProps` | `mergeAttrs` |
| `toAttrBoolean` | `getAttrBoolean` |
| `createFormControls` | `createFormFields` |
| `use-form-view-model.ts` | `use-form-view-value.ts` |
| `field-identity.ts` / `fl-keys.ts` | 退场（逻辑并入 `FormFieldCore`；`SHELL_KEYS` 随 `fl-keys.ts` 删除） |
| `FormCellProps` / `FormCellTagProps` / `FormCellSlotProps` | `FormFieldProps`（前两者合并） / `FormFieldSlotProps` |

布局侧：`span` / `place` 走 `layout-item:`；ADR-019 的 `show` 与 LayoutView `row` 窗口**尚未落地**。

本目录记录 vue-formless 的重要设计决策。每篇 ADR 自洽，包含背景、备选方案、取舍与结论（或待定项）。

观点提炼自《动态表单架构设计推演》：在 Schema 复用与 Template 定制之间，用「页级域表 + 命名空间 Field + FormView/Context」取得平衡，而不是全量 JSON 布局引擎。`createFormFields` 声明的是语义输入簇（`validation` + `:fl:validate`），不是表单 schema；`component` 只接输入；可选适配 `Form` / Item（ElFormItem）与 Row/Col（宿主壳留在 FormView 工厂闭包内）；栅格走 `createLayoutView` + `LayoutItem`，FormView `fl:layout` 只做开关（不拆公开 FormLayout）；根组件以 `v-model` 接入可写状态，嵌套 FormView 可 inherit。词表与组装见 [ADR-020](./020-form-view-cell-field.md) / [ADR-021](./021-channel-prefix-and-form-item.md)（两篇的词表已被 `design.md` 收束）；配置通道见 [ADR-015](./015-formless-config-groups.md)；`fl` → 宿主 props 见 [ADR-016](./016-fl-project-and-overlay.md)。

| ADR | 标题 | 状态 |
|-----|------|------|
| [001](./001-three-layer-concerns.md) | 三层关注点隔离（模型 / 布局 / 流程） | Accepted（修订） |
| [002](./002-schema-vs-template.md) | Schema 只管模型，布局权力交还 Template | Accepted |
| [003](./003-namespaced-field-components.md) | 命名空间字段组件（`<User.Name />`） | Accepted（修订） |
| [004](./004-form-layout-and-context.md) | FormContext + 静态 Fields（原 FormLayout） | Accepted（修订） |
| [005](./005-view-model-as-unit.md) | 配置最小单元是 View-Model 控件 | Accepted（修订） |
| [006](./006-build-time-over-runtime-json.md) | 编译时低代码优先于运行时 JSON 下发 | Accepted |
| [007](./007-layout-adapter-and-span-priority.md) | 外部栅格适配、span 优先级与 Layout 级响应式 | Accepted（修订） |
| [008](./008-form-view-vmodel-and-grid-gcd.md) | FormView、`v-model` 与栅格适配公约数 | Accepted（修订） |
| [009](./009-controls-as-protagonist.md) | 控件主角、页级控件表与列表上下文 | Accepted（修订） |
| [010](./010-controls-as-semantic-cluster.md) | `createFormFields` 是语义输入簇，不是表单 schema | Accepted（修订） |
| [011](./011-model-and-path.md) | `model` 与 `prop`（位置） | Accepted（修订） |
| [012](./012-input-item-and-rule-compile.md) | 输入、Item 与校验合成 | Accepted（修订） |
| [013](./013-one-control-multiple-items.md) | 一颗 Field、多格（原 Cell） | Accepted（修订） |
| [014](./014-multi-vmodel-host-validation.md) | 多口 control 与宿主校验 | Accepted（修订） |
| [015](./015-formless-config-groups.md) | Formless 配置通道 | Accepted（修订） |
| [016](./016-fl-project-and-overlay.md) | fl → 宿主 props | Accepted（修订） |
| [017](./017-composite-item-self.md) | 组合体 control、`item: 'self'` 与自述 | Superseded（[020](./020-form-view-cell-field.md)） |
| [018](./018-col-take-rest.md) | 不实现 `cell:take`（行内占用保持单一 `place` 轴） | Rejected（2026-09-15） |
| [019](./019-layout-row-window.md) | LayoutView `row` 窗口与必展示 / 自动 | 待定（通道改 `layout:` 见 021；**未落地**） |
| [020](./020-form-view-cell-field.md) | FormView / FormCell / FormField 与 `cell` 三态 | Accepted（修订；词表被 `design.md` 收束为 FormField / LayoutItem / `fl:field`） |
| [021](./021-channel-prefix-and-form-item.md) | 通道前缀 = 目标组件（FormCell → FormItem） | Accepted（修订；最终通道为 `fl` / `layout-item` / `layout` / `item`） |

## 决策关系（简图）

> 图中术语为**历史词表**；`FormCell` / 内核 `FormItem` 现名 `FormField`，`LayoutCell` 现名 `LayoutItem`，`cell:` → `layout-item:`、`row:` → `layout:`，`fl:cell` / `fl:tree` → `fl:field`（详见上表）。

```text
001 关注点分层
 ├── 002 模型进 Schema，布局留 Template
 ├── 005 配置单元 = 控件（View-Model）
 │    └── 009 主角是可摆放单元；页级声明；列表一层 FormView + :fl:prop；1.0 英文 Field 见 020
 │         └── 010 工厂 = 语义输入簇（createFormFields）；validation + 标签策略；不配联动 / 布局
 │              ├── 011 model = v-model 口；prop = 从根到叶子的位置
 │              │    └── 014 多口：Form 投影；host prop 由适配编码；validate 在 FormView
 │              └── 012 component = 输入；Form / Item 适配 + slot；壳是 FormField（020）
 │                   ├── 013 一颗 Field、N 格；默认包 FormField（LayoutItem + 可选宿主 Item）；组合体见 020
 │                   ├── 020 FormView / FormField；组装位置 `fl:field` = wrap / embed / wrap-embed；item 仅宿主 ElFormItem
 │                   ├── 021 通道前缀 = 目标组件（fl: / layout: / layout-item: / item: / 裸名=主宿主；010 时期为 cell: / fl:tree，见 021 修订）
 │                   ├── 015 配置通道：无前缀宿主 / `fl:` 语义；写口仍是 v-model（前缀与词表见 021）
 │                   └── 016 fl → 默认 props：对象或函数；近的赢；仅 control 的 v-model 绑定锁死
 ├── 003 模板表达 = <User.Agency /> / <User.Name />
 ├── 004 运行时粘合 = Context + 域表（内核 UI 无关）
 │    ├── 007 外部 Row/Col 适配；字段 span > 页级默认；响应式只在页级
 │    ├── 008 FormView：v-model（嵌套可 inherit）；可选 Form（`fl:form` auto）；`fl:layout` 栅格开关（不拆公开 FormLayout）；公约数 Row/Col/Item
 │    ├── 018 已否 `take="rest"`：行内占用保持单一 `place` 轴（实宽仍是 span；否 `span="rest"`）
 │    └── 019 LayoutView `row` 窗口；格子 `show` 必展示 / 自动；筛选折叠（未落地）
 └── 006 动态性默认走生成/CI，而非运行时全量 JSON
```
