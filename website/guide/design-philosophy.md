# 设计哲学

本节是 formless 设计决策的精炼，完整推演（每个方案「为什么这么做、否掉了什么」）见仓库 [docs/adr.md](https://github.com/xuyimingwork/vue-formless/blob/main/docs/adr.md) 与 [docs/design.md](https://github.com/xuyimingwork/vue-formless/blob/main/docs/design.md)。

## 问题：一个中后台表单组件为什么难维护

本质是**一个组件承载了变化频率不同的多种关注点**。formless 按变化频率拆三层、载体分离：

| 关注点 | 变化频率 | 载体 |
|--------|----------|------|
| 模型（View-Model） | 中 | 页级域表 `createFormFields(...)` |
| 布局（Layout） | 高 | Vue Template |
| 流程（Flow） | 低 | 页面 `setup`（拉详情、回填、联动、提交、DTO 适配） |

编排组件只做组合，不把三类逻辑揉进同一套样板标签。

## 布局要不要也用 Schema 描述

**不。** 只配置稳定的模型，不配置复杂布局 DSL。心智公式：

```text
配置（View-Model） + Template（排版） ≫ 完整 JSON 布局引擎
```

模板内可混写原生表单项作为逃生舱；栅格、间距、显隐可逐步做成轻量配置（`layout-item:` / `layout:`），但不以运行时 JSON 吞掉全部排版与交互。

## 动态性从哪来

默认面向**编译期 / 源码期复用**（Build-time Low-Code / GitOps）：可视化配置 → 生成代码 → Git → CI/CD。生成物就是普通的域表 / `UserForm.vue`，AST 友好、可读、可 PR、可 `git revert`。

只在明确真需求（SaaS 多租户扩展字段、秒级生效问卷）再引入运行时 JSON 子集，与静态 Fields 组合，而不是替换整套架构。

## 配置的最小单元

**View-Model 控件（Field），不是数据库列。**

- `addressId` 默认绑 `AddressSelect`，在域表配一次；
- 日期范围是**一颗控件**对应两（多）个持久化字段；
- 校验分两层：随控件的 `validation`（会什么）+ 随场景的 `fl:validate`（这场怎么跑）。

## 主角是谁、键跟谁走

- 主角是**可摆放单元 Field**；键跟**控件名**（`agency`）不跟 DTO（`agencyId`）。
- 域表默认**页级**；跨页默认复用的是**控件实现 + 绑定通道**，不是整张表。
- **列表 = 一层 FormView + 单元格 `:fl:prop`**。

## 词表：两套平行叙事

```text
布局                表单
LayoutView          FormView
LayoutItem          FormField
```

- `FormView` 包宿主 ElForm + 页级 LayoutView。
- `FormField` 是一格表单 UI 兼绑定单元。
- **`FormItem` 一词只留给宿主 ElFormItem**，不再是内核组件名。
- **`control`** = 被 FormField 消费的那颗输入组件，只谈 v-model。

## 三条不变的原则

1. **控件主角**：可摆放单元是 Field，键是控件名不是 DTO 字段名。
2. **formless 只跟自己的壳交互**：内核只见 LayoutView / LayoutItem / 宿主 Item，不见 Row/Col。
3. **写口就是 v-model**：FormView 以 Vue 常规 `v-model` 接入可写状态。

## 下一步

- [已知边界](/guide/boundaries) —— 未落地与已否的方案
- [与其他方案对比](/guide/comparison)
