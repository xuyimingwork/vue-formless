# ADR-008：FormView、`v-model` 与栅格适配公约数

- **状态**：Accepted
- **日期**：2026-08-13
- **来源**：相对 [ADR-004](./004-form-layout-and-context.md) / [ADR-007](./007-layout-adapter-and-span-priority.md) 的后续澄清（命名、数据口、适配面与占位策略）

## 背景

ADR-004 将运行时粘合命名为 `FormLayout`，并同时承担 FormContext 与布局宿主。ADR-007 约定消费外部 Row/Col、不自研栅格，但未钉死：

- 根组件在「只管 Context」时是否仍叫 Layout
- 表单数据以 `:model` 还是 `v-model` 进入 Context
- 外部适配的最小公约数是什么；`gutter` / `offset` / 换行等落在哪一侧
- 若拆成 Provider + Grid，主路径是否被迫两层嵌套

进一步推演后需要收口，避免实现期 API 摇摆。

## 决策

### 1. 根组件命名为 `FormView`

- **`FormView`**：对外主入口；名称中性，不预设「一定在管栅格」
- 第一职责是提供 **FormContext**（可写表单状态、只读/禁用、页级布局默认等）
- 第二职责（可选）是托管栅格：按 span 编排外部 Row/Col、插入空白占位列

奇怪布局时可不启用托管，仅作 Context 根，业务手写外部栅格：

```vue
<FormView v-model="user">
  <ElRow><!-- 自由布局 -->
    <User.Gender />
  </ElRow>
</FormView>
```

ADR-004 中的 `FormLayout` 名称由本文废止为推荐对外名；文档与后续实现统一称 `FormView`。

### 2. 表单数据口使用 `v-model`

```vue
<FormView v-model="user" :columns="4" :gutter="16">
  <User.Name />
</FormView>
```

理由：

- `<User.Name />` **不**接收、**不**绑定具体 model，却会改动 model；写入经 FormContext，对外唯一数据接口是 `FormView`
- 若根上使用单向 `:model`，读起来像只读入参，与「子树会改这份数据」矛盾
- 这与 Element 等的 `:model` **不同层**：彼处写入点在业务模板的 `v-model="form.xxx"`，容器的 `:model` 并不接管更改；此处字段组件隐藏了绑定，根组件必须表达可写

实现约定：

- `modelValue`（`v-model`）放入 Context；字段就地改 `modelValue.xxx`（共享引用）
- **不**要求每改一字段就 `emit` 整包新对象（除非将来明确做不可变表单）
- `columns` / `gutter` 等仍为普通 props

### 3. 适配公约数：`Row` + `Col(span)`；不开放自由配

接外部栅格等于只吃**能力公约数**。策略层（密度、补白、换行）由 `FormView` 主控；若把底层 Row/Col 原生 props 全量透传，会与托管算法抢方向盘（两套响应式、`offset` 与空白补齐冲突等）。

| 能力 | 归属 | 说明 |
|------|------|------|
| **span**（相对 total 的占位） | 外部 Col（必须） | 内核认 `span / total`；适配器常见 `total = 24`，亦可为 12 等 |
| **Row 容器** | 外部（实际上必须） | 经典栅格下 Col 的 span 依赖行容器 |
| **gutter** | `FormView` → Row **可选透传** | Row 有则生效；无则间距能力不可用（或将来 CSS 降级），**不影响**排版算法 |
| **换行 / 类 offset / 行末补齐** | `FormView` 算法 | 一律渲染**空白 `Col(span=n)`**，不调用外部 `offset` / `push` / `pull` |
| **Item 级 `xs/sm/md`、任意 Col 透传** | 不做默认能力 | 超出公约数时**退出托管**，手写外部栅格 |

最小接入条件：

```text
能渲染「占 total 中 span 份」的列格子 + 行容器
```

`gutter` 不是接入门槛；空白 Col 是托管布局的统一占位手段。

### 4. 主路径一层嵌套；拆原语仅用于逃逸

不强制业务在「始终要布局」时写：

```vue
<FormProvider>
  <FormGrid>...</FormGrid>
</FormProvider>
```

约定：

- **主路径**：单一 `FormView`（内部可组合 Context + 可选栅格宿主），一层即可
- **逃逸**：不启用托管时，`FormView` 仅 Context + 手写 Row/Col；或同页混排「一段托管、一段手写」时再露出更细原语（若实现需要）
- 若实现层拆 `Provider` / `Grid`，对外仍以 `FormView` 合成为默认导出，避免主路径双层样板

## 备选方案

1. **继续叫 `FormLayout` + `pure`**：能表达逃逸，但「Layout 却 pure」语义拧；已否决为推荐名。
2. **根上 `:model` 对齐 Element**：与「字段经 Context 写入、根是唯一数据口」的心智不符；已否决。
3. **自研 Row/Col 或默认 CSS Grid**：扩大库内能力、减少适配，但与周边中后台页面栅格心智分裂；ADR-007 已否决，本文不翻案。
4. **开放 Col `offset` / 断点 props**：表达力强，易与页级密度、空白补齐算法打架；改为空白 Col，超出则退出托管。
5. **对外强制 Provider + Grid 两层**：职责最干净，主路径样板重；仅作内部拆分或进阶 API，不作默认用法。

## 后果

- **正向**：根命名与「可纯 Context」一致；`v-model` 诚实表达可写状态；适配面锁在 span，策略不外泄；奇怪布局有退出通道且主路径仍一层。
- **代价**：各 UI 库只能映射公约数能力；无 Row/Col（或等价 span）则无法启用托管布局；`gutter` 等为尽力透传。
- **关联**：静态 Fields 与 Context 职责见 [ADR-004](./004-form-layout-and-context.md)；外部栅格与 span 优先级、Layout 级响应式见 [ADR-007](./007-layout-adapter-and-span-priority.md)（文中「Layout」在实现与文档中对应 `FormView` 的托管模式 / 页级默认）。
