<script setup>
import { reactive } from 'vue'
import { TresCanvas } from '@tresjs/core'
import { OrbitControls } from '@tresjs/cientos'
import Scene from './components/Scene.vue'
import { SHIP, SLOT_COUNT, MAX_TEU } from './shipConfig.js'

const config = reactive({
  speed: 1,
  running: false,
  revision: 0,
  types: [
    { name: '40HQ', ft: 40, w: 2.44, h: 2.9, color: '#e67e22', qty: 60, enabled: true },
    { name: '40GP', ft: 40, w: 2.44, h: 2.59, color: '#2980b9', qty: 40, enabled: true },
    { name: '20HQ', ft: 20, w: 2.44, h: 2.9, color: '#16a085', qty: 8, enabled: true },
    { name: '20GP', ft: 20, w: 2.44, h: 2.59, color: '#8e44ad', qty: 12, enabled: true },
  ],
})

const status = reactive({
  total: 0,
  placed: 0,
  loaded: 0,
  report: [],
})

function toggle() {
  config.running = !config.running
}
function reset() {
  config.running = true
  config.revision++
}
function addType() {
  config.types.push({
    name: '自定义',
    ft: 40,
    w: 2.44,
    h: 2.9,
    color: '#8e44ad',
    qty: 10,
    enabled: true,
  })
}
function removeType(i) {
  config.types.splice(i, 1)
}
function typeColor(name) {
  const t = config.types.find((x) => x.name === name)
  return t ? t.color : '#999'
}
</script>

<template>
  <div class="canvas-wrap">
    <TresCanvas clear-color="#bfe3ff" shadows>
      <TresPerspectiveCamera :position="[58, 36, 62]" :fov="50" />

      <OrbitControls
        :target="[0, 4, 0]"
        :enable-damping="true"
        :min-distance="20"
        :max-distance="180"
        :max-polar-angle="1.5"
      />

      <TresFog :args="['#bfe3ff', 120, 320]" />

      <TresAmbientLight :intensity="0.75" />
      <TresDirectionalLight
        :position="[60, 80, 40]"
        :intensity="1.35"
        cast-shadow
        :shadow-mapSize-width="2048"
        :shadow-mapSize-height="2048"
        :shadow-camera-near="1"
        :shadow-camera-far="260"
        :shadow-camera-left="-90"
        :shadow-camera-right="90"
        :shadow-camera-top="90"
        :shadow-camera-bottom="-90"
      />
      <TresHemisphereLight :args="['#cfeaff', '#3a6b4f', 0.45]" />

      <Scene :config="config" :status="status" />
    </TresCanvas>

    <!-- ============ 控制面板 ============ -->
    <div class="panel">
      <h3>集装箱装船 · 配载演示</h3>

      <div class="spec">
        船舱规格 {{ SHIP.bays }}×{{ SHIP.rows }}×{{ SHIP.tiers }}
        <span>贝×列×层</span><br />
        最大约 <b>{{ MAX_TEU }}</b> TEU / {{ SLOT_COUNT }} 箱位
      </div>

      <div class="types">
        <div class="t-head">
          <span>箱型</span><span>长</span><span>高</span><span>数量</span><span></span>
        </div>
        <div class="t-row" v-for="(t, i) in config.types" :key="i">
          <input type="color" v-model="t.color" title="颜色" />
          <input type="text" v-model="t.name" class="name" />
          <select v-model.number="t.ft">
            <option :value="20">20'</option>
            <option :value="40">40'</option>
          </select>
          <select v-model.number="t.h">
            <option :value="2.59">GP</option>
            <option :value="2.9">HQ</option>
          </select>
          <input type="number" min="0" v-model.number="t.qty" class="qty" />
          <label class="chk" title="启用">
            <input type="checkbox" v-model="t.enabled" />
          </label>
          <button class="del" @click="removeType(i)" title="删除">×</button>
        </div>
        <button class="add" @click="addType">+ 添加箱型</button>
      </div>

      <div class="btns">
        <button class="primary" @click="toggle">
          {{ config.running ? '停止' : '启动' }}
        </button>
        <button @click="reset">重置</button>
      </div>

      <div class="report">
        <div class="r-sum">
          请求 <b>{{ status.total }}</b> · 已装入 <b>{{ status.placed }}</b> ·
          本船最多装 <b>{{ status.loaded }}</b>
        </div>
        <div class="r-row" v-for="r in status.report" :key="r.name">
          <span class="dot" :style="{ background: typeColor(r.name) }"></span>
          {{ r.name }}：装 {{ r.placed }}/{{ r.requested }}
          <em v-if="r.left > 0">（剩 {{ r.left }} 装不下）</em>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.panel {
  position: absolute;
  top: 18px;
  right: 18px;
  width: 300px;
  max-height: calc(100vh - 36px);
  overflow-y: auto;
  background: rgba(255, 255, 255, 0.88);
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.12);
  backdrop-filter: blur(6px);
  color: #0b3a5b;
}

.panel h3 {
  margin: 0 0 10px;
  font-size: 15px;
}

.spec {
  font-size: 12px;
  line-height: 1.6;
  background: #eaf3fb;
  border-radius: 8px;
  padding: 8px 10px;
  margin-bottom: 12px;
}
.spec b {
  color: #c0392b;
  font-size: 14px;
}
.spec span {
  opacity: 0.6;
}

.types {
  font-size: 12px;
}
.t-head,
.t-row {
  display: grid;
  grid-template-columns: 26px 1fr 42px 46px 50px 22px 22px;
  gap: 4px;
  align-items: center;
  margin-bottom: 6px;
}
.t-head {
  font-weight: 600;
  opacity: 0.7;
}
.t-row input[type='color'] {
  width: 26px;
  height: 26px;
  border: none;
  background: none;
  padding: 0;
  cursor: pointer;
}
.t-row .name {
  width: 100%;
  min-width: 0;
  padding: 3px 5px;
  border: 1px solid #c5d6e2;
  border-radius: 5px;
  font-size: 12px;
}
.t-row select,
.t-row .qty {
  width: 100%;
  padding: 3px 2px;
  border: 1px solid #c5d6e2;
  border-radius: 5px;
  font-size: 12px;
}
.chk {
  display: flex;
  justify-content: center;
}
.del {
  width: 22px;
  height: 22px;
  border: none;
  border-radius: 5px;
  background: #f3d5d0;
  color: #c0392b;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
}
.add {
  margin-top: 2px;
  border: 1px dashed #2980b9;
  background: transparent;
  color: #2980b9;
  border-radius: 6px;
  padding: 5px 10px;
  cursor: pointer;
  font-size: 12px;
}

.btns {
  display: flex;
  gap: 10px;
  margin: 14px 0 12px;
}
.btns button {
  flex: 1;
  padding: 9px 0;
  border: 1px solid #c5d6e2;
  border-radius: 8px;
  background: #fff;
  color: #0b3a5b;
  cursor: pointer;
  font-size: 14px;
}
.btns button.primary {
  background: #2980b9;
  border-color: #2980b9;
  color: #fff;
}

.report {
  font-size: 12px;
  border-top: 1px solid #d6e2ec;
  padding-top: 10px;
}
.r-sum {
  margin-bottom: 6px;
}
.r-sum b {
  color: #c0392b;
}
.r-row {
  line-height: 1.7;
}
.r-row .dot {
  display: inline-block;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  margin-right: 5px;
}
.r-row em {
  font-style: normal;
  color: #c0392b;
}
</style>
