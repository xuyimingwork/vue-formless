# ADR-005：配置最小单元是 View-Model 控件，而非数据库字段

- **状态**：Accepted
- **日期**：2026-08-12
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

2. **默认控件绑定落在模型层**（字段 → 组件 + 基础 props/options），布局层只覆盖 span、显隐、插槽等。

3. **流程层用 Adapter** 在拉取/提交边界做拆装（`[start, end]` ↔ `startTime`/`endTime`），模板不感知多字段落库细节。

4. **校验分层（约定）**  
   - 随字段/控件：空值判定、格式（如身份证结构）等「控件语义」  
   - 随业务/流程：是否启用必填、本次提交要跑哪些 rule  
   具体 API（默认 rules vs 场景 overrides）实现阶段再定，本 ADR 只锁定分层原则。

5. **复合控件可提供默认插槽出口**（如 `<User.OrderList>` 内自定义行渲染），仍属同一 View-Model 单元。

## 备选方案

1. **严格 1:1 DB 字段 Schema**：简单 CRUD 够用；Range/复合控件与跨字段回填别扭。
2. **布局配置里每次写 component 绑定**：灵活但重复，违背「领域模型统一、控件默认绑定」的收益。
3. **把 Adapter 塞进字段组件**：渲染层掺入协议转换，难测且难复用到非表单通道。

## 后果

- **正向**：模板语义稳定；跨页复用默认绑定；复杂控件不强迫拆成多个布局节点。
- **代价**：需维护 View-Model ↔ API DTO 的 Adapter；命名要区分「库字段」与「控件键」（如 `CreateTimeRange`）。
- **关联**：模型文件组织见 ADR-001；运行时是否下发字段见 ADR-006。
