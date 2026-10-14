# 校验

校验分「身份」与「策略」两层，避免把「这个输入会什么」和「这场怎么跑」焊死。

## 身份：`validation`（写在域表）

`validation` 是**这个输入会什么**——随控件走，是身份的一部分：

- `empty`：空值判定（怎么算「空」）
- `format`：格式校验

::: warning 不是 ElForm RuleItem[]
`validation` 的形状**不是** `RuleItem[]`，**不得**写 `required: true` / `trigger`，也不叫 `rules`。它是 formless 语义，由适配层投影成宿主 `rules`。
:::

## 策略：`fl:validate`（写在标签）

`fl:validate` 是**这场怎么跑**——随场景走：

| 值 | 含义 |
|----|------|
| `'required'` | 空值 + 格式都校 |
| 不写 = `'optional'` | 空不报，有值仍校格式 |
| `'none'` | 本场不跑 |

筛选与编辑可点**同一套** `<User.Mobile />` 而策略不同：

```vue
<!-- 编辑：必填 -->
<User.Mobile fl:validate="'required'" />
<!-- 筛选：可空 -->
<User.Mobile />
```

## 宿主校验：`item:rules`

上面的 `validation` / `fl:validate` 是 formless 语义，由**适配层**投影。真正落到 `ElFormItem` 的规则数组，你也能直接经 `item:` 通道传：

```vue
<User.Name :item:rules="[{ required: true, message: '请输入姓名', trigger: 'blur' }]" />
```

这是「机械覆盖」——直接盖宿主 Item 的 `rules`，不经过 formless 的语义层。适合快速写死，但丢失了「身份 / 策略分离」的复用收益。

## 多口控件的宿主校验

多口一格（如日期范围）时，一个宿主 `prop` 装不下多个口，适配层会**不绑** `prop`（`undefined`）——该格不参与宿主 `validate` / `resetFields`。

要宿主校验，就把口拆成格（`fl:field="wrap-embed"`，每格各一个口）。详见[多口控件](/guide/multi-port-controls)。

## 整表 validate

整表 `validate()` 走 FormView 的 ref（代理内层 Form）：

```ts
await formRef.value?.validate()
```

`v-model` 仍是 DTO，校验袋在宿主 Form 上。

## 下一步

- [module augmentation](/guide/module-augmentation) —— 声明 `validation` / `label` 等 extras
- [函数式 props](/guide/functional-props) —— 快照 → 宿主 `rules` 的投影
