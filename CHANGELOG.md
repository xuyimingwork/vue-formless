# Changelog

本文件记录项目的重要变更。

格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/)。

## [Unreleased]

### Changed

- **`createFormView` 的 `form.props` 收敛为静态对象**（破坏性；0.x）：FormView 的写口 `modelValue` 不再当作「声明 prop」隐藏，而是按 no-prefix 规则作为裸名一并落到宿主 Form，因此 `form.props` 不再有 snapshot 可投影、**不再接受函数**，`FormFl` 类型删除。宿主口名与 `modelValue` 不同（如 ElForm 的 `model`）时，由适配层包一层 `MyForm`（声明 `modelValue`、转发给宿主，并把宿主实例方法透出给 FormView 的 ref 代理）——README / playground / 测试改用该写法。FormView 仍读取 `onUpdate:modelValue` 推进写口；该监听（以及其它监听）不再从宿主 props 剥掉，一并落到宿主 Form
- **`createFormView` 的 `layout.props` 收敛为静态对象**（破坏性；0.x）：删除函数形态与 `LayoutFl` 快照类型，`layout.props` 只能是 `Record<string, unknown>`，作为 LayoutView 的默认 props；标签 `:layout:*` 仍 overlay 其上，`disabled` 仍由内核固定为 `!fl:layout`。`layout.props` / `form.props` 与标签 attrs 的合并改为就地浅展开（`mergeAttrs` / `resolveProps` 待重构）
- **`fl:form` 的 `'auto'` 语义修正**：改由 FormView 的 `form` computed 独立解析——`'auto'` / 缺省 → 根层包 Form、嵌套不包，显式布尔覆盖，裸 `fl:form`（`''`）算 `true`。不再借道 `getAttrBoolean`（它没有 `'auto'` 概念，会把 `'auto'` 当 `true`，导致嵌套层被强制包一层宿主 Form）
- **`getAttrBoolean` 文档与实现对齐**：字符串 `'false'` 按 Vue 的 attr 习惯算 `true`（内核不对字符串布尔做特殊处理），JSDoc 此前写作 `'false'` → `false` 与实现不符，已改正
- **`src` 目录分层重组**（纯内部重构）：`packages/vue-formless/src` 按关注点分目录——`hooks/`（`use-form-view-value.ts` / `use-dispatch.ts`）、`path/`（`path-parse.ts` / `path-access.ts`）、`assembly/`（`create-form-field.tsx` / `create-form-view.tsx` / `create-form-item.tsx` / `create-form-fields.ts`）、`shared/`（`field-schema.ts` / `injection-keys.ts` / `props-overlay.ts` / `utils.ts`）；`index.ts` 留在根层。`control-props.ts` 并入 `shared/field-schema.ts`（两者同为纯类型，且 `ControlTagProps` / `LockedVModelKeys` / `ComponentPublicProps` 正由 `FieldSchema` / `ControlVModel` 派生），`control-props.test.ts` 用例并入 `field-schema.test.ts`，测试随文件移动。公开导出与运行时行为不变
- **`fl:item` 归一上移到 `FormFieldCore`**（`FormFieldFormless.item` 定型为布尔）：此前页级 `fl:item` 默认由 FormView 提供的 `FormItem` 包装层合并（`getAttrBoolean(true, 页 fl:item, 格 fl.item)`），于是同一个 `fl.item` 在**两处各归一一次**——`item.props` 看到布尔，control 的 `props`（`FieldSchema.props`）看到的却是原样的 `fl.item`（裸 `fl:item` → `''`，未写 → `undefined`，页默认完全不经过它）。现在合并点只有 `FormFieldCore` 一处：`FormFieldContext` 增 `fl`（下行的页 `fl`，**只装 FormField 会读的部分**，类型 `MaybeRefOrGetter<{ item?: boolean }>`），FormView 不再为 `item` 包一层、改为原样挂 `createFormItem` 的产物；快照里 `item` 恒为布尔，两个消费者读到同一个值。`FormFieldFormless` 补上此前有值无类型的 `item`；`CreateFormItemOptions.fl` 那个预留口子删除（要解决的问题已由 `FORM_FIELD_KEY.fl` 承担）。`fl.item === false` 现在可以安全地用来判「这一格不挂宿主 Item」
- 字段类型收束：`ItemFl` → **`FormFieldFormless`**（归一化快照）；新增 **`FormFieldFormlessRaw`**（未归一化的 `fl` 袋，`FormField` 的 `fl` prop / `FormFieldCore.preset.fl` / `FormItem` 的 `fl` prop，此前一律写 `Record<string, unknown>`）。类型对齐实现：删 `getValues()`（声明了但从未实现）、`model` 收窄为 `(string | undefined)[]`、`prop` 可为 `undefined`（无自有 `fl:prop` 且祖先答不出时）、补上有值无类型的 `field`；`FormFieldContext.getProp` 同步为 `(string | undefined)[]`。适配器 `props` 函数与 README / playground 示例跟进（`fl.prop` 现在需要空值守卫）
- 通道分发收口到一个文件（内核私有）：`dispatch.ts` + `use-form-attrs.ts` 合并为 `use-dispatch.ts`——通道表 / `resolveKey` / `dispatch` 原语与 `useDispatch` 关口、三个通道集（`VIEW_ATTR_CHANNELS` / `FIELD_ATTR_CHANNELS` / `FIELD_SLOT_CHANNELS`）同处一个模块，文件名与内容对齐（原 `use-form-attrs.ts` 里并没有 `useFormAttrs`）；测试同步并为 `use-dispatch.test.ts`。行为与公开导出不变
- `useDispatch` 统一 + `keep` 投影（内核私有）：`useFormViewAttrs` / `useFormFieldAttrs` 两个 hook 合成 `useDispatch(attrs, channels, options?)`——一次分桶 + 每桶一个 `computed`，桶名由 `Channel` 经 `utils.ToCamel` 派生（`layout-item` → `layoutItem`，不再手写第二个桶名映射）；通道集改为导出的 `VIEW_ATTR_CHANNELS` / `FIELD_ATTR_CHANNELS`（`FIELD_SLOT_CHANNELS` 不变，`dispatch(slots, …)` 照旧）。`dispatch` 增可选 `{ prefix: 'keep' | 'drop' }`（默认 `'drop'`，现有调用点零改动）：`keep` 只改**被认领通道**的键形，保留输入拼写（前缀与监听拼写都不动），因此可被同一张通道表再认领一次（供后续父组件把某通道原样交给子组件）；`default` 两模式完全一致，`resolveKey` 不加分支。`utils.ts` 抽 `toCamel` / `ToCamel`（通道表原先内联的同一段正则改用它）。行为不变：attrs 侧的读法（`fl.value` 等）保持，slot 与 attr 仍走同一条剥皮路径
- 通道分发合一（内核私有）：`channels.ts` / `attrs.ts` / `slots.ts` 合并为 `dispatch.ts`（通道表 + 前缀派生 + `dispatch(bag, channels)` 一次分桶：每通道一桶 + `default` 裸名残差，props 与监听一视同仁，不筛值）+ `use-form-attrs.ts`（`useFormViewAttrs` / `useFormFieldAttrs` / `useFormFieldSlots`，通道集由这层持有）。`pickAttrs` / `omitAttrs` / `splitSlots` 退场；`toAttrBoolean` 归 `utils.ts`。行为不变：attrs 侧不再重复扫描（FormField 6 次 → 1 次），slot 与 attr 走同一条剥皮路径（`onItem:x` slot 名剥成 `onXx`）
- 通道路由统一（内核私有）：`channels.ts` 改通道表，监听前缀由通道名**派生**（`onItem:` 不再手写字面量，`on` + PascalCase + `:`），四个通道一视同仁（含 `fl:`）；`attrs.ts` 只留两个原语 `pickAttrs`（单通道：剥前缀的 props + 还原成 `onXxx` 的监听，同一袋）/ `omitAttrs`（多通道：裸名残差）。`splitFlAttrs` / `takePrefixed` / `splitFormlessProps` / `useFormlessProps` / `splitFallthrough` / `item-fallthrough.ts` 退场，响应式包装（`computed`）回到各调用点
- 行为：`@layout:*` / `@layout-item:*` 此前当作裸名落到 control，现按「前缀 = 目标组件」去 LayoutView / LayoutItem（`@item:*` 早已如此）。`FormView` 上 `layout-item:*` / `item:*` 都不是页通道，一并在 `default` 里透传给宿主 Form（`layout-item:*` 此前在页上被静默丢弃）
- ADR-020：`createFormFields` / `FormField` / `FormCell`（并列导出，不挂 `FormView.Cell`）；`cell: 'wrap' | 'embed' | 'wrap-embed'`；`item` 仅 boolean；`fieldKey` / `FieldSchema`
- 删除 `createFormControls`、`useFormItem`、`FormView.Item`、`resolveControlShell`、`ControlFrame`
- ADR-011：引号键段全称化——可承载任意字符串键（空白 / `.` / `[]` / 空串 `[""]`）；「键段禁止空串」收紧为「不加引号的键段禁止空串」，`prop: ''` 仍禁止
- 内核私有工具归集（`utils.ts`）：`string-case.ts` / `record-utils.ts` 合并，函数按 lodash 命名——`camelToPascal` / `CamelToPascal` → `upperFirst` / `UpperFirst`（`attrs.ts` 里的私有 `capitalize` 是同一实现，一并并入），`omit` / `omitUndefined` 原样迁入

### Fixed

- **field control 的同名监听不再被 v-model 写口盖掉**：`FormFieldCore.controlAttrs` 此前是三层浅展开，`bind`（`$bindings`）最后落地，标签上的 `@update:modelValue`（以及任何 `onUpdate:xxx` 监听）会被 formless 自己的写口**整键覆盖**、根本收不到。现在 `bind` 拆成 `values`（数据键）与 `events`（写口监听）两半，最终 props 用 Vue 的 `mergeProps(bind.events, { ...preset.props, ...control }, bind.values)` 合成——外部两层仍按「覆盖」先合成一层（`preset.props` 的 `onClick` vs 标签 `@click` 近的赢，`class` / `style` 口径也因此不变），写口监听与外部监听**融合**成数组、两个都触发（**写口先跑、外部监听随后**），数据键覆盖外部（与 SFC 编译器 `v-model` + `@update:xxx` 同一实现）。`$bindings` 仍是两半拼回的一袋，插槽契约不变

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
