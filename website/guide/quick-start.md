# 快速上手

从零到跑通一个「姓名 + 手机号」表单，一共三步：绑宿主、建域表、写模板。

## 1. 绑宿主（一次，项目级）

formless 不内置宿主组件，先绑一次 Element Plus 的 Form / Item / Row / Col。

需要注意两个映射：

1. **`MyForm` 承接写口**：formless 的写口按「无前缀」规则以裸名 `modelValue` 落到宿主 Form，而 `ElForm` 的 model 口叫 `model`，所以用一个 `MyForm` 包住 `ElForm` 完成映射，并把 `validate` / `resetFields` 透出给 FormView 的 ref。
2. **`toEpItemProps` 编码 `prop`**：内核的绑定位置（如 `buyers[0].name`）用点分路径表达，`ElFormItem` 的 `prop` 需要点分形式，由适配层自己编码。

```ts
// form-view.ts
import { ElCol, ElForm, ElFormItem, ElRow } from 'element-plus'
import { defineComponent, h, ref, type PropType } from 'vue'
import { createFormView, type FormFieldFormless } from 'vue-formless'

function toDotPath(path: string): string | undefined {
  if (!path || path.startsWith('.') || path.endsWith('.')) return undefined
  const dotted = path.replace(/\[(\d+)\]/g, '.$1').replace(/^\./, '')
  if (/[[\]]/.test(dotted) || dotted.includes('..')) return undefined
  return dotted
}

function toItemProp(prop: FormFieldFormless['prop']): string | undefined {
  if (prop == null || prop.length !== 1) return undefined
  const [location] = prop
  return location == null ? undefined : toDotPath(location)
}

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

export const FormView = createFormView({
  layout: { Row: ElRow, Col: ElCol, props: { column: 2 } },
  form: { component: MyForm },
  item: {
    component: ElFormItem,
    props: (fl: FormFieldFormless) => ({
      label: fl.label,
      prop: toItemProp(fl.prop),
    }),
  },
})
```

## 2. 建域表（声明语义输入簇）

```ts
// user.ts
import { ElInput } from 'element-plus'
import { createFormFields } from 'vue-formless'

export const User = createFormFields({
  name: { label: '姓名', component: ElInput },
  mobile: { label: '手机', component: ElInput },
})
```

`createFormFields` 把域表键转成 PascalCase 的命名空间 Field 组件：`name` → `<User.Name />`、`mobile` → `<User.Mobile />`。

## 3. 写模板

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { FormView } from './form-view'
import { User } from './user'

const form = ref({ name: '', mobile: '' })
</script>

<template>
  <FormView v-model="form" fl:layout label-width="96px">
    <User.Name />
    <User.Mobile :item:rules="[{ required: true, message: '请输入手机号', trigger: 'blur' }]" />
  </FormView>
</template>
```

- `v-model="form"` 是唯一写入点：控件的值经 `access(prop).update()` 上报 → FormView 同 tick 合并 → `emit('update:modelValue', next)`。
- `fl:layout` 开启内置 24 栅格，密度由工厂 `layout.props.column` 决定（这里 `column: 2` = 一行两列）。
- `:item:rules` 是 `item:` 通道，越过 control 直接落到宿主 `ElFormItem` 的 `rules`。

## 完整最小示例

本站示例里的[基础表单](/examples/basic-form)就是这份代码的可运行版本。

## 下一步

- [FormView 与 v-model](/guide/form-view-v-model) —— 写口、受控、本地数据模式
- [创建域表](/guide/create-form-fields) —— `component` 只接输入、`label` 等 extras 怎么声明
- [配置通道](/guide/channels) —— 前缀路由体系
