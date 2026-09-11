# ADR-011：`model` 与 `prop`

- **状态**：Accepted（修订）
- **日期**：2026-08-18
- **修订**：
  - 2026-08-18 — 原「path = 数据键」作废；曾拆成 **`prop`（叶子）+ `path`（导航）**。
  - 2026-08-18 — `prop` 可短于 `model`（前缀接线）。
  - 2026-08-19 — 多叶子时 `formItemProp` 退回控件键，只适用于 **一格 Item**（OneInput）。两格按口投影，见 [ADR-013](./013-one-control-multiple-items.md)。
  - 2026-08-19 — 宿主 Item `prop` 由适配器编码，内核 snapshot 只给 `binding` + `fieldKey` + `getValues()`。见 [ADR-014](./014-multi-vmodel-host-validation.md)。
  - 2026-08-25 — 标签覆盖改为 `:fl:prop`（[ADR-015](./015-formless-config-groups.md)）。`prop` 禁止空串。`model` 锁在 component / 控件 `formless`；格上无 `fl:model`。
  - 2026-08-27 — **取消独立 `path`**。位置只写 `prop`（可含 `buyers[0].name` / `` `buyers[${$index}].name` ``）。原先 `path` + 叶子的拆分多一个名字，表格用完整 `prop` 即可。
  - 2026-09-09 — 宿主 Item `prop` 的 **dot 编码**（`resolveFormItemProp` / `toDotPath`）移出内核到 Element 适配层；内核只保留 `parsePath` 语法解析 + `getIn` / `setIn` 读写。
  - 2026-09-09 — **键文法扩展**：`.` 数字段与 `["…"]` 引号段 = **对象键**（数字键 map、含点键可达）；`[n]` 仍是数组段唯一写法。shape 错配读写带提示（读 warn / 写 throw）。
  - 2026-09-10 — **引号段全称化**：引号键可承载任意字符串键——空白、`.` / `[]`、以及空串 `[""]`（`obj['']` 合法）。原「键段禁止空串」收紧为「**不加引号**的键段禁止空串」；`prop: ''`（整个绑定为空）仍禁止。可达性只由内核 `parsePath` / `getIn` / `setIn` 保证；宿主编码表达不了时（如 Element 的 dot）由适配层与使用侧自行收窄 `prop`，见 §6。
  - 2026-09-10 — **读写沉默化 + 写侧覆盖**：`parsePath` 对非法 / 空 `path` 返回 `undefined`，不再 throw / warn（调用方自己排查 `path`）；`getIn` 读侧错配一律读作 `undefined`、不再 warn；`setIn` 由「错配 throw」改为「形状匹配即合并 / 不匹配即覆盖」，覆盖时不提示（与读侧一致，内核读写全程不 warn、不 throw）。内核读写对称化为 `readSegments` / `readSegment` 与 `writeSegments` / `writeSegment`。
  - 2026-09-10 — **读侧只看自有属性**：`getIn` 的键段经 `hasOwnProperty.call` 读**自有属性**，不穿透原型链——`constructor` / `toString` / `hasOwnProperty` / `__proto__` 等文法合法但并非数据的段读作 `undefined`，与 `setIn` 只写自有键互逆（`{ ...base, [key]: value }` 即自有属性）。`Object.create({ default })` 这类原型默认值不再可读：模型应是纯数据。`Object.prototype.hasOwnProperty` 用 `call` 调用，因 `hasOwnProperty` 本身也是可达键。
  - 2026-09-10 — **通道前缀收敛**：`FormCell` → `FormItem`；`prop` 三义收敛为 `fl:prop`（绑定输入）与 `item:prop`（机械覆盖宿主 Item）；Field 内按口切片改 `fl:model`（**选口，非覆盖身份**）。见 [ADR-021](./021-channel-prefix-and-form-item.md)。
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
- **数字键**：`.0` 或引号 `["0"]` / `['0']`（数字键 map，如 `map.0.name`、`` `${id}.name` ``）。数字开头的标识符也是键：`map.5f8a.nick`。
- **含分隔符的键**：写引号段 `map["user.name"].x` / `map["a[b]"].x`，`\` 转义引号。引号段是**全称逃逸口**：可承载任意字符串键——空白、`.` / `[]`、以及空串（`map[""]`，`obj['']` 合法）。只有**不加引号**的键段必须非空；正则糖（`name` / `.0`）的字符限制只约束不加引号的写法，不约束键本身。
- 数组段：**必须**写 `[index]`，如 `[0]`、`` `[${$index}]` ``。`.` 数字是**对象键**不是下标；`[n]` 与 `.n` 永不互指。
- 组合：`buyers[0].name`、`buyers[0].addresses[1].city`、`map.0.name`。
- **`prop` array** 只表示多口接线（与 `model` 前缀对齐），不是路径段数组。不要 `prop: ['buyers', 0, 'name']`。

FormView writer 解析 `[index]`，对数组段 **clone 再 emit**，禁止 `arr[i] = x` 绕过 v-model。内核 shape 错配：**读侧沉默**——错配段读作 `undefined`，不 warn；**写侧形状匹配即合并、不匹配即覆盖**（键落在数组 → 对象；下标落在对象 → 数组），覆盖同样不提示，不 throw。`parsePath` 对非法 / 空 `path` 返回 `undefined`，`getIn` 读作 `undefined`、`setIn` 原样返回 `root`，均不 throw、不 warn。读侧的键段只认**自有属性**（`hasOwnProperty.call`），原型链不算数据：`constructor` / `toString` / `__proto__` 等段读作 `undefined`，与写侧只写自有键对称。

keyed-map **行编辑 UI**（遍历键 / 增删键）不属于内核：`getIn` / `setIn` 只保证这类 model 的**数据读写可达**，表格/列表行编辑仍是数组向的 `[${$index}]` 故事。

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

- 可覆盖 `prop`，不可覆盖 `model`。有值才盖；**`prop` 禁止空串**——指**整个 `prop` 为空**、不指向任何位置。指向空字符串键的 `prop: '[""]'` 是非空字符串，合法（能否落到宿主由适配层决定，见 §6）。
- 同一概念两个数据位（行程 vs 签证时间）→ 簇里两项，各自写死 `prop`。

### 6. 宿主 Item `prop` 不由内核决定

内核 Item `fl` 只给 `binding`、`fieldKey`、`getValues()`，**不**预计算 ElFormItem `prop`。内核只提供 `parsePath` 语法解析（把 `buyers[0].name` 拆成段）；把位置编码成宿主 `prop` 形态是适配层职责——Element 需要 dot（`buyers.0.name`，单口）或控件键（多口一格），别的宿主可以用自己的写法（如 namePath 数组）。本仓库示例见 `playground/src/ep/form-view.ts`。Form 投影键必须与 Item 写出的 `prop` 一致。见 [ADR-012](./012-input-item-and-rule-compile.md) / [ADR-014](./014-multi-vmodel-host-validation.md)。

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
