# ADR-005：配置最小单元是 View-Model 控件，而非数据库字段

- **状态**：Accepted（修订）
- **日期**：2026-08-12
- **修订**：
  - 2026-08-17 — 控件键用 `agency` 而非 `agencyId`；默认绑定的载体是页级控件表，不是领域字段单例。见 [ADR-009](./009-controls-as-protagonist.md)。
  - 2026-08-18 — 控件表可写 `rules`（空值/格式），但不决定本场是否启用；不配联动。见 [ADR-010](./010-controls-as-semantic-cluster.md)。
- **来源**：动态表单架构设计推演

## 背景

领域里「字段」常被等同于后端列：`name`、`startTime`、`endTime`。但表单交互的最小单位是**控件**：

- `addressId` 默认绑定 `AddressSelect`，应在模型层配一次，而非每次布局重复写绑定
- 日期范围是一个控件，对应两个（或多个）持久化字段
- 校验也有两层：「怎样算已填」随控件；「本业务是否必填、校验哪些规则」随场景

若 Schema 按 DB 列铺开，Range、复合选择器、只读展示态都会扭曲布局与绑定 API。

## 决策

1. **Schema 描述的是 View-Model（控件集合）**，不是纯 Database Model。  
   例：`CreateTimeRange` → DateRangePicker；模板写 `<User.CreateTimeRange />`。

2. **默认控件绑定落在控件表**（控件键 → 组件 + 基础 props/options），布局层只覆盖 span、显隐、插槽等。控件表默认跟页走（ADR-009）。

3. **流程层用 Adapter** 在拉取/提交边界做拆装（`[start, end]` ↔ `startTime`/`endTime`），模板不感知多字段落库细节。

4. **校验分层（约定）**  
   - 随控件：空值判定、格式（如身份证结构）写成该控件的 `rules`（「这个输入会什么」）  
   - 随场景：是否启用这些规则（如 `<User.Name required />`）、本次提交要跑哪些跨格规则  
   控件表**写** `rules`，**不**写死本场必填、也不配控件间联动，见 [ADR-010](./010-controls-as-semantic-cluster.md)。具体接到 `el-form` 的 API 实现阶段再定，本 ADR 只锁定分层原则。

5. **复合控件可提供默认插槽出口**（如 `<User.OrderList>` 内自定义行渲染），仍属同一 View-Model 单元。

## 备选方案

1. **严格 1:1 DB 字段 Schema**：简单 CRUD 够用；Range/复合控件与跨字段回填别扭。
2. **布局配置里每次写 component 绑定**：灵活但重复，违背「领域模型统一、控件默认绑定」的收益。
3. **把 Adapter 塞进字段组件**：渲染层掺入协议转换，难测且难复用到非表单通道。

## 后果

- **正向**：模板语义稳定；跨页复用默认绑定；复杂控件不强迫拆成多个布局节点。
- **代价**：需维护 View-Model ↔ API DTO 的 Adapter；命名要区分「库字段」与「控件键」（如 `CreateTimeRange`）。
- **关联**：模型文件组织见 ADR-001；运行时是否下发字段见 ADR-006；工厂非目标见 [ADR-010](./010-controls-as-semantic-cluster.md)。
