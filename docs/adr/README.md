# Architecture Decision Records

本目录记录 vue-formless 的重要设计决策。每篇 ADR 自洽，包含背景、备选方案、取舍与结论（或待定项）。

观点提炼自《动态表单架构设计推演》：在 Schema 复用与 Template 定制之间，用「页级域表 + 命名空间 Field + FormView/Context」取得平衡，而不是全量 JSON 布局引擎。`createFormFields` 声明的是语义输入簇（`validation` + `:fl:validate`），不是表单 schema；`component` 只接输入；可选适配 `Form` / Item（ElFormItem）与 Row/Col 用 slot 由内核填 default；栅格走 `createLayoutView` + `LayoutCell`，FormView `:fl:layout` 只做开关（不拆公开 FormLayout）；根组件以 `v-model` 接入可写状态，嵌套 FormView 可 inherit。词表与壳见 [ADR-020](./020-form-view-cell-field.md)；配置通道见 [ADR-015](./015-formless-config-groups.md)；`fl` → 宿主 props 见 [ADR-016](./016-fl-project-and-overlay.md)。

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
| [013](./013-one-control-multiple-items.md) | 一颗 Field、多格 Cell | Accepted（修订） |
| [014](./014-multi-vmodel-host-validation.md) | 多口 control 与宿主校验 | Accepted（修订） |
| [015](./015-formless-config-groups.md) | Formless 配置通道 | Accepted |
| [016](./016-fl-project-and-overlay.md) | fl → 宿主 props | Accepted |
| [017](./017-composite-item-self.md) | 组合体 control、`item: 'self'` 与自述 | Superseded（[020](./020-form-view-cell-field.md)） |
| [018](./018-col-take-rest.md) | `col:take="rest"`（实宽与行占用分离） | 待定 |
| [019](./019-layout-row-window.md) | LayoutView `row` 窗口与必展示 / 自动 | 待定 |
| [020](./020-form-view-cell-field.md) | FormView / FormCell / FormField 与 `cell` 三态 | Accepted |

## 决策关系（简图）

```text
001 关注点分层
 ├── 002 模型进 Schema，布局留 Template
 ├── 005 配置单元 = 控件（View-Model）
 │    └── 009 主角是可摆放单元；页级声明；列表一层 FormView + :fl:prop；1.0 英文 Field 见 020
 │         └── 010 工厂 = 语义输入簇（createFormFields）；validation + 标签策略；不配联动 / 布局
 │              ├── 011 model = v-model 口；prop = 从根到叶子的位置
 │              │    └── 014 多口：Form 投影；host prop 由适配编码；validate 在 FormView
 │              └── 012 component = 输入；Form / Item 适配 + slot；壳是 FormCell（020）
 │                   ├── 013 一颗 Field、N 格 Cell；默认外包 FormCell；组合体见 020 `cell`
 │                   ├── 020 FormView / FormCell / FormField；cell 三态 wrap / embed / wrap-embed；item 仅 ElFormItem
 │                   ├── 015 配置通道：无前缀宿主 / `fl:` 语义；写口仍是 v-model
 │                   └── 016 fl → 默认 props：对象或函数；近的赢；仅 Input v-model 锁死
 ├── 003 模板表达 = <User.Agency /> / <User.Name />
 ├── 004 运行时粘合 = Context + 域表（内核 UI 无关）
 │    ├── 007 外部 Row/Col 适配；字段 span > 页级默认；响应式只在页级
 │    ├── 008 FormView：v-model（嵌套可 inherit）；可选 Form（`fl:form` auto）；`:layout` 栅格（不拆公开 FormLayout）；公约数 Row/Col/Item；格子 020 改 Cell
 │    ├── 018 `take="rest"`：实宽仍是 span；落地行吃完；否 `span="rest"`
 │    └── 019 LayoutView `row` 窗口；格子 `show` 必展示 / 自动；筛选折叠
 └── 006 动态性默认走生成/CI，而非运行时全量 JSON
```
