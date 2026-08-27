# ADR-011：`model` 与 `prop`

- **状态**：Accepted（修订）
- **日期**：2026-08-18
- **修订**：
  - 2026-08-18 — 原「path = 数据键」作废；曾拆成 **`prop`（叶子）+ `path`（导航）**。
  - 2026-08-18 — `prop` 可短于 `model`（前缀接线）。
  - 2026-08-19 — 多叶子时 `formItemProp` 退回控件键，只适用于 **一格 Item**（OneInput）。两格按口投影，见 [ADR-013](./013-one-control-multiple-items.md)。
  - 2026-08-19 — 宿主 Item `prop` 由适配器编码，内核 snapshot 只给 `binding` + `controlKey` + `getValues()`。见 [ADR-014](./014-multi-vmodel-host-validation.md)。
  - 2026-08-25 — 标签覆盖改为 `:fl:prop`（[ADR-015](./015-formless-config-groups.md)）。`prop` 禁止空串。`model` 锁在 component / 控件 `formless`；格上无 `fl:model`。
  - 2026-08-27 — **取消独立 `path`**。位置只写 `prop`（可含 `buyers[0].name` / `` `buyers[${$index}].name` ``）。原先 `path` + 叶子的拆分多一个名字，表格用完整 `prop` 即可。
- **来源**：相对 [ADR-009](./009-controls-as-protagonist.md) §6 的修订

## 背景

绑定需要两件事：组件吃哪个 v-model 口，以及写到 FormView 模型的哪。曾把后者再拆成「导航到行」(`path`) 和「行上的叶子」(`prop`)，表格写成 `:fl:path="buyers[${$index}]"`、叶子仍用默认 `name`。多一个配置位，和「直接写完整位置」相比没有多出能力。

## 决策

### 1. 两项分工

| 字段 | 类型 | 含义 | 跟谁走 | 标签覆盖 |
|------|------|------|--------|----------|
| **`model`** | `string \| string[]` | 组件 v-model 口 | 控件身份 | **否** |
| **`prop`** | `string \| string[]` | 从 FormView 根到叶子的**位置** | 数据接线 | **可以** |

```ts
name: { component: ElInput }
// model = 'modelValue'，prop = 'name'（控件键）

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

### 2. `prop` 语法

- 对象键：`buyer`、`name`
- 数组段：**必须**写 `[index]`，如 `[0]`、`` `[${$index}]` ``
- 组合：`buyers[0].name`、`buyers[0].addresses[1].city`
- **`prop` array** 只表示多口接线（与 `model` 前缀对齐），不是路径段数组。不要 `prop: ['buyers', 0, 'name']`。

FormView writer 解析 `[index]`，对数组段 **clone 再 emit**，禁止 `arr[i] = x` 绕过 v-model。

### 3. `prop` 与 `model` 配对

- `prop.length <= model.length`，按下标前缀与 `model` 对齐；多出来的口不绑表。
- 两个口要接到不同位置：写两个完整 `prop` 字符串（如 `['buyers[0].startTime', 'buyers[0].endTime']`），或拆成两个 control。

### 4. 默认值

| 省略 | 默认 |
|------|------|
| `model` | `'modelValue'` |
| `prop` | 控件键（如 `name`） |

### 5. 标签覆盖

走 `:fl:prop`（[ADR-015](./015-formless-config-groups.md)），不占输入的顶层 props：

```vue
<User.Name :fl:prop="'title'" />
<User.Name :fl:prop="`buyers[${$index}].name`" />
<User.TimeRange :fl:prop="[`buyers[${$index}].startTime`, `buyers[${$index}].endTime`]" />
```

- 可覆盖 `prop`，不可覆盖 `model`。有值才盖；**`prop` 禁止空串**。
- 同一概念两个数据位（行程 vs 签证时间）→ 簇里两项，各自写死 `prop`。

### 6. 宿主 Item `prop` 不由内核决定

内核 Item `fl` 只给 `binding`、`controlKey`、`getValues()`，**不**预计算 ElFormItem `prop`。

Element 适配可用 `resolveFormItemProp`（单一位置 → `formItemProp` → `buyers.0.name`；多口一格 → 控件键）或自己编码。Form 投影键必须与 Item 写出的 `prop` 一致。见 [ADR-012](./012-input-item-and-rule-compile.md) / [ADR-014](./014-multi-vmodel-host-validation.md)。

一颗 control 铺 **多格** Item 时，适配按口派生位置，见 [ADR-013](./013-one-control-multiple-items.md)。

### 7. 列表 / 表格

一层 FormView；单元格用完整 `:fl:prop`：

```vue
<FormView v-model="order">
  <el-table :data="order.buyers">
    <el-table-column label="姓名">
      <template #default="{ $index }">
        <User.Name :fl:prop="`buyers[${$index}].name`" />
      </template>
    </el-table-column>
  </el-table>
</FormView>
```

根为 array 时：`<FormView v-model="users">` + `` :fl:prop="`[${$index}].name`" ``。

写入：`ctx.update(prop, value)` → FormView 同 tick 合并 patch → `emit` 新对象。见 [ADR-008](./008-form-view-vmodel-and-grid-gcd.md)。

## 备选方案

1. **独立 `path` + 叶子 `prop`**（011 初版）：表格少写叶子名；多一个通道、空串 path 当「回到根」等特例。已取消。
2. **`prop` array type 当路径段**：与多口 `prop` 数组撞车；已否。
3. **`Path` 包裹组件 provide 前缀**：`:fl:prop` 已够；已否。
4. **嵌套 `FormView v-model="users[i]"`**：绕过数组 v-model 入口；已否。
5. **就地改 modelValue**：与 FormView 唯一写口矛盾；已否（ADR-008）。

## 后果

- **正向**：绑定只记 `model` + `prop`；表格和换绑都是改位置字符串。
- **代价**：行内多口要写完整位置（或拆 control）；`prop` 带一层 `[index]` mini DSL。
- **关联**：[ADR-009](./009-controls-as-protagonist.md)、[ADR-010](./010-controls-as-semantic-cluster.md)、[ADR-008](./008-form-view-vmodel-and-grid-gcd.md)、[ADR-012](./012-input-item-and-rule-compile.md)、[ADR-013](./013-one-control-multiple-items.md)、[ADR-014](./014-multi-vmodel-host-validation.md)。009 §6 以本文为准。
