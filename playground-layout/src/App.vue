<script setup lang="ts">
import { ref } from 'vue'
import Cell from './Cell.vue'
import { LayoutView } from './layout'

const showA = ref(true)
const showB = ref(true)
const showC = ref(true)
const showEndA = ref(true)
const showEndB = ref(true)
const showEndC = ref(true)
const showEndD = ref(true)
</script>

<template>
  <div class="pg">
    <header class="pg-head">
      <h1>layout</h1>
      <p>@vue-formless/layout · Element Plus Row/Col</p>
    </header>

    <section>
      <h2>column: 2</h2>
      <p>省略 span = 1x = 12</p>
      <LayoutView :column="2" :gutter="16">
        <Cell>A</Cell>
        <Cell>B</Cell>
        <Cell>C</Cell>
        <Cell>D</Cell>
      </LayoutView>
    </section>

    <section>
      <h2>column: 3</h2>
      <p>1x = 8，gutter 16 透传 ElRow</p>
      <LayoutView :column="3" :gutter="16">
        <Cell>A</Cell>
        <Cell>B</Cell>
        <Cell>C</Cell>
        <Cell>D</Cell>
        <Cell>E</Cell>
        <Cell>F</Cell>
      </LayoutView>
    </section>

    <section>
      <h2>column: 4</h2>
      <p>1x = 6，最后一行不必填满</p>
      <LayoutView :column="4" :gutter="16">
        <Cell>A</Cell>
        <Cell>B</Cell>
        <Cell>C</Cell>
        <Cell>D</Cell>
        <Cell>E</Cell>
      </LayoutView>
    </section>

    <section>
      <h2>span</h2>
      <p>省略 / 2x / max / 绝对格。column: 3 时 1x = 8</p>
      <LayoutView :column="3" :gutter="16">
        <Cell>省略 · 8</Cell>
        <Cell span="2x">2x · 16</Cell>
        <Cell span="max">max · 24</Cell>
        <Cell :span="8">8</Cell>
        <Cell span="16">16</Cell>
      </LayoutView>
    </section>

    <section>
      <h2>place: auto</h2>
      <p>顺排，满 24 折行</p>
      <LayoutView :column="3" :gutter="16">
        <Cell>A</Cell>
        <Cell>B</Cell>
        <Cell>C</Cell>
        <Cell>D · 下一行</Cell>
      </LayoutView>
    </section>

    <section>
      <h2>place: start</h2>
      <p>B 另起一行，A 右侧由空白 Col 封住。取消勾选即卸载对应格子。</p>
      <div class="pg-toggles">
        <label><input v-model="showA" type="checkbox" /> 显示 A</label>
        <label><input v-model="showB" type="checkbox" /> 显示 B</label>
        <label><input v-model="showC" type="checkbox" /> 显示 C</label>
      </div>
      <LayoutView :column="3" :gutter="16">
          <Cell v-if="showA" key="a">A</Cell>
          <Cell v-if="showB" key="b" place="start">B · start</Cell>
          <Cell v-if="showC" key="c">C</Cell>
      </LayoutView>
    </section>

    <section>
      <h2>place: end</h2>
      <p>C 靠行尾；D 在 C 之后。取消勾选即卸载对应格子。</p>
      <div class="pg-toggles">
        <label><input v-model="showEndA" type="checkbox" /> 显示 A</label>
        <label><input v-model="showEndB" type="checkbox" /> 显示 B</label>
        <label><input v-model="showEndC" type="checkbox" /> 显示 C</label>
        <label><input v-model="showEndD" type="checkbox" /> 显示 D</label>
      </div>
      <LayoutView :column="3" :gutter="16">
        <Cell v-if="showEndA" key="end-a">A</Cell>
        <Cell v-if="showEndB" key="end-b">B</Cell>
        <Cell v-if="showEndC" key="end-c" place="end">C · end</Cell>
        <Cell v-if="showEndD" key="end-d">D</Cell>
      </LayoutView>
    </section>

    <section>
      <h2>嵌套</h2>
      <p>内层 LayoutView 用自己的密度；包在外层 max Cell 里</p>
      <LayoutView :column="3" :gutter="16">
        <Cell>外 A</Cell>
        <Cell>外 B</Cell>
        <Cell>外 C</Cell>
        <Cell span="max" plain>
          <LayoutView :column="2" :gutter="16">
            <Cell>内 1 · 12</Cell>
            <Cell>内 2 · 12</Cell>
            <Cell span="max">内 max · 24</Cell>
          </LayoutView>
        </Cell>
      </LayoutView>
    </section>

    <section>
      <h2>disabled</h2>
      <p>不渲染 Row/Col，Cell 原样透传</p>
      <LayoutView :column="3" :gutter="16" disabled>
        <Cell>A</Cell>
        <Cell>B</Cell>
        <Cell>C</Cell>
      </LayoutView>
    </section>
  </div>
</template>
