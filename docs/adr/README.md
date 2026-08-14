# Architecture Decision Records

本目录记录 vue-formless 的重要设计决策。每篇 ADR 自洽，包含背景、备选方案、取舍与结论（或待定项）。

观点提炼自《动态表单架构设计推演》：在 Schema 复用与 Template 定制之间，用「静态 View-Model + 命名空间字段 + FormView/Context」取得平衡，而不是全量 JSON 布局引擎。布局栅格消费外部 Row/Col（或等价物），不自研；根组件以 `v-model` 接入可写状态。

| ADR | 标题 | 状态 |
|-----|------|------|
| [001](./001-three-layer-concerns.md) | 三层关注点隔离（模型 / 布局 / 流程） | Accepted |
| [002](./002-schema-vs-template.md) | Schema 只管模型，布局权力交还 Template | Accepted |
| [003](./003-namespaced-field-components.md) | 命名空间字段组件（`<User.Name />`） | Accepted |
| [004](./004-form-layout-and-context.md) | FormContext + 静态 Fields（原 FormLayout） | Accepted（修订） |
| [005](./005-view-model-as-unit.md) | 配置最小单元是 View-Model 控件 | Accepted |
| [006](./006-build-time-over-runtime-json.md) | 编译时低代码优先于运行时 JSON 下发 | Accepted |
| [007](./007-layout-adapter-and-span-priority.md) | 外部栅格适配、span 优先级与 Layout 级响应式 | Accepted（修订） |
| [008](./008-form-view-vmodel-and-grid-gcd.md) | FormView、`v-model` 与栅格适配公约数 | Accepted |

## 决策关系（简图）

```text
001 关注点分层
 ├── 002 模型进 Schema，布局留 Template
 ├── 005 配置单元 = 控件（View-Model）
 ├── 003 模板表达 = <User.Name />
 ├── 004 运行时粘合 = Context + 静态 Fields（内核 UI 无关）
 │    ├── 007 外部 Row/Col 适配；Item > 页级默认；响应式只在页级
 │    └── 008 FormView 命名与 v-model；适配公约数 = span；空白 Col 占位
 └── 006 动态性默认走生成/CI，而非运行时全量 JSON
```
