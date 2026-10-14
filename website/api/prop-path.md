# prop 路径语法

`prop` 用一段 **JS 成员链子集**表达从 FormView 根到叶子的位置。

## 语法

```text
path     := segment ('.' name | bracket)*
segment  := name | bracket
bracket  := '[' index ']' | '[' quoted ']'
name     := [a-zA-Z_$][a-zA-Z0-9_$]*
index    := 0 | [1-9][0-9]*
quoted   := '"' [^"]* '"' | "'" [^']* "'"
```

## 示例

```text
name                对象键
buyers[0].name      数组下标 + 对象键
[2].title           根是数组
map["0"].name       数字键 map
map["a.b"].x        引号段逃逸（键含点）
```

## 规则

- `.` 后必须是 name，`]` 后接 name 必须先有 `.`。`map.0.name`、`buyers[0]name`、`a.[0]` 均非法。
- 数组项仅用 `[0]` 寻址；数字键只能走引号段；`[n]` 与引号段永不互指。
- 引号段无转义；同时含 `'` 与 `"` 的键没有写法。
- 读取仅限自有属性，原型链不是数据；key 段不寻址数组。

## 容错

- `parsePath` 失败返回 `undefined`，不 throw、不 warn。
- 读侧错配读作 `undefined`；写侧「形状匹配即合并、不匹配即覆盖」。

## 与宿主 prop 的关系

内核绑定位置不是宿主 `ElFormItem` 的 `prop`。宿主 `prop` 怎么编码（点分 / 名字 / 不绑）是适配层私事。

## 相关

- [prop 路径语法（指南）](/guide/prop-path)
- [model 与 prop](/guide/model-and-prop)
