# ADR-011：`model`、`prop` 与 `path`

- **状态**：Accepted（修订）
- **日期**：2026-08-18
- **修订**：
  - 2026-08-18 — 原「path = 数据键」作废；拆成 **`prop`（叶子键）+ `path`（导航串）**。
  - 2026-08-18 — `prop` 可短于 `model`（前缀接线）。表格用 `:path="\`buyers[${$index}]\`"`，一层 FormView。
  - 2026-08-19 — 多叶子时 `formItemProp` 退回控件键，只适用于 **一格 Item**（OneInput）。两格按口投影，见 [ADR-013](./013-one-control-multiple-items.md)。
  - 2026-08-19 — 宿主 Item `prop` 由适配器编码，内核 snapshot 只给 `binding` + `controlKey` + `getValues()`。见 [ADR-014](./014-multi-vmodel-host-validation.md)。
  - 2026-08-19 — 一格多口时 ElForm `value` / 红字 / 不污 DTO，见 [ADR-014](./014-multi-vmodel-host-validation.md)。
  - 2026-08-25 — 标签覆盖改为 `:fl:path` / `:fl:prop`（[ADR-015](./015-formless-config-groups.md)）。空串 path 算有值；`prop` 禁止空串。`model` 锁在 component / 控件 `formless`；格上无 `fl:model`。
- **来源**：相对 [ADR-009](./009-controls-as-protagonist.md) §6 的修订

## 背景

009 早期把绑定写成 `{ start: 'startTime' }` 对象映射，或单一 `path` 兼做数据键与导航，越写越拧：

- **叶子键**（`name` / `startTime`）跟 **导航**（`buyers[0]`）语义不同，不应共用一个名字。
- 模板里控件不绑 v-model，**唯一写口是 FormView**（[ADR-008](./008-form-view-vmodel-and-grid-gcd.md)）。表格不能 `v-model="users[i]"` 绕过数组入口，也不能就地改 `row`。
- 数组段必须用 **`[index]` 语法** 解析，不能靠 `path` 是 number 推断，也不能把 `path` 做成 array type（会和 `prop` array 的多绑定语义撞车）。

## 决策

### 1. 三项分工

| 字段 | 类型 | 含义 | 跟谁走 | 标签覆盖 |
|------|------|------|--------|----------|
| **`model`** | `string \| string[]` | 组件 v-model 口 | 控件身份 | **否** |
| **`prop`** | `string \| string[]` | 导航终点对象上的**叶子键** | 数据接线 | **可以** |
| **`path`** | **`string`（标量）** | 从 FormView 根出发的**导航串** | 场景 / 表格 | **可以** |

绝对位置 = 解析 `path` 得到节点 + `prop` 叶子。

```ts
name: { component: ElInput }
// model = 'modelValue'，prop = 'name'（控件键），path 省略

title: { component: ElInput, prop: 'name' }

timeRange: {
  component: DateRange,
  model: ['start', 'end'],
  prop: ['startTime', 'endTime'],
}

agency: {
  component: AgencySelect,
  model: ['modelValue', 'option'],
  prop: 'agencyId', // 只绑 modelValue；option 不绑表
}
```

### 2. `path` 语法（标量 string）

- 对象键：`buyer`、`buyers`
- 数组段：**必须**写 `[index]`，如 `[0]`、`` `[${$index}]` ``
- 组合：`buyers[0]`、`buyers[0].addresses[1]`（实现按段解析；通常写到行节点即可，叶子交给 `prop`）
- **不支持** `path` 的 array type API（`['users', 0]`），避免与 `prop` array 混淆

FormView writer 解析 `[index]`，对数组段 **clone 再 emit**，禁止 `arr[i] = x` 绕过 v-model。

### 3. `prop` 与 `model` 配对

- `prop.length <= model.length`，按下标前缀与 `model` 对齐；多出来的口不绑表。
- 两个 `prop` 需要**不同** `path` → 拆成两个 control，不做 `path` array 配对。

### 4. 默认值

| 省略 | 默认 |
|------|------|
| `model` | `'modelValue'` |
| `prop` | 控件键（如 `name`） |
| `path` | 无（FormView 根对象） |

### 5. 标签覆盖

走 `:fl:path` / `:fl:prop`（[ADR-015](./015-formless-config-groups.md)），不占输入的顶层 props：

```vue
<User.Name :fl:prop="'title'" />
<User.Name :fl:path="`buyers[${$index}]`" />
<User.TimeRange :fl:path="`buyers[${$index}]`" />
```

- 可覆盖 `prop` / `path`，不可覆盖 `model`。有值才盖；空串 path 算有值；**`prop` 禁止空串**。
- **不需要** `Path` 包裹组件；`:fl:path` 足够。
- 同一概念两个数据位（行程 vs 签证时间）→ 簇里两项，各自写死 `prop`，不是标签上改两个 path。

### 6. 宿主 Item `prop` 不由内核决定

内核 Item `fl` 只给 `binding`、`controlKey`、`getValues()`，**不**预计算 ElFormItem `prop`。

控件 schema 上的 **`prop` 仍是叶子**。点号路径、控件键、Naive `path` 数组等编码都在适配 Item 内部。Element 适配可用 `resolveFormItemProp`（单叶子 → `formItemProp(path, leaf)` → `buyers.0.name`；多口一格 → 控件键）或自己编码。Form 投影键必须与 Item 写出的 `prop` 一致。见 [ADR-012](./012-input-item-and-rule-compile.md) / [ADR-014](./014-multi-vmodel-host-validation.md)。

一颗 control 铺 **多格** Item 时，适配按口派生叶子路径，见 [ADR-013](./013-one-control-multiple-items.md)。

### 7. 列表 / 表格

一层 FormView，`v-model` 绑数组或含数组的对象；单元格只改 `:fl:path`，不改控件 API：

```vue
<FormView v-model="order">
  <el-table :data="order.buyers">
    <el-table-column label="姓名">
      <template #default="{ $index }">
        <User.Name :fl:path="`buyers[${$index}]`" />
      </template>
    </el-table-column>
  </el-table>
</FormView>
```

根为 array 时：`<FormView v-model="users">` + `` :fl:path="`[${$index}]`" ``。

写入：`ctx.update(prop, value, path)` → FormView 同 tick 合并 patch → `emit` 新对象（含新 array）。见 [ADR-008](./008-form-view-vmodel-and-grid-gcd.md)。

## 备选方案

1. **单一 `path` 兼叶子与导航**：表格要么 path-prefix，要么完整 `users[0].name` 重写身份；已否。
2. **`path` array type**：与 `prop` array 语义冲突；已否。
3. **`Path` 包裹组件 provide 前缀**：`:fl:path` 已够；已否。
4. **嵌套 `FormView v-model="users[i]"`**：绕过数组 v-model 入口；已否。
5. **就地改 modelValue**：与 FormView 唯一写口矛盾；已否（ADR-008）。

## 后果

- **正向**：叶子（`prop`）与导航（`path`）名实相符；表格一层 FormView；`[index]` 显式表达数组段；多 model 同 path 自然合并 patch。
- **代价**：path 要写 mini DSL；完整路径由适配 Item 编码，控件 schema 上的 `prop` 仍是叶子（ADR-012）；父级 `v-model` 须可赋值（`ref`）。
- **关联**：[ADR-009](./009-controls-as-protagonist.md)、[ADR-010](./010-controls-as-semantic-cluster.md)、[ADR-008](./008-form-view-vmodel-and-grid-gcd.md)、[ADR-012](./012-input-item-and-rule-compile.md)、[ADR-013](./013-one-control-multiple-items.md)、[ADR-014](./014-multi-vmodel-host-validation.md)。009 §6 以本文为准。
