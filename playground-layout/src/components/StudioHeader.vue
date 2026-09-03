<script setup lang="ts">
const formHref = import.meta.env.DEV
  ? 'http://localhost:5173/'
  : new URL('../', import.meta.env.BASE_URL).pathname
</script>

<template>
  <header class="pg-head">
    <div class="pg-head-top">
      <p class="pg-kicker">@vue-formless/layout</p>
      <div class="pg-head-meta">
        <div class="pg-legend">
          <span><i class="pg-swatch is-cell" />内容</span>
          <span><i class="pg-swatch is-blank" />占位</span>
        </div>
        <a class="pg-cross" :href="formHref">表单对照</a>
      </div>
    </div>
    <h1>24 格布局</h1>
    <p class="pg-lead">
      @vue-formless/layout 把 Row / Col 收成声明式布局组件：写列数和格子意图即可，空位由库补上，配置代码少很多。本 Demo 使用了 Element Plus 的 ElRow / ElCol。
    </p>
  </header>
</template>
