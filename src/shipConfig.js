// 船舶规格与集装箱尺度（单位：米，贴近真实标准）
// 货舱以 20ft 贝位（bay）为最小纵向单元，40ft 占 2 个相邻贝位。

export const SHIP = {
  bays: 10, // 纵向 20ft 贝位数
  rows: 8, // 横向列数（船宽方向）
  tiers: 4, // 最大堆高层数
}

export const BAY_LEN = 6.06 // 20ft 箱长（含间隙）
export const ROW_W = 2.5 // 横向每列中心距
export const CONT_W = 2.44 // 集装箱真实宽度
export const HULL_DEPTH = 4 // 吃水/船体在水下深度
export const STERN_OVERHANG = 9 // 船艉悬伸（布置上层建筑）
export const BOW_OVERHANG = 6 // 船艏悬伸

export const containerBlockLen = SHIP.bays * BAY_LEN
export const hullLen =
  containerBlockLen + STERN_OVERHANG + BOW_OVERHANG
export const beam = SHIP.rows * ROW_W + 5

// 单箱可视化长度（略小于真实，留出间隙）
export const visualLen = (ft) => (ft >= 40 ? 12.0 : 6.0)

// 贝位中心 X（沿船长方）
export const bayCenterX = (b) =>
  (b - (SHIP.bays - 1) / 2) * BAY_LEN
// 横向列中心 Z
export const rowCenterZ = (r) => (r - (SHIP.rows - 1) / 2) * ROW_W

// 船舶理论最大装载能力（全部装 20ft 时）
export const SLOT_COUNT = SHIP.bays * SHIP.rows * SHIP.tiers
export const MAX_TEU = SLOT_COUNT * 2
