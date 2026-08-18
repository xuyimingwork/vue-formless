# ADR-008：FormView、`v-model` 与栅格适配公约数

- **状态**：Accepted（修订）
- **日期**：2026-08-13
- **修订**：
  - 2026-08-13 — 适配挂载、`v-model`、公约数与空白 Col；见正文。
  - 2026-08-14 — 页级密度收拢为 `layout: boolean | { column, gutter }`，默认 `false`。
  - 2026-08-18 — 控件不就地改对象；FormView 是唯一写入点，同 tick 合并 patch 后 `emit` 新对象。
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
<FormView v-model="user" :layout="{ column: 2, gutter: 16 }">
  <User.Name />
</FormView>
```

理由：

- `<User.Name />` **不**在页面模板上绑 `v-model`。ElForm 的 `:model` 只给校验/重置用，真正写入在每个输入的 `v-model="form.xxx"`。Formless 收掉这些口之后，作者能指认的写入点只剩 `FormView` 的 `v-model`。
- 因此 **FormView 必须是改动真实发生的位置**：控件经 Context `update(prop, value, path?)` 上报，FormView `emit('update:modelValue', next)`，由父级 `v-model` 赋值。
- 根上单向 `:model` 对齐的是 Element 的校验袋，不是本库的写口；已否。

实现约定：

- `modelValue` 放入 Context **只读**（父级快照）；写入只走 `update`
- **禁止**就地改共享引用；每次提交一份浅拷贝新对象 `{ ...modelValue, ...patch }`
- 同一 tick 内多次 `update`（双口控件同时改 `start`/`end`，或联动导致多个控件一起写）必须先合并 patch，在 `nextTick` **只 emit 一次**。Vue 的 props 更新是异步批处理、事件处理是同步的：若每次 `update` 都按当前 `props.modelValue` spread 后立刻 emit，第二次仍看到旧对象，先写的键会丢
- 父级绑定必须可赋值（`ref` / 可写属性）。`reactive` 对象无法被 `v-model` 整包替换
- 页级密度收在 **`layout`**（见下），不再散落 `default-span` / `gutter` / `columns`

### 2.1 `layout`：`boolean | { column, gutter }`，默认 `false`

与 HTML 布尔属性一致：**不写 = false = 纯 Context**（不托管栅格）。

```ts
layout?: boolean | {
  column?: number  // 一行几列；defaultSpan = total / column（total 默认 24）
  gutter?: number
}
```

| 写法 | 含义 |
|------|------|
| 不写 / `:layout="false"` | 不托管，业务手写 Row/Col |
| `layout` / `:layout="true"` | 托管；密度用默认（当前 `column: 2`, `gutter: 16`；后续可按容器宽度推断） |
| `:layout="{ column: 4, gutter: 12 }"` | 托管；显式页级密度 |

字段上的 `:span` 仍是例外覆盖（如整行 24），不是页级配置。

### 3. 适配公约数：`Row` + `Col(span)`；不开放自由配

接外部栅格等于只吃**能力公约数**。策略层（密度、补白、换行）由 `FormView` 主控；若把底层 Row/Col 原生 props 全量透传，会与托管算法抢方向盘（两套响应式、`offset` 与空白补齐冲突等）。

**挂载方式**：项目级一次 `createFormView({ Row, Col, total? })`，得到绑定了外部栅格的 `FormView`；不在内核写死某一组件库。Element Plus 可直接使用 `@vue-formless/element-plus` 已绑定的 `FormView`。

```ts
import { ElRow, ElCol } from 'element-plus'
import { createFormView } from 'vue-formless'

export const FormView = createFormView({ Row: ElRow, Col: ElCol })
```

| 能力 | 归属 | 说明 |
|------|------|------|
| **span**（相对 total 的占位） | 外部 Col（必须） | 内核认 `span / total`；适配器常见 `total = 24`，亦可为 12 等 |
| **Row 容器** | 外部（实际上必须） | 经典栅格下 Col 的 span 依赖行容器 |
| **gutter** | `FormView` → Row **可选透传** | Row 有则生效；无则间距能力不可用（或将来 CSS 降级），**不影响**排版算法 |
| **换行 / 类 offset / 行末补齐** | `FormView` 算法 | 一律渲染**空白 `Col(span=n)`**，不调用外部 `offset` / `push` / `pull` |
| **Item 级 `xs/sm/md`、任意 Col 透传** | 不做默认能力 | 超出公约数时**退出托管**，手写外部栅格（不写 `layout` 或字段 `bare`） |

最小接入条件：

```text
能渲染「占 total 中 span 份」的列格子 + 行容器
→ createFormView({ Row, Col })
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
2. **根上 `:model` 对齐 Element**：ElForm 的 `:model` 是校验用只读入口，不是写口；本库控件已不绑 v-model，根必须是真 `v-model`。已否决。
3. **就地改 `modelValue.xxx`、不 emit**：实现简单，但改动不经过 v-model，与「FormView 是唯一写入点」矛盾；双口同时更新也无法在聚合层合并。已否决。
4. **每次 `update` 立刻 `{ ...props.modelValue, [k]: v }` 并 emit**：单次写入可用；同一 tick 两次 emit 时 props 仍是旧对象，后一次覆盖前一次。必须 tick 内合并 patch。
5. **自研 Row/Col 或默认 CSS Grid**：扩大库内能力、减少适配，但与周边中后台页面栅格心智分裂；ADR-007 已否决，本文不翻案。
6. **开放 Col `offset` / 断点 props**：表达力强，易与页级密度、空白补齐算法打架；改为空白 Col，超出则退出托管。
7. **对外强制 Provider + Grid 两层**：职责最干净，主路径样板重；仅作内部拆分或进阶 API，不作默认用法。

## 后果

- **正向**：根命名与「可纯 Context」一致；`v-model` 是真实写口（emit 新对象）；同 tick 多口写入不丢键；适配面锁在 span，策略不外泄；奇怪布局有退出通道且主路径仍一层。
- **代价**：各 UI 库只能映射公约数能力；无 Row/Col（或等价 span）则无法启用托管布局；`gutter` 等为尽力透传；`v-model` 侧必须用 `ref` 而非不可替换的 `reactive`。
- **关联**：静态 Fields 与 Context 职责见 [ADR-004](./004-form-layout-and-context.md)；外部栅格与 span 优先级、Layout 级响应式见 [ADR-007](./007-layout-adapter-and-span-priority.md)（文中「Layout」在实现与文档中对应 `FormView` 的托管模式 / 页级默认）。
