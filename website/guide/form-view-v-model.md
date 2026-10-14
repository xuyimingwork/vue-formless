# FormView 与 v-model

`FormView` 是表单根：v-model 接入可写状态，可选宿主 Form，页级 LayoutView。

## 根 v-model 是唯一写入点

`<User.Name />` **不**在模板绑 v-model。`FormView` 是唯一写入点：

```text
control 触发 update:port(value)
  → access.update(prop)          // 由最近 FormView 提供
  → setIn(prop, value)           // 不可变写：克隆沿途每一层
  → 同 tick 合并 patch
  → emit('update:modelValue', next)
```

- **不可变**：`setIn` 永不 mutate 源对象，克隆沿途每层（数组 `[...arr]`、对象 `{...base}`）。
- **同 tick 合并**：多个字段同 tick 写入合并成一次 emit。
- **单一写通道**：整棵子树只有一个写入口，只有 owner 层 emit。

## 控制权归属

FormView 的数据控制权按三种情况判定：

| 配置 | 归属 |
|------|------|
| 配了 `:model-value` | **受控**——按传入数据渲染，值从外部来 |
| 没配、但有上层 FormView | **继承上层**——用上层 FormView 的读 / 写源 |
| 没配、也没上层 | **本地变量**——控制权在 FormView 自身 |

```vue
<!-- 受控 -->
<FormView :model-value="form" @update:model-value="form = $event" />

<!-- 本地数据模式（根，未绑 v-model） -->
<FormView />
```

::: tip listener-only 合法
根上只要有 `modelValue` 或 `onUpdate:modelValue` 任一键即可，值可为 `undefined`。
:::

## `validate` / `resetFields` 走 ref

FormView `expose` 一个 Proxy，把宿主 Form 实例的方法（`validate` / `resetFields` / …）透出：

```vue
<script setup lang="ts">
import { ref } from 'vue'
import type { FormInstance } from 'element-plus'
import { FormView } from './form-view'

const formRef = ref<FormInstance>()
const form = ref({ name: '' })

async function onSubmit() {
  await formRef.value?.validate()
}
</script>

<template>
  <FormView ref="formRef" v-model="form" fl:layout>
    <User.Name />
  </FormView>
</template>
```

`formRef` 的类型用 UI 库自己的 `FormInstance`（这里是 Element Plus），因为透出的是内层宿主 Form 的真实实例方法。

## 嵌套 FormView 继承

嵌套 FormView **未绑** `modelValue` / `onUpdate:modelValue` 两键时，继承祖先的读 / 写源，路径始终相对同一个根。详见[嵌套 FormView](/guide/nested-form-view)。

## 下一步

- [model 与 prop](/guide/model-and-prop) —— 绑定维度的两个概念
- [数据流](/guide/data-flow) —— 读 / 写的完整路径
