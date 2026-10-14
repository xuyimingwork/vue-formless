# 安装

## 前置要求

- Vue `^3.3.0`（peer dependency）
- Node `>= 18`

## 安装 vue-formless

```bash
pnpm add vue-formless
# 或
npm i vue-formless
# 或
yarn add vue-formless
```

`vue-formless` 只声明了 `vue` 一个 peer dependency。UI 库（如 Element Plus）需要你自己安装并在项目里绑定，formless 不内置任何宿主组件。

## 没有官方适配包

formless **没有**官方 Element / Ant 适配包——你需要在自己的项目里绑一次宿主：

```ts
import { createFormView } from 'vue-formless'
// ...见「快速上手」
```

这是刻意的设计：适配是一次性的、项目级的（几十行），换来的是 formless 与任何 UI 库解耦。参见[适配任意 UI 库](/guide/adapt-ui-libs)。

## 仓库结构

```text
packages/vue-formless        # 内核（npm：vue-formless）
packages/layout              # 内部 24 栅格，打进内核 dist，不单独发布
playground                   # Element Plus 基线 vs Formless 对照
playground-layout            # 24 格布局工作台
website/                     # 本网站（VitePress）
docs/                        # 设计规格 / ADR（canonical 文档）
```

## 从源码使用（贡献 / 本地调试）

本仓库是 pnpm monorepo，`website` 与 `playground` 通过 Vite alias 直接指向内核源码：

```bash
pnpm i
pnpm dev                 # 启动 playground（基线 vs formless 对照）
pnpm docs:dev            # 启动本站文档（VitePress）
pnpm build               # 构建库
pnpm test                # 跑测试
pnpm typecheck           # 类型检查
```

## 下一步

- [快速上手](/guide/quick-start) —— 绑宿主、建域表、跑通第一个表单
