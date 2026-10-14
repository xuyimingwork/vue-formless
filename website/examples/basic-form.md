---
title: 基础表单
---

<script setup>
import BasicUserForm from './demos/BasicUserForm.vue'
</script>

# 基础表单

域表 + FormView + 校验的完整可运行示例。左上角是实时渲染，可交互。

<BasicUserForm />

## 关键点

- `fl:layout` 开启栅格，密度取工厂默认（`column: 2` = 一行两列）。
- `:item:rules` 是 `item:` 通道，越过 control 落到宿主 `ElFormItem`。
- `label-width="96px"` 裸名落到宿主 `ElForm`。
- `User.Remark` 用 `layout-item:span="max"` 独占整行。

## 源码

<<< @/examples/demos/BasicUserForm.vue

域表 `User` 定义见 [demos/user.ts](https://github.com/xuyimingwork/vue-formless/blob/main/playground/src/demos/formless/user.ts)，适配器见[适配任意 UI 库](/guide/adapt-ui-libs)。
