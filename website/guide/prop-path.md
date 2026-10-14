# prop 路径语法

`prop` 用一段**JS 成员链子集**表达从 FormView 根到叶子的位置。

## 语法

```text
path     := segment ('.' name | bracket)*
segment  := name | bracket
bracket  := '[' index ']' | '[' quoted ']'
name     := [a-zA-Z_$][a-zA-Z0-9_$]*    对象键（JS IdentifierName 的子集）
index    := 0 | [1-9][0-9]*             规范下标（仅括号形式，无前导零）
quoted   := '"' [^"]* '"' | "'" [^']* "'"   引号段：段内除定界符外任意字符，无转义
```

## 示例

```text
name                对象键
buyers[0].name      数组下标 + 对象键
[2].title           根是数组
map["0"].name       数字键 map（数字键只能走引号段）
map["a.b"].x        引号段逃逸（键含点）
```

## 规则

- 语法是 **JS 成员链的子集**：`.` 后必须是 name，`]` 后接 name 必须先有 `.`。于是 `map.0.name`（name 不能数字开头）、`buyers[0]name`（缺 `.`）、`a.[0]`（`.` 后非 name）均非法。
- 数组项仅用 `[0]` 寻址；数字键只能走引号段（`map["0"]`），`[n]` 与引号段**永不互指**。
- 引号段**无转义**：`\` 是普通字符，引号恒为定界符。含**一种**引号的键换另一种定界符即可（`map['say "hi"']`、`map["it's"]`）；同时含 `'` 与 `"` 的键没有写法——这是不要转义的既定代价。
- 读取仅限**自有属性**（`hasOwnProperty.call`），原型链不是数据（`constructor` / `__proto__` 读作 undefined）。
- 数组自有属性（`length` / `["0"]` / 自定义键）**同样不是数据**：key 段不寻址数组，读作 `undefined`。

## 读写容错

- `parsePath` 失败返回 `undefined`（**不 throw、不 warn**）。
- 读侧错配读作 `undefined`。
- 写侧「形状匹配即合并、不匹配即覆盖」。

## 与宿主 prop 的关系

内核的绑定位置（`buyers[0].name`）**不是**直接喂给宿主 `ElFormItem` 的 `prop`。宿主 `prop` 怎么编码（点分路径 / 名字 / 不绑）是**适配层的私事**：

```ts
// Element Plus 适配：buyers[0].name → buyers.0.name
function toDotPath(path: string): string | undefined {
  const dotted = path.replace(/\[(\d+)\]/g, '.$1').replace(/^\./, '')
  // ...
}
```

单口 → 位置；多口一格 / 位置编不出来 → 不绑（`prop: undefined`）。

## 下一步

- [model 与 prop](/guide/model-and-prop)
- [数据流](/guide/data-flow)
