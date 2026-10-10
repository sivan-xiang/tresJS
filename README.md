# 集装箱装船演示 · TresJS

基于 **Vue 3 + Vite + TresJS（Three.js）** 的 3D 集装箱配载装船动画演示。

以「长帆国际物流（LONGSAILING）」为品牌背景，船艏立有长颈鹿吉祥物，演示集装箱按船舱规格**最优配载**、逐箱落舱装船，以及货轮在海上航行的效果。

## 技术栈

- Vue 3 `<script setup>`
- Vite 6
- TresJS（`@tresjs/core`、`@tresjs/cientos`）—— 声明式 Three.js
- Three.js（挤出几何体船体、Canvas 贴图标签 / 海面 / 浪花）

## 功能特性

- 🚢 **真实船体**：`ExtrudeGeometry` 外飘艏柱 + 球鼻艏 + 艉部低矮上层建筑（不遮挡装船区）。
- 📦 **多规格集装箱**：20GP / 20HQ / 40GP / 40HQ，尺寸各异（宽 2.44m，GP 高 2.59m，HQ 高 2.9m，20ft≈6m，40ft≈12m）。
- 🧮 **最优配载算法**：40ft 优先、贝位成对（40ft 占相邻两贝）、自下而上分层，尽量满载少浪费，并输出「请求 / 已装 / 剩余装不下」报告。
- ▶️ **启停 + 调速**：可启动 / 停止装载动画，调节速度；落舱为平滑减速（无弹跳）。
- 🌊 **海上航行**：升沉 + 纵摇 + 横摇，海面流动纹理，艏艉浪花尾流；装载进度与航行时间解耦（停止只停装载）。
- 🏷️ **型号标识**：每箱顶面白字标注型号（无描边），船体两舷印「长帆国际物流 / LONGSAILING」。

## 本地运行

```bash
npm install
npm run dev      # 开发预览 http://localhost:5173/
npm run build    # 产物输出到 dist/（base 为相对路径 './'）
```

## 在线预览

> GitHub Pages（启用后生效）：**https://sivan-xiang.github.io/tresJS/**

仓库已配置 `.github/workflows/deploy.yml`：推送 `main` 时自动构建并发布到 Pages。
首次需在仓库 **Settings → Pages → Source 选 "GitHub Actions"** 开启一次。

## 船舶与配载规格

| 项目 | 数值 |
| --- | --- |
| 贝位（Bay） | 10 |
| 列（Row） | 8 |
| 层（Tier） | 4 |
| 总箱位 | 320 |
| 最大 TEU | 640（40ft 折算 2 TEU） |

## 目录结构

```
container-loading-3d/
├─ index.html
├─ vite.config.js          # base: './'（本地与 Pages 子路径均可用）
├─ src/
│  ├─ main.js
│  ├─ App.vue              # 控制面板（类型/数量/启停/配载报告）
│  ├─ shipConfig.js        # 船舶规格与集装箱真实尺度
│  ├─ style.css
│  └─ components/
│     └─ Scene.vue         # 3D 场景：船体/集装箱/海面/动画
└─ .github/workflows/
   └─ deploy.yml           # GitHub Pages 自动部署
```
