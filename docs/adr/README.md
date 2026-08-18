# Architecture Decision Records

本目录记录 vue-formless 的重要设计决策。每篇 ADR 自洽，包含背景、备选方案、取舍与结论（或待定项）。

观点提炼自《动态表单架构设计推演》：在 Schema 复用与 Template 定制之间，用「页级控件表 + 命名空间控件 + FormView/Context」取得平衡，而不是全量 JSON 布局引擎。`createFormControls` 声明的是语义输入簇（身份 `rules` + `:formless` 策略，适配层合成到 Item），不是表单 schema；`component` 只接输入；布局栅格与 FormItem 消费外部 Row/Col/Item，不自研；根组件以 `v-model` 接入可写状态。

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
| [010](./010-controls-as-semantic-cluster.md) | `createFormControls` 是语义输入簇，不是表单 schema | Accepted（修订） |
| [011](./011-model-and-path.md) | `model`、`prop`（叶子）与 `path`（导航串） | Accepted |
| [012](./012-input-item-and-rule-compile.md) | 输入、Item 与校验合成 | Accepted |

## 决策关系（简图）

```text
001 关注点分层
 ├── 002 模型进 Schema，布局留 Template
 ├── 005 配置单元 = 控件（View-Model）
 │    └── 009 控件主角；createFormControls；页级声明；列表一层 FormView + :path
 │         └── 010 工厂 = 语义输入簇；身份 rules + 标签策略；不配联动 / 布局
 │              ├── 011 model = v-model 口；prop = 叶子键；path = 导航（buyers[0]）
 │              └── 012 component = 输入；Item + toRules；配置走 :formless；槽/事件 item: 给 Item
 ├── 003 模板表达 = <User.Agency /> / <User.Name />
 ├── 004 运行时粘合 = Context + 控件表（内核 UI 无关）
 │    ├── 007 外部 Row/Col 适配；字段 span > 页级默认；响应式只在页级
 │    └── 008 FormView 命名与真 v-model（tick 内合并 patch 再 emit）；公约数 = Row/Col/Item；空白 Col 占位
 └── 006 动态性默认走生成/CI，而非运行时全量 JSON
```
