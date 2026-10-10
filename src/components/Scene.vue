<script setup>
import { ref, reactive, watch, onMounted } from 'vue'
import * as THREE from 'three'
import { useRenderLoop } from '@tresjs/core'
import {
  SHIP,
  BAY_LEN,
  ROW_W,
  visualLen,
  bayCenterX,
  rowCenterZ,
  hullLen,
  beam,
  HULL_DEPTH,
  STERN_OVERHANG,
  containerBlockLen,
} from '../shipConfig.js'

const props = defineProps({
  config: { type: Object, required: true },
  status: { type: Object, required: true },
})

/* ---------- 动画参数 ---------- */
const DROP_H = 6 // 落箱起始高度（相对目标，无弹跳）
const STAGGER = 0.035 // 每个箱错峰间隔
const DROP_DUR = 0.7 // 单箱下落时长

/* ---------- 缓动：平滑减速（无弹跳） ---------- */
const easeOut = (t) => 1 - Math.pow(1 - t, 3)

/* ---------- 箱侧面型号贴图（白字，无描边） ---------- */
const labelCache = new Map()
function labelTex(name, l, h) {
  const key = 'side|' + name
  if (labelCache.has(key)) return labelCache.get(key)
  const cw = 512
  const ch = Math.max(96, Math.round((512 * h) / l))
  const cv = document.createElement('canvas')
  cv.width = cw
  cv.height = ch
  const ctx = cv.getContext('2d')
  ctx.clearRect(0, 0, cw, ch)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `bold ${Math.round(ch * 0.34)}px system-ui, "Microsoft YaHei", sans-serif`
  ctx.fillStyle = '#ffffff'
  ctx.fillText(name, cw / 2, ch / 2)
  const tex = new THREE.CanvasTexture(cv)
  tex.anisotropy = 4
  labelCache.set(key, tex)
  return tex
}

/* ---------- 公司品牌：长颈鹿吉祥物（基元拼装） ---------- */
function buildGiraffe() {
  const g = new THREE.Group()
  const tan = new THREE.MeshStandardMaterial({ color: '#e8b84b', roughness: 0.7 })
  const brown = new THREE.MeshStandardMaterial({ color: '#7a4a1e', roughness: 0.7 })
  const dark = new THREE.MeshStandardMaterial({ color: '#2c2118', roughness: 0.6 })

  // 四条腿
  const legGeo = new THREE.CylinderGeometry(0.16, 0.16, 2.2, 12)
  for (const [x, z] of [[-0.9, -0.55], [0.9, -0.55], [-0.9, 0.55], [0.9, 0.55]]) {
    const m = new THREE.Mesh(legGeo, tan)
    m.position.set(x, 1.1, z)
    m.castShadow = true
    g.add(m)
  }
  // 身体
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.5, 1.3), tan)
  body.position.set(0, 2.7, 0)
  body.castShadow = true
  g.add(body)
  // 脖子（前倾）
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.42, 3.4, 14), tan)
  neck.position.set(1.05, 4.5, 0)
  neck.rotation.z = -0.38
  neck.castShadow = true
  g.add(neck)
  // 头
  const head = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.72, 0.72), tan)
  head.position.set(2.15, 5.95, 0)
  head.castShadow = true
  g.add(head)
  // 口鼻
  const snout = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.52, 0.62), tan)
  snout.position.set(2.7, 5.72, 0)
  g.add(snout)
  // 眼睛
  for (const dz of [-0.22, 0.22]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), dark)
    eye.position.set(2.5, 6.0, dz)
    g.add(eye)
  }
  // 鹿角（ossicones）
  for (const dz of [-0.2, 0.2]) {
    const horn = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.42, 8), brown)
    horn.position.set(2.0, 6.45, dz)
    g.add(horn)
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 10), brown)
    ball.position.set(2.0, 6.68, dz)
    g.add(ball)
  }
  // 耳朵
  for (const dz of [-0.42, 0.42]) {
    const ear = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.4, 0.32), tan)
    ear.position.set(1.85, 6.15, dz)
    ear.rotation.x = dz > 0 ? 0.5 : -0.5
    g.add(ear)
  }
  // 尾巴
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.3, 8), tan)
  tail.position.set(-1.25, 2.4, 0)
  tail.rotation.z = 0.5
  g.add(tail)
  const tuft = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), brown)
  tuft.position.set(-1.55, 1.8, 0)
  g.add(tuft)
  // 斑点
  const spotGeo = new THREE.BoxGeometry(0.42, 0.06, 0.42)
  for (const [x, y, z] of [[-0.6, 3.05, 0.66], [0.5, 2.45, -0.66], [0, 2.95, 0.67], [-0.3, 2.5, 0.66], [0.3, 3.1, -0.66]]) {
    const s = new THREE.Mesh(spotGeo, brown)
    s.position.set(x, y, z)
    g.add(s)
  }
  g.scale.set(1.3, 1.3, 1.3)
  return g
}

/* ---------- 公司品牌：船体两侧公司名贴图 ---------- */
function signTex() {
  const w = 1024
  const h = 256
  const cv = document.createElement('canvas')
  cv.width = w
  cv.height = h
  const ctx = cv.getContext('2d')
  ctx.clearRect(0, 0, w, h)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 100px system-ui, "Microsoft YaHei", sans-serif'
  ctx.fillText('长帆国际物流', w / 2, h * 0.38)
  ctx.fillStyle = '#bfe3ff'
  ctx.font = 'bold 58px system-ui, Arial, sans-serif'
  ctx.fillText('LONGSAILING', w / 2, h * 0.74)
  const tex = new THREE.CanvasTexture(cv)
  tex.anisotropy = 4
  return tex
}

/* ---------- 海面 / 航迹 贴图 ---------- */
function seaTex() {
  const s = 256
  const cv = document.createElement('canvas')
  cv.width = cv.height = s
  const ctx = cv.getContext('2d')
  ctx.fillStyle = '#1e6f9f'
  ctx.fillRect(0, 0, s, s)
  for (let i = 0; i < 80; i++) {
    const x = Math.random() * s
    const y = Math.random() * s
    const r = 2 + Math.random() * 7
    ctx.fillStyle =
      Math.random() > 0.5
        ? 'rgba(255,255,255,0.10)'
        : 'rgba(120,190,230,0.18)'
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }
  const tex = new THREE.CanvasTexture(cv)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(60, 60)
  tex.anisotropy = 4
  return tex
}
function softTex() {
  const s = 256
  const cv = document.createElement('canvas')
  cv.width = cv.height = s
  const ctx = cv.getContext('2d')
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
  g.addColorStop(0, 'rgba(255,255,255,0.55)')
  g.addColorStop(0.5, 'rgba(255,255,255,0.18)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, s, s)
  const tex = new THREE.CanvasTexture(cv)
  tex.anisotropy = 4
  return tex
}
const waterMap = seaTex()
const wakeMap = softTex()
const bowMap = softTex()

/* ---------- 真实船体（挤出几何体） ---------- */
let bowTipX = 0
function buildHull() {
  const cb = containerBlockLen
  const sternX = -cb / 2 - STERN_OVERHANG
  const midX = cb / 2 + 3 // 平行舯体前端
  bowTipX = midX + 7 // 外飘艏柱顶点（前移）
  const H = HULL_DEPTH
  const shape = new THREE.Shape()
  shape.moveTo(sternX, -H) // 艉部底线
  shape.lineTo(midX, -H) // 龙骨
  shape.quadraticCurveTo(bowTipX + 1.5, -H * 0.45, bowTipX, 0.7) // 外飘艏柱（弧度上扬）
  shape.quadraticCurveTo(midX + 3, 0.4, midX, 0) // 艏楼圆角回落至甲板
  shape.lineTo(sternX, 0) // 主甲板线（箱区平整）
  shape.lineTo(sternX, -H)
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: beam,
    bevelEnabled: false,
    steps: 1,
  })
  geo.translate(0, 0, -beam / 2)
  const mat = new THREE.MeshStandardMaterial({
    color: '#9c2b22',
    roughness: 0.6,
    metalness: 0.15,
  })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}
const hullMesh = buildHull()
const giraffe = buildGiraffe()
giraffe.position.set(containerBlockLen / 2 + 1.5, 0, 0)
const companySign = signTex()

/* ---------- 配载：贪心最优（尽量满舱、少浪费贝位） ---------- */
function packAndPlace(types) {
  // 展开为单个集装箱列表
  const items = []
  const requested = {}
  for (const t of types) {
    if (!t.enabled || !t.qty || t.qty <= 0) continue
    requested[t.name] = (requested[t.name] || 0) + t.qty
    for (let k = 0; k < t.qty; k++) {
      items.push({
        name: t.name,
        color: t.color,
        is40: t.ft >= 40,
        l: visualLen(t.ft),
        w: t.w,
        h: t.h,
        placed: false,
      })
    }
  }
  // 40ft 优先、同规格高的优先（利于稳定与满载）
  items.sort(
    (a, b) => (b.is40 ? 1 : 0) - (a.is40 ? 1 : 0) || b.h - a.h
  )

  const { bays, rows, tiers } = SHIP
  const colH = Array.from({ length: rows }, () => new Array(bays).fill(0))
  const placements = []
  let seq = 0

  const findUnplaced = (want40) =>
    items.find((it) => !it.placed && it.is40 === want40)

  for (let tier = 0; tier < tiers; tier++) {
    for (let r = 0; r < rows; r++) {
      let bay = 0
      while (bay < bays) {
        const f = findUnplaced(true)
        const t = findUnplaced(false)
        if (!f && !t) break
        if (f && bay + 1 <= bays - 1) {
          put(f, [bay, bay + 1], r, colH, placements, seq++)
          bay += 2
        } else if (t) {
          const t2 = items.find(
            (it) => !it.placed && !it.is40 && it !== t
          )
          if (t2 && bay + 1 <= bays - 1) {
            put(t, [bay], r, colH, placements, seq++)
            put(t2, [bay + 1], r, colH, placements, seq++)
            bay += 2
          } else {
            put(t, [bay], r, colH, placements, seq++)
            bay += 1
          }
        } else {
          break // 仅剩 40ft 但末端无成对贝位
        }
      }
    }
  }

  function put(it, baysArr, r, colH, placements, seq) {
    it.placed = true
    const bottom = Math.max(...baysArr.map((b) => colH[r][b]))
    const x =
      baysArr.length === 2
        ? (bayCenterX(baysArr[0]) + bayCenterX(baysArr[1])) / 2
        : bayCenterX(baysArr[0])
    const y = bottom + it.h / 2
    const z = rowCenterZ(r)
    for (const b of baysArr) colH[r][b] += it.h
    placements.push({
      id: placements.length,
      x,
      y,
      z,
      l: it.l,
      w: it.w,
      h: it.h,
      color: it.color,
      name: it.name,
      delay: seq * STAGGER,
      dur: DROP_DUR,
      t: 0,
    })
  }

  // 统计报告
  const placedCount = {}
  for (const p of placements)
    placedCount[p.name] = (placedCount[p.name] || 0) + 1
  const report = Object.keys(requested).map((name) => ({
    name,
    requested: requested[name],
    placed: placedCount[name] || 0,
    left: (requested[name] || 0) - (placedCount[name] || 0),
  }))
  return {
    placements,
    report,
    totalRequested: items.length,
    totalPlaced: placements.length,
  }
}

/* ---------- 响应式数据 ---------- */
const containers = reactive([])
const meshes = []

function rebuild() {
  const res = packAndPlace(props.config.types)
  containers.splice(0, containers.length, ...res.placements)
  meshes.length = 0
  loadElapsed = 0
  props.status.total = res.totalRequested
  props.status.placed = 0
  props.status.report = res.report
  props.status.loaded = res.totalPlaced
}

/* ---------- 动画循环 ---------- */
const shipGroup = ref()
const wakeMat = ref()
const bowMat = ref()
let elapsed = 0 // 环境时间：海面流动 / 船体摇摆（始终推进）
let loadElapsed = 0 // 装船进度时间（受启动/停止控制）

const { onLoop } = useRenderLoop()
onLoop(({ delta }) => {
  elapsed += delta
  const t = elapsed
  if (props.config.running) loadElapsed += delta * props.config.speed
  if (loadElapsed < 0) loadElapsed = 0

  // 船在海上航行：升沉 + 纵摇 + 横摇
  if (shipGroup.value) {
    shipGroup.value.position.y = Math.sin(t * 0.6) * 0.22
    shipGroup.value.rotation.z = Math.sin(t * 0.5) * 0.03
    shipGroup.value.rotation.x = Math.sin(t * 0.37 + 1.2) * 0.018
  }

  // 海面向后流动 => 前进感；浪花脉动
  if (waterMap) waterMap.offset.x -= delta * 0.05
  if (bowMat.value) bowMat.value.opacity = 0.35 + Math.sin(t * 4) * 0.12
  if (wakeMat.value) wakeMat.value.opacity = 0.4 + Math.sin(t * 2) * 0.08

  // 集装箱装载（作为船体子节点，随船摇摆）
  let placed = 0
  for (const c of containers) {
    const local = (loadElapsed - c.delay) / c.dur
    const m = meshes[c.id]
    if (local <= 0) {
      c.t = 0
      if (m) m.visible = false
      continue
    }
    c.t = local >= 1 ? 1 : local
    const startY = c.y + DROP_H
    const y = c.y + (startY - c.y) * (1 - easeOut(Math.min(Math.max(c.t, 0), 1)))
    if (m) {
      m.visible = true
      m.position.set(c.x, y, c.z)
    }
    if (local >= 1) placed++
  }
  props.status.placed = placed
})

watch(() => props.config.types, rebuild, { deep: true })
watch(() => props.config.revision, () => {
  loadElapsed = 0
})

onMounted(rebuild)
</script>

<template>
  <TresGroup>
    <!-- 水面（流动纹理，制造前进感） -->
    <TresMesh :rotation="[-Math.PI / 2, 0, 0]" :position="[0, -HULL_DEPTH - 0.1, 0]" receive-shadow>
      <TresPlaneGeometry :args="[800, 800]" />
      <TresMeshStandardMaterial :map="waterMap" color="#ffffff" :roughness="0.35" :metalness="0.25" />
    </TresMesh>

    <!-- 船艏浪花 -->
    <TresMesh
      :rotation="[-Math.PI / 2, 0, 0]"
      :position="[bowTipX + 1, -HULL_DEPTH - 0.05, 0]"
    >
      <TresPlaneGeometry :args="[beam * 0.9, beam * 0.9]" />
      <TresMeshBasicMaterial ref="bowMat" :map="bowMap" :transparent="true" :depth-write="false" :opacity="0.45" />
    </TresMesh>

    <!-- 船尾航迹（尾流） -->
    <TresMesh
      :rotation="[-Math.PI / 2, 0, 0]"
      :position="[-(containerBlockLen / 2 + STERN_OVERHANG) - 30, -HULL_DEPTH - 0.05, 0]"
    >
      <TresPlaneGeometry :args="[60, beam * 1.4]" />
      <TresMeshBasicMaterial ref="wakeMat" :map="wakeMap" :transparent="true" :depth-write="false" :opacity="0.5" />
    </TresMesh>

    <!-- 货轮（随浪起伏） -->
    <TresGroup ref="shipGroup">
      <primitive :object="hullMesh" />

      <!-- 船体两侧公司名 -->
      <TresMesh :position="[0, -1.5, beam / 2 + 0.06]">
        <TresPlaneGeometry :args="[18, 4.5]" />
        <TresMeshBasicMaterial :map="companySign" :transparent="true" :depth-write="false" />
      </TresMesh>
      <TresMesh :position="[0, -1.5, -(beam / 2 + 0.06)]" :rotation="[0, Math.PI, 0]">
        <TresPlaneGeometry :args="[18, 4.5]" />
        <TresMeshBasicMaterial :map="companySign" :transparent="true" :depth-write="false" />
      </TresMesh>

      <!-- 长颈鹿吉祥物（立船艏） -->
      <primitive :object="giraffe" />

      <!-- 球鼻艏（贴艏柱水下，椭球状） -->
      <TresMesh :position="[bowTipX - 2.5, -2.6, 0]" :scale="[1.5, 0.95, 1.8]" cast-shadow>
        <TresSphereGeometry :args="[2.2, 20, 16]" />
        <TresMeshStandardMaterial color="#7d231c" :roughness="0.7" />
      </TresMesh>

      <!-- 艉部上层建筑（低矮，置于船艉悬伸区，不遮挡装船） -->
      <TresMesh
        :position="[-containerBlockLen / 2 - STERN_OVERHANG + 4, 3, 0]"
        cast-shadow
      >
        <TresBoxGeometry :args="[7, 6, beam * 0.85]" />
        <TresMeshStandardMaterial color="#ecf0f1" :roughness="0.7" />
      </TresMesh>
      <TresMesh
        :position="[-containerBlockLen / 2 - STERN_OVERHANG + 4, 7, 0]"
        cast-shadow
      >
        <TresBoxGeometry :args="[3, 2, 3]" />
        <TresMeshStandardMaterial color="#2c3e50" />
      </TresMesh>

      <!-- 集装箱：作为船体子节点，随船摇摆；自下而上落入船舱（无弹跳） -->
      <TresMesh
        v-for="c in containers"
        :key="c.id"
        :ref="(el) => { if (el) meshes[c.id] = el }"
        :visible="false"
        cast-shadow
        receive-shadow
      >
        <TresBoxGeometry :args="[c.l, c.h, c.w]" />
        <TresMeshStandardMaterial :color="c.color" :roughness="0.65" :metalness="0.1" />
        <!-- 长侧面型号（白字） -->
        <TresMesh :position="[0, 0, c.w / 2 + 0.02]">
          <TresPlaneGeometry :args="[c.l * 0.92, c.h * 0.92]" />
          <TresMeshBasicMaterial
            :map="labelTex(c.name, c.l, c.h)"
            :transparent="true"
            :depth-write="false"
          />
        </TresMesh>
        <TresMesh :rotation="[0, Math.PI, 0]" :position="[0, 0, -(c.w / 2 + 0.02)]">
          <TresPlaneGeometry :args="[c.l * 0.92, c.h * 0.92]" />
          <TresMeshBasicMaterial
            :map="labelTex(c.name, c.l, c.h)"
            :transparent="true"
            :depth-write="false"
          />
        </TresMesh>
      </TresMesh>
    </TresGroup>
  </TresGroup>
</template>
