# Changelog

本文件记录项目的重要变更。

格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/)。

## [Unreleased]

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
