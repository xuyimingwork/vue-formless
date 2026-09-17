# Changelog

本文件记录项目的重要变更。

格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/)。

## [Unreleased]

### Changed

- `useDispatch` 统一 + `keep` 投影（内核私有）：`useFormViewAttrs` / `useFormFieldAttrs` 两个 hook 合成 `useDispatch(attrs, channels, options?)`——一次分桶 + 每桶一个 `computed`，桶名由 `Channel` 经 `utils.ToCamel` 派生（`layout-item` → `layoutItem`，不再手写第二个桶名映射）；通道集改为导出的 `VIEW_ATTR_CHANNELS` / `FIELD_ATTR_CHANNELS`（`FIELD_SLOT_CHANNELS` 不变，`dispatch(slots, …)` 照旧）。`dispatch` 增可选 `{ prefix: 'keep' | 'drop' }`（默认 `'drop'`，现有调用点零改动）：`keep` 只改**被认领通道**的键形，保留输入拼写（前缀与监听拼写都不动），因此可被同一张通道表再认领一次（供后续父组件把某通道原样交给子组件）；`default` 两模式完全一致，`resolveKey` 不加分支。`utils.ts` 抽 `toCamel` / `ToCamel`（通道表原先内联的同一段正则改用它）。行为不变：attrs 侧的读法（`fl.value` 等）保持，slot 与 attr 仍走同一条剥皮路径
- 通道分发合一（内核私有）：`channels.ts` / `attrs.ts` / `slots.ts` 合并为 `dispatch.ts`（通道表 + 前缀派生 + `dispatch(bag, channels)` 一次分桶：每通道一桶 + `default` 裸名残差，props 与监听一视同仁，不筛值）+ `use-form-attrs.ts`（`useFormViewAttrs` / `useFormFieldAttrs` / `useFormFieldSlots`，通道集由这层持有）。`pickAttrs` / `omitAttrs` / `splitSlots` 退场；`toAttrBoolean` 归 `utils.ts`。行为不变：attrs 侧不再重复扫描（FormField 6 次 → 1 次），slot 与 attr 走同一条剥皮路径（`onItem:x` slot 名剥成 `onXx`）
- 通道路由统一（内核私有）：`channels.ts` 改通道表，监听前缀由通道名**派生**（`onItem:` 不再手写字面量，`on` + PascalCase + `:`），四个通道一视同仁（含 `fl:`）；`attrs.ts` 只留两个原语 `pickAttrs`（单通道：剥前缀的 props + 还原成 `onXxx` 的监听，同一袋）/ `omitAttrs`（多通道：裸名残差）。`splitFlAttrs` / `takePrefixed` / `splitFormlessProps` / `useFormlessProps` / `splitFallthrough` / `item-fallthrough.ts` 退场，响应式包装（`computed`）回到各调用点
- 行为：`@layout:*` / `@layout-item:*` 此前当作裸名落到 control，现按「前缀 = 目标组件」去 LayoutView / LayoutItem（`@item:*` 早已如此）。`FormView` 上 `layout-item:*` / `item:*` 都不是页通道，一并在 `default` 里透传给宿主 Form（`layout-item:*` 此前在页上被静默丢弃）
- ADR-020：`createFormFields` / `FormField` / `FormCell`（并列导出，不挂 `FormView.Cell`）；`cell: 'wrap' | 'embed' | 'wrap-embed'`；`item` 仅 boolean；`fieldKey` / `FieldSchema`
- 删除 `createFormControls`、`useFormItem`、`FormView.Item`、`resolveControlShell`、`ControlFrame`
- ADR-011：引号键段全称化——可承载任意字符串键（空白 / `.` / `[]` / 空串 `[""]`）；「键段禁止空串」收紧为「不加引号的键段禁止空串」，`prop: ''` 仍禁止
- 内核私有工具归集（`utils.ts`）：`string-case.ts` / `record-utils.ts` 合并，函数按 lodash 命名——`camelToPascal` / `CamelToPascal` → `upperFirst` / `UpperFirst`（`attrs.ts` 里的私有 `capitalize` 是同一实现，一并并入），`omit` / `omitUndefined` 原样迁入

## [0.1.1] - 2026-09-02

### Fixed

- npm 从仓库根目录形状的 `.release` 发布：拷出 `dist`，README / `docs` 相对路径与 GitHub 一致

## [0.1.0] - 2026-09-02

首次对外 API。`0.x` 期间接口仍可能调整。

### Added

- `createFormView`：一次绑定宿主 Form / Item / Row / Col；`:fl:layout` 开关栅格，`:row:column` / `:row:gutter` 设密度；嵌套 FormView 可 inherit `v-model`，`fl:form` 默认仅根层包 Form
- `createFormControls`：页级命名空间控件（`<User.Name />`）；`fl:` / `col:` / `row:` / `item:` 通道；`component` 只接输入
- `useFormItem` / `FormView.Item`：临场格与组合体多格（`item: 'self'`）
- 内部 `@vue-formless/layout`（打进 `vue-formless` dist，不单独发布）：24 格、`col:span`（`Nx` / `max` / 绝对格）、`col:place`（`auto` / `start` / `end`）、按 DOM 序补空白 Col

### Notes

- 无官方 Element / Ant 适配包；项目里自己 `createFormView({ layout, form, item })`
- `validation` / `:fl:validate` 由适配编成宿主 `rules`，内核不内置规则编译器

## [0.0.1] - 2026-08-12

### Added

- 初始化空包脚手架（Vite 构建；Vue 3 only；docs/adr 占位）

### Changed

- 包名定为 `vue-formless`（避免与 `vue-form-x` / `vue-formx` 混淆）
