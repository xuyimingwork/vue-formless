# module augmentation

formless 内核**不预声明** `label` / `validation` 等业务语义，它们经 module augmentation 扩展，声明在**唯一锚点** `FormFieldCustomOptions` 上。

## 声明 extras

```ts
declare module 'vue-formless' {
  interface FormFieldCustomOptions {
    label?: string
    validation?: ValidationSpec
  }
}
```

声明后，`label` / `validation` 会自动流进三个地方：

1. **工厂入参**：`createFormFields({ name: { label: '姓名', ... } })`
2. **快照**：`fl.label` 在 `item.props` / control `props` 函数里可用
3. **标签 props**：`<User.Name fl:label="姓名" />`（`ToFormlessProps` 自动加 `fl:` 前缀）

## 为什么只有一个锚点

`FormFieldCustomOptions` 与 Vue 原生 `ComponentCustomOptions` 同形，**同时就是 extras 域本身**：

```ts
interface FormFieldCustomOptions {}        // extras 域
interface CreateFormFieldOptions extends FormFieldCustomOptions {
  // 内核键：component / props / model / prop / item / field / name
}
interface FormFieldFormless extends FormFieldCustomOptions {
  // 归一化四键：model / prop / field / item
}
```

`CreateFormFieldOptions extends FormFieldCustomOptions` 把 extras 并进工厂入参，`FormFieldFormless extends FormFieldCustomOptions` 把 extras 流进快照。不再有 `Omit` 派生的 extras 别名，也不会有「多个锚点靠手工同步漂移」的问题。

## 内核只读核心键

内核只读 `component` / `model` / `props` / `prop` / `item` / `field`，其余 schema 键与 `fl:*` extras **不解释**——它们进 Item / control 转化函数的 snapshot，由你的适配层决定怎么用。

## 快照是封闭形状

`FormFieldFormless` 显式声明内核四键 + 经锚点声明的 extras，**不开索引签名**。读未声明的键直接编译报错：

```ts
props: (fl) => ({
  label: fl.label,   // ✅ 已声明
  // foo: fl.foo,    // ❌ 编译报错：FormFieldFormless 上没有 foo
})
```

只有声明态 `FormFieldFormlessRaw`（`FormField` / `FormItem` 的 `fl` prop）开索引签名——预设或标签可以带内核不读的键。

## 完整示例

本站主题里的声明（`.vitepress/theme/ep/vue-formless-aug.ts`）：

```ts
declare module 'vue-formless' {
  interface FormFieldCustomOptions {
    label?: string
  }
}
```

## 下一步

- [组合体控件](/guide/compound-controls) —— 另一个 augmentation：`ComponentCustomOptions.formless`
- [函数式 props](/guide/functional-props) —— extras 怎么进快照、怎么投影
