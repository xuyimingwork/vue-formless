# ADR-011：控件口 `model` 与数据位 `path` 分离

- **状态**：Accepted
- **日期**：2026-08-18
- **修订**：2026-08-18 — `path` 可以短于 `model`（前缀接线）；更长才是配置错误。
- **来源**：相对 [ADR-009](./009-controls-as-protagonist.md) §6 的修订（换绑时不必重写控件 v-model 名）

## 背景

009 把绑定写成一份映射：`model: { start: 'startTime', end: 'endTime' }`，左边是控件上的 v-model 名，右边是 FormView 对象上的键。换一组数据键时必须整份重写，而 `start` / `end` 属于 `DateRange` 的协议，根本不会变。

覆盖的通常是 **数据在哪**，不是 **控件有几个口**。两者不应焊在一个对象里。

009 §5 否决的「控件上的 `path` / `index`」指的是 `users[i].name` 这种数组下标； nested `FormView v-model="row"` 已经解决。本文的 `path` 是 **当前 Context 那份对象上的键**，不是列表下标。

## 决策

### 1. 拆成两项

| 字段 | 含义 | 跟谁走 | 标签覆盖 |
|------|------|--------|----------|
| **`model`** | 组件上的 v-model 名 | 控件身份 | **否** |
| **`path`** | 当前 FormView 对象上的键 | 数据接线 | **可以**（少见；正路是簇里另写一项） |

```ts
name: { component: ElInput }
// 省略：model = 'modelValue'，path = 'name'（控件键）

title: { component: ElInput, path: 'name', model: 'modelValue' }

timeRange: {
  component: DateRange,
  model: ['start', 'end'],
  path: ['startTime', 'endTime'],
}

agency: {
  component: AgencySelect,
  model: ['modelValue', 'option'],
  path: 'agencyId', // 只接到 modelValue；option 不绑表
}
```

单值用字符串，多绑定用数组，**按下标前缀对齐**：`path[i]` → `model[i]`。

- `path.length <= model.length`：多出来的口不绑表（组件可以有两个 v-model，本场只用一个）。
- `path.length > model.length`：没有对应的口，视为配置错误。
- 新口加在 `model` **后面** 才是加法；插到中间会错位，算 breaking。组件升级多一个 v-model 时，簇更新 `model`、已有短 `path` 不必改，使用方零改动。

### 2. 默认值

| 省略 | 默认 |
|------|------|
| `model` | `'modelValue'` |
| `path` | 控件键（如 `name`） |

只写 `model: ['modelValue', 'option']`、省略 `path` 时，默认只把第一个口接到控件键。要接满多口，显式写出等长的 `path` 数组。

### 3. 标签只覆盖 `path`

```vue
<User.TimeRange />
<User.TimeRange :path="['from', 'to']" />
```

不开放 `:model`。换 v-model 口等于换控件，应换 `component` 或换一项 control，而不是在标签上改协议。

`:path` 不是主路径：同一概念的两个数据位（行程时间 vs 签证时间）应在簇里两项，各自写死 `path`。标签覆盖只用于「就是这个控件，换一列键」。

不要用 `prop` 当数据位名字：`prop` 已是 ElFormItem 校验字段；多绑定时也不止一个 prop。内核校验挂载仍可用 `path` 的第一项（或单值）作为 FormItem `prop`。

### 4. 与列表行的关系

`users[i].name` 仍用嵌套 `FormView v-model="row"`，控件 `path` 仍是 `'name'`。`path` **不是** `'users.0.name'`，也不吃 `index`。

## 备选方案

1. **继续 `{ start: 'startTime' }` 对象映射**：配对显式，覆盖 path 时拆不开；已否。
2. **用 `prop` 代替 `path`**：和 Element 的 FormItem `prop` 撞名，多绑定语义不清；已否。
3. **标签同时覆盖 `model` 与 `path`**：控件协议被当场改掉，身份不稳；已否。
4. **禁止一切标签覆盖，换绑必须新开一项**：最干净，略烦；作为正路保留，`:path` 仅作逃逸。
5. **`model` 与 `path` 必须等长**：组件多一个 v-model 会迫使所有接线方补 `path`；已否。改为前缀接线。

## 后果

- **正向**：换数据位只动 `path`；`model` 留在控件身份上，和「不能在标签上换 component」一致。组件多口时 `path` 可只接前缀，升级加尾端口不强迫使用方改接线。
- **代价**：并行数组靠下标配对，写反会绑错；只绑非第一个口时要把该口放到 `model` 前面，或 `model` 里只写要接表的口。对象映射的显式配对换掉了。
- **关联**：控件主角见 [ADR-009](./009-controls-as-protagonist.md)；语义簇见 [ADR-010](./010-controls-as-semantic-cluster.md)。009 §6 以本文为准。
