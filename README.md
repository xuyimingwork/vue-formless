# vue-formless

简体中文 | [English](./README.en.md)

> Vue 3 表单组合式库：控件表 + FormView，布局与输入拆开。当前 **0.1.1**，`0.x` 期间 API 仍可能调整。

同一套混合布局：左边手写 Element Row/Col/Item，右边 `<User.*>` + 嵌套 `FormView` 换密度。

![混合布局代码对照](./docs/mixed-layout-code.png)

Playground 平铺对比（布局对齐）：

![混合布局平铺对比](./docs/mixed-layout-preview.png)

```bash
pnpm add vue-formless
# 或 npm i vue-formless
```

peer：`vue` ^3.3。

## 用法

项目里绑一次宿主（无官方 Element 适配包）：

```ts
import { ElCol, ElForm, ElFormItem, ElInput, ElRow } from 'element-plus'
import { createFormControls, createFormView, resolveFormItemProp, type ItemFl } from 'vue-formless'

declare module 'vue-formless' {
  interface ControlSchema {
    label?: string
  }
}

export const FormView = createFormView({
  layout: { Row: ElRow, Col: ElCol, column: 2, gutter: 16 },
  form: {
    component: ElForm,
    props: (fl) => ({ model: fl.modelValue }),
  },
  item: {
    component: ElFormItem,
    props: (fl: ItemFl) => ({
      label: fl.label,
      prop: resolveFormItemProp(fl.binding, fl.controlKey),
    }),
  },
})

export const User = createFormControls({
  name: { label: '姓名', component: ElInput },
})
```

```vue
<FormView ref="formRef" v-model="form" fl:layout label-width="96px">
  <User.Name />
  <User.Name col:span="max" />
</FormView>
```

`validate()` / `resetFields()` 走 FormView 的 ref（代理内层 Form）。栅格细节见 [docs/adr](./docs/adr/README.md)。

## 仓库结构

```text
packages/vue-formless              # 内核（npm：vue-formless）
packages/layout                    # 内部栅格，打进内核 dist
playground                         # Element Plus 基线 vs Formless
docs/adr                           # 架构决策
```

## 开发

```bash
pnpm i
pnpm dev          # 启动 playground
pnpm build        # 构建库
pnpm test
pnpm typecheck
```

Playground 对照：基础表单、筛选条、只读详情、混合布局、DateRange。

```bash
pnpm playground
# http://localhost:5173
```

## License

[MIT](./LICENSE)
