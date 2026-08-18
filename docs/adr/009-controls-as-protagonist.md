# ADR-009：控件主角、页级控件表与列表上下文

- **状态**：Accepted（修订）
- **日期**：2026-08-17
- **修订**：
  - 2026-08-18 — 工厂定位见 [ADR-010](./010-controls-as-semantic-cluster.md)：`rules` 写在 control 上，本场用不用由场景决定。
  - 2026-08-18 — 同一概念的筛选/详情形态是簇里两项（`CreateTime` / `CreateTimeRange`），不是越界。
  - 2026-08-18 — 绑定拆成 `model`（控件口）、`prop`（叶子）、`path`（导航串）。见 [ADR-011](./011-model-and-path.md)。
  - 2026-08-18 — 表格一层 FormView + `:path="\`buyers[${$index}]\`"`。
- **来源**：相对 [ADR-003](./003-namespaced-field-components.md) / [ADR-004](./004-form-layout-and-context.md) / [ADR-005](./005-view-model-as-unit.md) 的后续澄清（命名、共享边界、换绑、数组行）

## 背景

ADR-005 已规定配置最小单元是控件，不是 DB 列。实现与文档仍大量使用 `createFormFields`、schema 键对齐接口字段（如 `agencyId`），并默认把命名空间表放在 `models/*.ts` 当领域单例跨页复用。

进一步推演后出现几处拧着的地方：

- `<User.AgencyId />` 读起来像「字段套了控件」，不像「用户的机构控件」
- 渲染期 `<User.Agency :component="AgencyTreeSelect" />` 等于先点名再整颗替换，语义绕
- 领域级共享控件表让「换组件」的影响面分不清：全领域规范 vs 某几处展示
- 列表场景是 `users[index].name`，若让控件理解 path/index，API 会膨胀

需要把主角、所有权、绑定上下文收口，避免继续按「领域字段表」实现。

## 决策

### 1. 主角是控件，不是接口字段

工厂产出的是**控件集合**。模板标签按控件命名：

```text
<User.Agency />     ✅ 用户身上的机构控件
<User.AgencyId />   ❌ 用户身上的 agencyId 字段控件
```

schema 键跟随控件（`agency`），不跟随 DTO（`agencyId`）。控件通过 `prop` / `path` 接到 FormView 模型（见 [ADR-011](./011-model-and-path.md)）；`model` 声明组件 v-model 口。

工厂名：**`createFormControls`**。

```ts
const User = createFormControls({
  agency: { label: '机构', component: AgencySelect },
  name: { label: '姓名', component: ElInput, rules: [/* 空：trim */] },
  timeRange: {
    label: '时间',
    component: TimeRange,
    model: ['start', 'end'],
    prop: ['startTime', 'endTime'],
  },
})
```

### 2. 产品定位：绑定复用 + 控件与布局分离

主路径不再是「与领域模型绑定、跨页复用 `<User.*>`」，而是：

```text
setup（或本页旁文件）声明本页控件表
模板只负责摆放（顺序、span、分组、逃逸栅格）
FormView v-model 把当前对象接到这些控件上
```

库保证的是：不必每个控件手写 `v-model="form.xxx"`，以及控件身份（component / 默认绑定 / label / `rules`）不跟 Row/Col 缠在同一套标签里。联动、本场是否启用 rules、布局不写进控件表，见 [ADR-010](./010-controls-as-semantic-cluster.md)。

跨页默认复用的是 **控件实现**（`AgencySelect`、`EpInput`）和 **绑定通道**（FormView / Context），不是整张 `User` 控件表。

### 3. 控件表默认跟页走；领域单例改为 opt-in

控件集合所有权默认在**页面**（`setup` 或与 SFC 成对的 `*.controls.ts`）。工厂仍可静态、不闭包绑 model；变的是不要默认放进领域 `models/user.ts`。

理由是改动的 blast radius：共享 `User.Agency` 的 `component` 一旦改掉，无法从意图上区分「全领域都换树选」还是「只有这一处展示要换」。高频变化（换组件、改文案、这场必填）塞进领域单例，会让领域模型改动变得过慎。

| 该共享 | 不该默认共享 |
|--------|----------------|
| `AgencySelect` / `EpInput`（实现） | `User = { Agency, Name, ... }` 整张表 |
| FormView、栅格适配 | 把 component 当领域规范强行扩散 |

真要「所有用户表单统一换树选」：改共享的 `AgencySelect`，或**显式**抽出一份共享控件表 / `user/` 输入模块。那是有意识的**前端输入域**，不是后端领域模型单例。扩散必须是有意识的。

### 4. 换控件位，不要在标签上换绑

| 意图 | 做法 |
|------|------|
| 同一种控件，不同数据位 | 集合里两项，各自写 `prop`（正路）；标签 `:prop` 仅为逃逸，见 [ADR-011](./011-model-and-path.md) |
| 同一控件位，换画法 | 控件自己的 `props` / `mode` / 插槽 |
| 同一概念，详情单点、筛选用区间（或单选 vs 多选） | 簇里两项，都归属该输入域：`<User.CreateTime />` 与 `<User.CreateTimeRange />`，或 `Agency` 与 `AgencyList`。形态不同仍是 User 的格 |
| 这一页根本不是这个控件 | 本页声明里直接写目标 component，或手写这一格 |

`<User.Agency :component="AgencyTreeSelect" />` 降为 **escape**。数据用 `prop` / `path`，不要在标签上改 `model`（控件口）。

### 5. 列表 / 表格：一层 FormView + `:path`

控件读 `getIn(modelValue, path, prop)`，写 `update(prop, value, path)`，经 FormView emit。`model` 只描述组件 v-model 口。

- 整表：`FormView v-model="order"` + `<User.Name />` → `prop: name` → emit `{ ...order, name }`
- 表格：同一 FormView，单元格 `` :path="`buyers[${$index}]`" `` → `order.buyers[i].name`，emit 含新 `buyers` array

不要 `v-model="users[i]"`（绕过数组入口）；不要绑 slot 的 `row`（只读，赋不回）。

```vue
<FormView v-model="order">
  <el-table :data="order.buyers">
    <el-table-column label="姓名">
      <template #default="{ $index }">
        <User.Name :path="`buyers[${$index}]`" />
      </template>
    </el-table-column>
  </el-table>
</FormView>
```

根为 array：`FormView v-model="users"` + `` :path="`[${$index}]`" ``。写入见 [ADR-008](./008-form-view-vmodel-and-grid-gcd.md)、[ADR-011](./011-model-and-path.md)。

### 6. 控件项 API：`model` + `prop` + `path`

见 [ADR-011](./011-model-and-path.md)。009 原文的「一份 `model` 对象映射」作废。

```ts
xxx: {
  component: Xxx,
  model?: string | string[]  // 组件 v-model 名，默认 'modelValue'
  prop?: string | string[]   // 叶子键，默认控件键
  path?: string              // 导航串，如 buyers[0]、[2]
}
```

| | 展开 | 例子 |
|--|------|------|
| 都省略 | `modelValue` ↔ 控件键 | `name: { component: ElInput }` |
| 只写 `prop` | `modelValue` ↔ 该键 | `prop: 'title'` |
| 多绑定 | `prop` 可短于 `model` | `prop: ['startTime', 'endTime']` |
| 表格 | `:path` 导航 | `` :path="`buyers[${$index}]`" `` |

标签可覆盖 `prop` / `path`，不可覆盖 `model`。

## 备选方案

1. **继续领域级 `createFormFields` + `User.AgencyId`**：和接口 1:1，跨页改一处全跟着动；换组件意图不可控；已否决为默认。
2. **渲染期 `:component` / `:name` 作为一等换绑**：灵活，但把控件标签变成可任意顶替的壳，冲淡 `<User.Agency />`；仅作逃逸。
3. **控件上的数组下标表达 `users[i].name`**：表格会把绑定语言铺进每一格；已否决（见 ADR-011 对 `path` 的限定）。
4. **`useFormControls` 暗示必须在 setup 调、且每次重建**：集合仍应是静态组件表，只是所有权跟页；不宜用 `use*` 误导生命周期。

## 后果

- **正向**：命名与 ADR-005 对齐；页级声明让换控件影响面局部；表格一层 FormView + `:path`；主故事更好讲。
- **代价**：不再默认「一份 User 打编辑+筛选+详情」；重复的声明若出现，需有意识抽取。ADR-001「模型放静态 TS 单例」、ADR-004「Fields 跨页单例」降为进阶，不再是主路径。
- **关联**：工厂是语义输入簇、controls 非目标见 [ADR-010](./010-controls-as-semantic-cluster.md)；`model` / `path` 见 [ADR-011](./011-model-and-path.md)；控件单元见 [ADR-005](./005-view-model-as-unit.md)；命名空间标签见 [ADR-003](./003-namespaced-field-components.md)；Context / FormView 见 [ADR-004](./004-form-layout-and-context.md)、[ADR-008](./008-form-view-vmodel-and-grid-gcd.md)。工厂以 `createFormControls` 为准。
