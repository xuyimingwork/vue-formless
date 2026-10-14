# 创建域表

`createFormFields` 声明**一簇逻辑上相关的语义输入**，产出 PascalCase 的命名空间 Field 组件表。

## 基本用法

```ts
import { ElInput, ElSelect } from 'element-plus'
import { createFormFields } from 'vue-formless'

const User = createFormFields({
  name: { label: '姓名', component: ElInput },
  gender: {
    label: '性别',
    component: ElSelect,
    props: { options: genderOptions },
  },
})
```

模板里：

```vue
<User.Name />
<User.Gender />
```

## 它是什么、不是什么

`createFormFields` 等价于前端一个 `user/` 目录的便宜写法——**有名字的输入，还不是一张表单**。它补的是中间层：

| 在域表里 | 不在域表里 |
|----------|-----------|
| 谁、怎么画（`component` / 默认 `props`）、`model`、默认 `prop`、默认 `label` | 控件间联动、**本场策略**、跨控件规则、布局（span / Col） |
| `validation`：这个输入会什么（空值判定、格式、文案） | |

域表里不写死本场必填、不写 `dependsOn`（联动）、不写布局——那些属于模板（布局）与 `setup`（流程）。

## 键名归一化

键可写 camelCase（`timeRange`）或 kebab-case（`time-range`），两者先 `toCamel` 再 `upperFirst` 成标签名：

```ts
createFormFields({
  timeRange: { /* ... */ },
  'time-range': { /* ... */ },  // 与上面落到同一个 <User.TimeRange />
})
```

::: warning 归一化只作用于标签名
默认 `prop` 仍是键**原样**——域表不解释位置。kebab 键要绑数据必须显式 `fl:prop`（`parsePath` 不接受不加引号的 `-`）。详见 [model 与 prop](/guide/model-and-prop)。
:::

## 每一项的声明（`CreateFormFieldOptions`）

```ts
createFormFields({
  fieldKey: {
    component: ElInput,          // 本格 control（只接输入）
    props: { placeholder: '...' }, // 输入的默认 props（静态或快照函数）
    model: 'modelValue',          // v-model 口名（默认 'modelValue'）
    prop: 'name',                 // 位置（默认 = 域名表的键原样）
    item: true,                   // 是否渲染宿主 ElFormItem 壳
    field: 'auto',                // 组装位置
    label: '姓名',                // extras：经 module augmentation 声明
  },
})
```

完整字段说明见 [API：createFormFields](/api/create-form-fields)。

## `component` 只接输入

`component` 指向的组件**只接输入**（可带业务 `props` / 自己的插槽 / 事件），**不含** FormItem / Col——那些壳由 formless 组装。想包一层 FormItem 再进域表，是常见的误区（接入税高）。

## 命名空间的意义

工厂按**领域实体**重命名导出，`name` → `<User.Name />`。这样：

- 保留「属于某模型」的锚点，不与 UI 组件撞名；
- 域表默认跟页走，跨页默认复用的是**控件实现 + 绑定通道**，不是整张 `User` 表（见 [定制路径](/guide/customization)）。

## 下一步

- [FormView 与 v-model](/guide/form-view-v-model)
- [命名空间 Field](/guide/named-field-tags)
