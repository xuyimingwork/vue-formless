# playground

Element Plus 基线表单 vs `vue-formless` + `@vue-formless/element-plus` 一比一预演。

```bash
# 仓库根目录
pnpm i
pnpm dev
```

打开 http://localhost:5173 ，左侧选场景，顶部切换「Element 基线 / Formless 预演 / 平铺对比」。

## 说明

- `src/demos/baseline/*`：纯 Element Plus 手写样板
- `src/demos/formless/*`：本页 `createFormControls` + `FormView` / `EpInput` / `EpSelect`
- 未写 `placeholder` 时，封装层用 label 生成「请输入 / 请选择」
