# 适配任意 UI 库

formless 与 UI 库解耦的代价是：**你需要自己写一次适配**（几十行，项目级）。下面用 Element Plus 完整走一遍，Ant Design Vue / Naive UI 同理。

## 三步适配

一次适配做三件事，都在 `createFormView` 里完成：

```ts
export const FormView = createFormView({
  layout: { Row, Col, props: { column: 2 } },   // 1. 绑栅格
  form: { component: MyForm },                  // 2. 绑宿主 Form（含写口映射）
  item: { component: ElFormItem, props: ... },  // 3. 绑宿主 Item（含 prop 编码）
})
```

## 1. 绑栅格

直接把 UI 库的 Row / Col 传进去：

```ts
layout: { Row: ElRow, Col: ElCol, props: { column: 2 } },
```

无 Row/Col 的库通过适配对齐同一语义（布局引擎只关心「一个容器 + 一个可变宽的格子」）。

## 2. 绑宿主 Form（写口映射）

formless 的写口按「无前缀」规则以裸名 `modelValue` 落到宿主 Form。如果宿主 Form 的 model 口名不同（`ElForm` 叫 `model`），用一个 wrapper 映射：

```ts
const MyForm = defineComponent({
  inheritAttrs: false,
  props: { modelValue: { type: [Object, Array] as PropType<unknown>, default: undefined } },
  setup(props, { attrs, slots, expose }) {
    const form = ref<Record<string, unknown> | null>(null)
    expose(new Proxy({}, {
      get: (_, key) => {
        const inner = form.value
        if (inner == null) return undefined
        const value = Reflect.get(inner, key, inner)
        return typeof value === 'function' ? value.bind(inner) : value
      },
      has: (_, key) => form.value != null && key in form.value,
    }))
    return () => h(ElForm, { ...attrs, ref: form, model: props.modelValue }, slots)
  },
})
```

要点：

- wrapper 声明 `modelValue`，转发给宿主；
- `expose` 把宿主实例方法（`validate` / `resetFields` / …）透出给 FormView 的 ref 代理。

::: tip 工厂不再接受 form.props 函数
`createFormView` 的 `form.props` 已收敛为静态对象，写口映射只能走 wrapper（如上）。
:::

## 3. 绑宿主 Item（prop 编码）

```ts
function toItemProp(prop: FormFieldFormless['prop']): string | undefined {
  if (prop == null || prop.length !== 1) return undefined
  const [location] = prop
  return location == null ? undefined : toDotPath(location)
}

item: {
  component: ElFormItem,
  props: (fl: FormFieldFormless) => ({
    label: fl.label,
    prop: toItemProp(fl.prop),
  }),
}
```

- 内核绑定位置（`buyers[0].name`）需要编码成宿主 Item 认识的 `prop`（Element 是点分路径）。
- 单口 → 位置；多口一格 / 位置编不出来 → 返回 `undefined`（不绑，该格不参与宿主校验）。
- `fl.label` 来自你经 module augmentation 声明的 extras（见[module augmentation](/guide/module-augmentation)）。

## 校验投影

formless 的 `validation` / `fl:validate` 语义由适配层投影成宿主 `rules`。内核**不内置**规则编译器：

```ts
props: (fl) => ({
  label: fl.label,
  prop: toItemProp(fl.prop),
  rules: compileRules(fl),   // 你的实现：validation + fl:validate + 口值 → RuleItem[]
})
```

## 完整可运行示例

本站主题里的适配器就是完整实现（`.vitepress/theme/ep/form-view.ts`），随[示例](/examples/basic-form)一起跑。

## 下一步

- [module augmentation](/guide/module-augmentation) —— 声明 `label` / `validation` extras
- [函数式 props](/guide/functional-props)
