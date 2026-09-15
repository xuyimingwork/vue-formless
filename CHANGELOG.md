# Changelog

本文件记录项目的重要变更。

格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/)。

## [Unreleased]

### Changed

- 通道路由统一（内核私有）：`channels.ts` 改通道表，监听前缀由通道名**派生**（`onItem:` 不再手写字面量，`on` + PascalCase + `:`），四个通道一视同仁（含 `fl:`）；`attrs.ts` 只留两个原语 `pickAttrs`（单通道：剥前缀的 props + 还原成 `onXxx` 的监听，同一袋）/ `omitAttrs`（多通道：裸名残差）。`splitFlAttrs` / `takePrefixed` / `splitFormlessProps` / `useFormlessProps` / `splitFallthrough` / `item-fallthrough.ts` 退场，响应式包装（`computed`）回到各调用点
- 行为：`@layout:*` / `@layout-item:*` 此前当作裸名落到 control，现按「前缀 = 目标组件」去 LayoutView / LayoutItem（`@item:*` 早已如此）。`FormView` 上 `layout-item:*` 仍被丢弃、`item:*` 仍透传给宿主 Form，均未变
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
