# vue-formless 设计决策

> 单篇汇总，取代原 `docs/adr/` 里的 22 篇 ADR。
> 正文按**当前代码 + [`design.md`](./design.md)** 的口径写：**解决方式** = 现行结论；**废弃** = 设计时被否掉、或后来退场的方案，只为留证。
> 术语一律用最终态（`FormField` / `LayoutItem` / `fl:` / `layout-item:` / `layout:` / `item:`）。历史词表见每节「废弃」。

---

## 一、定位与分层

### 问题 1：一个中后台表单组件为什么难维护，关注点怎么拆？

**解决方式**：本质是**一个组件承载了变化频率不同的多种关注点**，按变化频率拆三层、载体分离：

| 关注点 | 变化频率 | 载体 |
|--------|----------|------|
| 模型（View-Model） | 中 | 页级域表 `createFormFields(...)`（页面 `setup` 或与 SFC 成对的 `*.controls.ts`） |
| 布局（Layout） | 高 | Vue Template |
| 流程（Flow） | 低 | 页面 `setup`（拉详情、回填、联动、提交、DTO 适配） |

编排组件只做组合，不把三类逻辑揉进同一套样板标签。

**废弃**：
- 废弃一：单文件大而全 `UserForm.vue`（改一处布局牵动整个文件）。
- 废弃二：只拆 `UserForm` + `UserFormUI`（边界仍模糊，易再耦合流程与布局）。
- 废弃三：全量 JSON Schema 引擎（把三层都塞进配置，见问题 2）。

### 问题 2：布局要不要也用 Schema 描述？

**解决方式**：不。**只配置稳定的模型（字段 ↔ 默认 control / 元数据），不配置复杂布局 DSL**，布局权力交还 Vue Template。心智公式：

```text
配置（View-Model） + Template（排版） ≫ 完整 JSON 布局引擎
```

模板内可混写原生表单项作为逃生舱；栅格、间距、显隐等可逐步做成轻量配置（`layout-item:` / `layout:`），但**不以运行时 JSON 吞掉全部排版与交互**。

**废弃**：
- 废弃一：全量 Schema 驱动（JSON 里同时描述字段、布局、联动，甚至用 Void 虚节点做卡片/行列）。
- 废弃二：纯手写 Template（样板与重复绑定最多，领域模型无法单点复用）。
- 废弃三：仅 `items` 数组 + 单一 `DynamicForm`（显示隐藏进 setup，template 空壳，布局仍不自由）。

### 问题 3：动态性从哪来——运行时 JSON 下发，还是编译期？

**解决方式**：默认面向**编译期 / 源码期复用（Build-time Low-Code / GitOps）**：可视化配置 → 生成代码 → Git → CI/CD。生成物就是普通的域表 / `UserForm.vue`，AST 友好、可读、可 PR、可 `git revert`。只在明确真需求（SaaS 多租户扩展字段、秒级生效问卷等）再引入运行时 JSON 子集，与静态 Fields 组合，而不是替换整套架构。

**废弃**：
- 废弃一：运行时全量 JSON 引擎（换来类型丢失、调试困难、布局 DSL 膨胀）。
- 废弃二：后台改配置触发前端自动改代码并部署——可作为工程配套，但不必塞进运行时内核。

---

## 二、表达与词表

### 问题 4：模板里字段怎么表达？

**解决方式**：工厂生成**命名空间 Field 组件**，按领域实体重命名导出（`name` → `<User.Name />`）：

```ts
const User = createFormFields({ name: { component: ElInput, label: '姓名' } })
```

```vue
<User.Name fl:validate="'required'" layout-item:span="24" />
```

- 域表键可写 camelCase（`timeRange`）或 kebab（`time-range`）；两者先 `toCamel` 再 `upperFirst` 成标签名（`<User.TimeRange />`）。**归一化只作用于标签名**，默认 `prop` 仍是键原样。
- 顶层 attrs / 事件 / 无前缀槽给 control；Item 走 `:item:` / `@item:` / `` #[`item:...`] ``。

**废弃**：
- 废弃一：统一 `<Field name="x" />`（信息密度低，像填 XML 属性）。
- 废弃二：解构字段组件 `const { Name } = Fields`（丢「属于某模型」的锚点，易与 UI 组件撞名）。
- 废弃三：JSX/TSX 动态属性组件（偏离多数 Vue SFC 习惯，不作默认路径）。
- 废弃四：Schema 直接写 PascalCase 键（与 model / JSON 不一致，双份键名）。

### 问题 5：配置的最小单元是什么——DB 字段还是控件？

**解决方式**：**View-Model 控件（Field），不是数据库列**。`addressId` 默认绑 `AddressSelect`，应在域表配一次；日期范围是**一颗控件**对应两（多）个持久化字段。校验分两层：随控件的 `validation`（这个输入会什么）+ 随场景的 `fl:validate`（这场怎么跑）。控件表默认跟页走，跨页共享降为 opt-in（问题 6）。

**废弃**：
- 废弃一：严格 1:1 DB 字段 Schema（Range / 复合控件与跨字段回填别扭）。
- 废弃二：布局配置里每次写 component 绑定（重复，违背「默认绑定」收益）。
- 废弃三：把流程 Adapter 塞进字段组件（渲染层掺入协议转换）。

### 问题 6：主角是谁、键跟谁走、列表怎么办？

**解决方式**：

- **主角是可摆放单元 Field**；键跟**控件名**（`agency`）不跟 DTO（`agencyId`）：`<User.Agency />` ✅ / `<User.AgencyId />` ❌。
- **域表默认页级**（页面 `setup` / `*.controls.ts`）；跨页默认复用的是**控件实现 + 绑定通道**，不是整张 `User` 表。
- **列表 = 一层 FormView + 单元格 `:fl:prop`**：`` :fl:prop="`buyers[${$index}].name`" ``；根为数组时 `` :fl:prop="`[${$index}].name`" ``。

**废弃**：
- 废弃一：领域级 `createFormFields` + `User.AgencyId`（与接口 1:1，改一处全跟着动）。
- 废弃二：渲染期 `:component` / `:formless.component` 当一等换绑（先点名再整颗替换，冲淡 `<User.Agency />`）。
- 废弃三：控件身份里写死 `users[i].name`（下标属于这一场的行）。
- 废弃四：`useFormControls`（暗示必须在 setup 调且每次重建，误导生命周期）。
- 废弃五：嵌套 `FormView v-model="users[i]"`（绕过数组 v-model 入口）；也不要绑只读的 slot `row`。

### 问题 7：工厂（域表）到底是什么，写什么、不写什么？

**解决方式**：`createFormFields` = **快捷声明一簇逻辑上相关的语义输入**（命名 + 默认画法 + 默认绑定 + 默认 label + `validation`），等价于前端一个 `user/` 目录的便宜写法。它补的是中间层：有名字的输入，**还不是一张表单**。

| 在域表里 | 不在域表里 |
|----------|-----------|
| 谁、怎么画（`component` / 默认 `props`）、`model`、默认 `prop`、默认 `label` | 控件间联动、**本场策略**、跨控件规则、布局（span / Col） |
| `validation`：这个输入会什么（空值判定、格式、文案） | |

**废弃**：
- 废弃一：一格一个 SFC（`user/NameInput.vue` …）——复用最干净但文件税不可接受，工厂就是这个文件夹的便宜写法。
- 废弃二：整张 `UserForm` + props 开关（复用边界错误）。
- 废弃三：Formily 式 reaction / 在域表写死本场必填 / `dependsOn`（把簇重新做成表单 schema）。
- 废弃四：不为中间层提供工厂，业务自己拼（gap 仍在）。

### 问题 8：词表怎么定，`FormItem` 还指什么？

**解决方式**：布局 / 表单两套平行叙事：

```text
布局                表单
LayoutView          FormView
LayoutItem          FormField
```

- `FormView` 包宿主 ElForm + 页级 LayoutView；`FormField` 是**一格表单 UI 兼绑定单元**（`LayoutItem` + 可选宿主 ElFormItem + control）。
- **`FormItem` 一词只留给宿主 ElFormItem**，不再是内核组件名。
- **`control`** = 被 FormField 消费的那颗输入组件（schema `component` / `fl:component`），只谈 v-model；`component` 只作键名，不作名词。

**废弃**：
- 废弃一：`FormCell` / `FormItem` 拆两层（词表冗余；「cell / item / field」三词互相打架）。
- 废弃二：`LayoutCell`（cell 一词歧义，`LayoutItem` 更准）。
- 废弃三：拿 HTML / MUI 的 FormControl 当公开主词（与 HTML `form control` 相反，也与 MUI FormControl 不齐）。

### 问题 9：类型名怎么起？

**解决方式**：命名法 = **Scope + Role**。Scope 只用四个概念词 `FormView` / `FormItem` / `FormField` / `FormControl`（配置域另用 `Formless`）；前缀写 Scope、后缀写 Role。

- **只有「解析前与解析后类型不同」才成对**，解析后用原词、解析前加 `Raw`：`FormFieldFormless(Raw)`、`FormFieldVModel(Raw)`、`FormFieldProp(Raw)`、`FormFieldFormlessField(Raw)`。`item` 进出自 boolean，**不成对**。
- `createXxx` 的入参一律 `Create<Xxx>Options`。
- extras 的 module augmentation **唯一锚点** = `FormFieldCustomOptions`（与 Vue `ComponentCustomOptions` 同形，**同时就是 extras 域本身**）；`CreateFormFieldOptions extends` 它，extras 顺带流进快照与标签。
- `FormControl*` 只是类型前缀；**概念词 `control` 不变**。

**废弃**：
- 废弃一：`FieldSchema` / `FieldSchemaInput` / `FieldFactoryInput` 三套名字（其实是同一个形状）。
- 废弃二：`ItemFl` / `ControlVModel` / `ControlProp` / `FieldMode` / `FlExtraProps` 各写各的前缀。
- 废弃三：`FormFieldExtras` / `FormFieldKernelKeys`（与 `CreateFormFieldOptions` 靠手工同步，加内核键时静默漂移）。

---

## 三、绑定与写口

### 问题 10：表单数据以什么进 Context，谁是写入点？

**解决方式**：

- 根组件 `FormView` 用 Vue 常规 **`v-model`**（顶层 `modelValue` / `onUpdate:modelValue`），不是 `v-model:fl` / `fl.modelValue`。
- `<User.Name />` **不**在模板绑 v-model；`FormView` 是唯一写入点：control 经 `access(prop).update(value)` 上报 → FormView 同 tick 合并 patch → `emit('update:modelValue', next)`。
- 写入全程**不可变**（`setIn` 克隆沿途每层），**单一写通道**，只有 owner 层 emit。
- 根必须绑 v-model（vnode 有 `modelValue` 或 `onUpdate:modelValue` 任一键即可，值可为 `undefined`，listener-only 合法）。

**废弃**：
- 废弃一：根上单向 `:model` 对齐 ElForm（ElForm 的 `:model` 是校验袋，不是本库写口）。
- 废弃二：就地改 `modelValue.xxx`、不 emit（改动绕过 v-model）。
- 废弃三：每次 `update` 立刻 `{ ...props.modelValue, [k]: v }` 并 emit（同 tick 两次 emit 时 props 仍是旧对象，先写的键会丢）。
- 废弃四：闭包绑定 model（`useFields(schema, model)` 每次生成带数据的组件，Fields 无法静态复用）。
- 废弃五：Hook 同时返回 `Form` + `Fields`（容器与模型越界耦合）。

### 问题 11：绑定的两个维度怎么拆？

**解决方式**：

| 字段 | 含义 | 谁回答 |
|------|------|--------|
| **`model`** | control 的 v-model 口名（默认 `'modelValue'`；多口 `['start','end']`） | 本格声明 / control 静态 `formless.model` |
| **`prop`** | 从 FormView 根到叶子的**位置**（`name` / `buyers[0].name`） | 自有 `fl:prop`，或祖先身份根 `getProp(model)` |

- `model[i] ↔ prop[i]` **按下标对齐**，`prop` 不长于 `model`，多出来的口不绑表。
- **两级分轴**：`model → prop`（`getProp`，最近的身份根 FormField 回答）再 `prop → (value, update)`（`access`，最近的 FormView 回答）。组合体内层格`<FormField fl:model="start">`在祖先已声明口里**选口**（选择 ≠ 覆盖）。
- 工厂壳**只锁 `component`**（`schema.component ?? 标签.fl:component`）；`model` / `prop` / `item` / `field` 都是「近的赢」，标签可覆盖 schema。

**废弃**：
- 废弃一：独立 `path`（导航）+ 叶子 `prop` 两套（多一个配置位，没多出能力）。
- 废弃二：`prop` 数组 type 当路径段（与多口 `prop` 数组撞车）。
- 废弃三：`Path` 包裹组件 provide 前缀（`:fl:prop` 已够）。
- 废弃四：`model` 锁在身份上、标签不能改（现行：除 `component` 外均可覆盖）。

### 问题 12：`prop` 路径语法与读写容错？

**解决方式**：

```text
name            对象键
[0]             数组下标（唯一写法）
map.0.name      数字键 map（.0 是对象键，不是下标；[n] 与 .n 永不互指）
map["a.b"].x    引号段全称逃逸（可承载任意字符串键：空白、. / []、空串；\ 转义）
```

- 读取只认**自有属性**（`hasOwnProperty.call`），原型链不是数据。
- **读写不 throw、不 warn**：`parsePath` 失败返回 `undefined`；读侧错配读作 `undefined`；写侧「形状匹配即合并、不匹配即覆盖」。
- 宿主 Item `prop` 不由内核决定，怎么编码是适配层的私事（见问题 24）。

**废弃**：
- 废弃一：`.` 数字与 `[n]` 互指。
- 废弃二：非法路径 / 形状错配时 throw 或 warn。
- 废弃三：把原型链上的 `constructor` / `__proto__` 当数据读。

---

## 四、组装与校验

### 问题 13：怎么合成一棵 DOM，`component` 接什么？

**解决方式**：

```text
FormView 包裹：ElForm?、LayoutView?
FormField 包裹：LayoutItem → ElFormItem? → control（LayoutView 仅 wrap-embed 内层）
```

- 组树顺序由 **formless 决定**，适配只转发 slot、**不得 `if` 丢掉 default**。
- **`component` 只接输入**（可带业务 `props` / 自己的插槽 / 事件），**不含** FormItem / Col。
- **Form / Item 挂 `createFormView` 工厂**（项目级一次），内核填 default slot。
- 无 Form / 无 Item / 无 Col 时，内核**不 `h()` 那一层**（工厂不传、`:fl:item="false"`、`:fl:form="false"`、不开 `fl:layout`）。
- `validate()` / `resetFields()` 走 FormView `expose`（代理内层 Form）。

**废弃**：
- 废弃一：`epField(ElInput)` 把 FormItem 焊进每颗 `component`（接入税高）。
- 废弃二：control 上直接写 ElForm `rules` 数组。
- 废弃三：顶层保留字 `required` / `span` 占输入自己的 props。
- 废弃四：公开 `FormLayout` / `FormView.Layout`（简单表会 FormView / ElForm / FormLayout 套娃）。
- 废弃五：页面 `v-slot="{ model }"` 手写 `el-form`（多一份绑定、易绑回 DTO）。

### 问题 14：校验怎么分「身份」与「策略」？

**解决方式**：

- **静态 `validation`**（写在域表，是身份）：这个输入**会什么**——`empty`（空值判定）/ `format`（格式）。形状**不是** ElForm `RuleItem[]`，**不得**写 `required: true` / `trigger`，也不叫 `rules`。
- **本场策略 `:fl:validate`**（写在标签）：`'required'`（空值 + 格式）/ 不写 = `'optional'`（空不报，有值仍校格式）/ `'none'`（本场不跑）。
- 筛选与编辑可点**同一套** `<User.Mobile />` 而策略不同。适配 Item 把「快照 + 策略」投影成宿主 props / rules。

**废弃**：
- 废弃一：规则体与本场必填焊成同一份 ElForm `RuleItem`（筛选和编辑无法共用一套控件）。
- 废弃二：`validation` 直接用 `RuleItem[]` 形状、把 `required` 写进域表。
- 废弃三：内核预声明 `label` / `validate`（它们是 extras，见问题 25）。

### 问题 15：一颗 Field 能不能铺多格？组合体怎么表达？

**解决方式**：身份（Field / control）与壳（`LayoutItem` + 宿主 Item）**不是 1:1——一颗 Field : N 格**。组装树由**两轴**合成：

- **位置** `fl:field`：`'auto' | 'embed' | 'wrap-embed'`（可写口径；schema 与标签「近的赢」）。
- **体**（control 静态 `formless.field: 'embed'`）：只表示「我是组合体，被成格时需要内层窗口」，**不是合并层**。

| `fl:field` | 叶子 control | 组合体 control |
|------------|-------------|----------------|
| `'auto'`（省略） | `'wrap'` | `'embed'` |
| `'embed'` | `'embed'` | `'embed'` |
| `'wrap-embed'` | `'wrap-embed'` | `'wrap-embed'` |

组合体只写体 `formless: { field: 'embed', model: [...] }`；要外格 + 内层窗口，**显式写 `'wrap-embed'`**（`<FormField fl:model="start">` 取内层格）。

**废弃**：
- 废弃一：拆成 `StartDate` / `EndDate` 两颗 control（DOM 两格最省事，但身份与区间校验裂开）。
- 废弃二：只支持 OneInput（两格 label / 红字覆盖不到）。
- 废弃三：schema `ports: []` 由工厂展开（工厂开始像迷你表单 schema）。
- 废弃四：`item: 'self'` / `cell: 'embed'` / `useFormCell(port)`（`'self'` 已废：组合体只写体；按口切片改 `fl:model`）。
- 废弃五：`wrap` + `embed` 两个 boolean 由内核 AND 出第三种树（同一键无法表达三种树的整颗替换）。

### 问题 16：多口 control 的宿主校验怎么办？

**解决方式**：

- 内核 snapshot 只给归一化 `model` / `prop`（下标对齐）+ extras；**适配层不认叶子名**，编规则只吃「该 control 的 `validation` + 这场 `fl:validate` + 已取好的口值」。
- 宿主 Item `prop` 是**纯适配编码**：单口 → 位置；**多口一格 / 位置编不出来 → 不绑**（`prop: undefined`，宿主不注册该格，也不参与 `validate` / `resetFields`）。
- **要宿主校验就把口拆成格**（`fl:field="wrap-embed"`，每格各一个口）。
- 整表 `validate()` 走 FormView 的 `ref`（代理内层 Form）；`v-model` 仍是 DTO。

**废弃**：
- 废弃一：在 DTO 上拼虚拟键 `timeRange: [start, end]`（虚拟字段漏进业务对象）。
- 废弃二：`toEpRules` 写死 `startTime` / `endTime`（适配层绑死表单形状）。
- 废弃三：`item.prop = '$startTime,endTime'`（叶子名进挂载点，换绑要改字符串）。
- 废弃四：内核 snapshot 预算 `formItemProp`（把 Element 编码焊进内核）。
- 废弃五：无 Form 时忽略 `value`（仅作降级，不是表单页主路径）。

---

## 五、布局

### 问题 17：栅格自研还是消费外部？span 优先级与响应式放哪？

**解决方式**：

- **不自研 Row/Col**，消费外部成熟栅格（约定 **24 格**，不另配 `total`）；无 Row/Col 的库通过适配对齐同一语义。
- 优先级：**Item 上的布局配置 > LayoutView 默认 > 兜底**。域表尽量不承担布局。
- **响应式只做 LayoutView 级列密度**（大屏更密 / 小屏更疏），不做 Item 级 `xs/sm/md` 断点。
- 模板扁平摆放，换行 / 行末补齐由布局层用**空白 Col** 消化（不调用外部 `offset` / `push` / `pull`）。
- 个别字段「任何密度下独占落地行」用下一格 `place="start"`（封本行、下一行起头）或本格 `place="end"`。

**废弃**：
- 废弃一：库内 CSS Grid 替代 Row/Col（与中后台既有心智、设计稿不一致）。
- 废弃二：业务继续手写 Row/Col 包每个字段（回到高样板）。
- 废弃三：Item 级 `xs/sm/md` 响应式（不是主流真实需求，且与页级密度难共存）。
- 废弃四：域表写死 span 当主来源（与跨页不同密度冲突）。
- 废弃五：开放 Col `offset` / 任意透传（超出公约数就退出托管，手写外部栅格）。

### 问题 18：`fl:layout` 与密度写在哪？

**解决方式**：

- `fl:layout` **只做 boolean 开关**：不写 / `false` = 不托管栅格（LayoutView 透传）；`true` = 托管。
- 项目密度写工厂 **`layout.props`（仅静态对象）**；实例覆盖写 `layout:column` / `layout:gutter`（FormView 认领 `layout:` 通道）。
- `:fl:layout` 值域是 boolean，**不吃密度对象**；`layout.column` 工厂字段已退场。
- `wrap-embed` 的内层 LayoutView **不继承**页 `fl:layout` / `:layout:column` / 工厂 `layout.props`，用自身缺省。
- `LayoutViewProps` = `disabled` + `column`；`LayoutItemProps` = `span` + `place`。`span` 归一化 `1x` = `24/column`、`max` = 24，clamp 1..24。

**废弃**：
- 废弃一：`fl:layout` 同时吃密度对象 `{ column }`。
- 废弃二：`layout.column` / `layout.gutter` 工厂字段（退场，收进 `layout.props`）。
- 废弃三：`layout.props` / `form.props` 写成函数、吃 snapshot（收敛为静态对象）。

### 问题 19：行内占用用 `take` 吗？筛选窗口落地了吗？

**解决方式**：

- **`take` 不实现**：行内占用保持 `place` **单轴**（`auto` / `start` / `end`）。`span` 是宿主 Col 实宽，`place` 已经是「行内落位 / 占行模式」，不再新开 `take`。
- ADR-019 的筛选窗口（`layout:row` + `layout-item:show`）**尚未落地**：当前 `LayoutView` 只有 `disabled` / `column`，`LayoutItem` 只有 `span` / `place`。

**废弃**：
- 废弃一：`take="rest"` / `span="rest"`——模型承诺 9 格只交付 1 格；区域宽度是运行时值（随 `column` / 前面的格 / `v-if` 变），不适合承载第二个轴。
- 废弃二：页面 `visible = column * 2` + `v-if`（一改密度或混 `2x` 即错）。
- 废弃三：`filter` 回调（不语义化，作者仍要算预算）。
- 废弃四：容器 `max-height` 裁两行（会裁掉 DOM 末尾的查询 / 重置）。
- 废弃五：窗口键叫 `rows`（与 `column` 不对称）。

---

## 六、配置通道与投影

### 问题 20：一粒属性怎么路由到多颗宿主组件？

**解决方式**：一条规则——

> **无前缀 = 这颗组件的主宿主；`前缀:` = 你要配置的那个 formless 侧子组件。**

| 前缀 | 目标 | 装什么 |
|------|------|--------|
| 裸名 | 主宿主（FormView→ElForm / FormField→control） | 输入自己的 props / 事件 / 无前缀槽 |
| `item:` | 宿主 ElFormItem | 越过 control 去够 Item 壳 |
| `layout-item:` | `LayoutItem` | `layout-item:span` / `layout-item:place` |
| `layout:` | `LayoutView` | `layout:column` / `layout:gutter`（页级 / wrap-embed 内层） |
| `fl:` | formless 内核 | 绑定 / 组树 / 壳开关 / 语义 extras |

- **props 与监听同去一个目标**（模板 `@item:validate` 编译成 attr `onItem:validate`，剥前缀后还原成 `onValidate`）。
- **主宿主缺席时裸名丢弃**（不报错、不转发）；想仍生效就用显式前缀。
- 语义轴：**`fl:*` 是语义源**（改它触发派生重算），`item:` / `layout-item:` / `layout:` / 裸名是**机械值**（直接落地）。

**废弃**：
- 废弃一：按宿主元素命名（`row:` / `col:`）——`column`/`gutter`、`span`/`show` 在同一前缀里混装，换宿主要改前缀名。
- 废弃二：`:formless="{ … }"` 袋子（改为 `fl:*` 逐键平铺；字符串袋没有 Volar）。
- 废弃三：结构化对象 `:layout="{ column: 4 }"` / `:cell="{ span }"` / `:item="{ label }"`（v1 否，真 props 但非平铺 attrs）。
- 废弃四：把窗口算法键收进 `fl:`（省不掉任何前缀，还把语义源与机械值混成一袋）。

### 问题 21：通道怎么分发，一个键会不会进两桶？

**解决方式**：

- `dispatch(bag, channels, { prefix })` **一次分桶**：每通道一桶 + `default` 裸名残差；**不筛值、不丢键**，每个键恰好进一个桶或 `default`。
- 桶内 **props 先、监听后**，同一键冲突时监听赢。
- `useDispatch(attrs, channels)` 是 attrs 关口：响应式包装 + 桶名由 `Channel` 经 `ToCamel` 派生（`layout-item` → `layoutItem`）。
- 各调用点声明**自己认领的通道集**：`VIEW_ATTR_CHANNELS`（`fl` / `layout`）、`FIELD_ATTR_CHANNELS`（`fl` / `layout` / `layout-item` / `item`）、`FIELD_SLOT_CHANNELS`。
- `prefix: 'keep'` 保留输入键形，供父组件把某通道原样再认领一次（**只用于转发**）；`default` 两模式一致。

**废弃**：
- 废弃一：`pickAttrs` / `omitAttrs`（「一次只能 pick 一个通道」的调用点纪律；分桶天然隔离后不再需要）。
- 废弃二：`splitFlAttrs` / `takePrefixed` / `splitFormlessProps` / `useFormlessProps` 等多套剥皮原语。
- 废弃三：把 `keep` 当调用点常备项、或当成「另一种归一化」。

### 问题 22：`fl` 怎么变成宿主 props，谁赢？

**解决方式**：`props` 一种槽、两种写法，**都是默认值**（不是「拿到已有宿主 props 再 transform」）：

- 对象 = 静态默认；函数 = 从该层 snapshot 算出的默认。
- 覆盖规则：**近的赢、`undefined` 不算写过**。

```text
FormField（control）: 模板裸名 > schema.props；bind 的写口监听融合、数据键覆盖
FormField（Item 壳）: :item: / @item: > item.props(snapshot)
FormView（宿主 Form）: 无前缀 > form.props
锁死:                 control 的 v-model 口；工厂壳的 component
```

- `FormView` 写口按 no-prefix 以**裸名 `modelValue`** 落到宿主 Form；口名不同（ElForm `model`）由适配层 `MyForm` 映射。
- `item.props` 吃 `FormFieldFormless` snapshot；`layout.props` / `form.props` 只静态。
- control 的最终 props 由 Vue `mergeProps` 合成（写口监听先跑、外部监听追加其后都触发）。

**废弃**：
- 废弃一：`props.fl`（让每颗 Input 声明接 `fl`，税高且各自发明覆盖规则）。
- 废弃二：Form / Item 吃 `props.fl`（改为 `item.props` / `form.props`）。
- 废弃三：`form.props` / `layout.props` 写成 snapshot 函数。
- 废弃四：独立 `props-overlay.ts`（`resolveProps` / `mergeAttrs` 无调用点，各调用点内联展开）。

### 问题 23：内核 `fl:` 键有哪些？`fl:model` 到底做什么？

**解决方式**：

| 键 | 值域 | 作用 |
|----|------|------|
| `fl:model` | `string \| readonly string[]` | 本格认领的 v-model 口（见问题 11） |
| `fl:prop` | `string \| readonly string[]` | 绑定位置（从根到叶子） |
| `fl:item` | `boolean` | 是否渲染宿主 ElFormItem 壳 |
| `fl:field` | `'auto' \| 'embed' \| 'wrap-embed'` | 组装位置（见问题 15） |
| `fl:component` | `Component` | 本格 control（临场格 / 工厂预设） |
| `fl:layout` | `boolean` | 是否渲染 LayoutView |
| `fl:form` | `'auto' \| boolean` | 是否渲染 ElForm（默认 auto：根开、嵌套关） |

- `fl:model` 在**身份根**（namespaced 标签 / 临场格）上是**声明**，与 `fl:prop` 一样可覆盖 schema；在**组合体内层格**上是**选口**（在已声明口里挑）。
- 只有 `component` 被工厂壳锁死；`model` / `prop` / `item` / `field` 标签均可覆盖。
- **内核不发身份名**：工厂域名表的键只当 `fl:prop` 的缺省位置；宿主 `prop` 由适配层自决。
- `CreateFormFieldOptions` 的核心键都有对应 `fl:` 标签键（`props` / `name` 除外），类型由 `ToFormlessProps` 派生不手抄。

**废弃**：
- 废弃一：`fl:key` / `fieldKey` / `identity-rules`（内核下发身份名）。
- 废弃二：`fl:span`（宽走 `layout-item:span`；`fl:span` 开发态 warn 后丢弃）。
- 废弃三：`fl:grid` / `fl:tree` / `fl:cell`（未落地或被 `fl:layout` / `fl:field` 取代）。
- 废弃四：`getValues()`（声明了但从未实现，已从 snapshot 删除）。

### 问题 24：嵌套 FormView 怎么读写？

**解决方式**：

- 归属判定：配了 `:model-value` → 受控；未配但有上层 FormView → 用上层；否则用本地变量（控制权可归上级 / 用户 / 自行）。
- 嵌套 FormView **未绑 `modelValue` / `onUpdate:modelValue` 两键时 inherit 祖先的读 / 写源**（`value` / `getIn` / `setIn`），不建本地 writer；路径始终相对同一个根。
- 只有 **owner 层** emit；非 owner 直接转发祖先 `setIn`（否则多层各自从 props 快照重建整值、互相覆盖）。
- 两个注入键各是一个作用域：`FORM_VIEW_KEY`（只给嵌套 FormView）与 `FORM_FIELD_KEY`（给 FormField，含 `access` / `getProp?` / 壳资源 / 页 `fl`）。

**废弃**：
- 废弃一：子 FormView 只监听 `@update:model-value`——`update` 事件同时表示「发生了 update」与「需要更新 model-value」，二义；视为不支持。
- 废弃二：嵌套 FormView 建本地 writer（多层 emit 互相覆盖）。
- 废弃三：公开 `FormView.Layout` / `FormView.Item`。

### 问题 25：扩展与适配怎么做？

**解决方式**：

- extras（`label` / `validation` 等）经 **module augmentation** 声明在唯一锚点 `FormFieldCustomOptions`：

```ts
declare module 'vue-formless' {
  interface FormFieldCustomOptions {
    label?: string
    validation?: ValidationSpec
  }
}
```

- 内核只读核心键（`component` / `model` / `props` / `prop` / `item` / `field`），其余 schema 键与 `fl:*` extras **不解释**，进 Item / control 转化函数的 snapshot。
- control 静态 `formless` 经 Vue `ComponentCustomOptions.formless` 声明。
- 公开面 = **5 个运行时值**（`createFormView` / `createFormFields` / `FormField` / `createLayoutView` / `LayoutItem`）+ 必要类型；定制只有三条路：`$bindings` slot、`fl:component` 临场格、module augmentation。

**废弃**：
- 废弃一：内核写死 `label` / `rules` / `validate` / `model` 等宿主概念。
- 废弃二：多个 augmentation 锚点（`FieldSchema` / `FieldSchemaExtras` 等，靠手工同步会漂移）。
- 废弃三：开放自定义 merge / 自定义前缀 / `form:` 前缀（当前无需从字段够到宿主 Form）。

---

## 附：未落地 / 待定清单

| 项 | 状态 |
|----|------|
| LayoutView `layout:row` 窗口 + `LayoutItem` `layout-item:show`（筛选条收起） | 未落地（问题 19） |
| `fl:grid` 栅格开关 | 未落地，开关仍写 `fl:layout` |
| `ItemFl.getValues()` | 已删除（声明了但从未实现） |
| `take` / `span="rest"` / `item: 'self'` | 已否 |
| `LayoutItem` 级多断点 span | 已否 |
