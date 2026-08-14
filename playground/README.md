# playground

Element Plus 基线表单 vs `vue-formless` 目标写法预演。

```bash
# 仓库根目录
pnpm i
pnpm dev
```

打开 http://localhost:5173 ，左侧选场景，顶部切换「Element 基线 / Formless 预演」。

## 说明

- `src/demos/baseline/*`：纯 Element Plus 手写样板
- `src/demos/formless/*`：`FormView` + `<User.Name />` 预演
- `src/bridge/ep.ts`：`createFormView({ Row, Col })` + `epField` / `EpInput`（component 内含 FormItem，吃 label/rules）
- `src/models/user.ts`：`createFormFields` 小驼峰 schema → `<User.Name />`
