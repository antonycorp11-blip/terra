/// <reference lib="webworker" />
import { elevationAt, moistureAt, terrainField, valueNoise } from '../../engine/terrain'
import { MAP_HEIGHT, MAP_WIDTH } from '../../engine/geography'
import { buildMesh, isRiverCell } from '../../engine/mesh'

/**
 * Off the main thread: paints the terrain raster (biome colours, hillshade, land mask) and lists the
 * vector details the renderer draws crisply at screen resolution (trees, peaks, rivers).
 */
export interface TerrainRequest { seed: number; scale: number; details: boolean }
export interface TerrainResult {
  scale: number; width: number; height: number; color: ArrayBuffer; mask: ArrayBuffer
  /** [x, y, size, variant] per tree and per peak */
  trees?: Float32Array; peaks?: Float32Array
  /** [x1, y1, x2, y2, width] per river segment */
  rivers?: Float32Array
}

type RGB = [number, number, number]
const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
const sm = (a: number, b: number, x: number) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t) }
const SEA_S = hex('#4a90a0'), SEA_D = hex('#173b4f'), SAND = hex('#d3c495'), DRY = hex('#c2b26e'), MID = hex('#9aad5c'), WET = hex('#6b8c46'), FOR = hex('#4a6b35'), HILL = hex('#958f63'), MTN = hex('#8e8576'), ROCK = hex('#aaa293'), SNOW = hex('#f1efea')

function details(seed: number) {
  const mesh = buildMesh(seed), trees: number[] = [], peaks: number[] = [], rivers: number[] = []
  for (let i = 0; i < mesh.points.length; i++) {
    if (!mesh.land[i]) continue
    const e = mesh.elevation[i], m = mesh.moisture[i], [px, py] = mesh.points[i]
    const h = (n: number) => ((Math.imul(i + 1, 2654435761) >>> n) & 1023) / 1023
    if (m > .57 && e > .03 && e < .4) for (let k = 0; k < 3; k++) trees.push(px + (h(k * 3) - .5) * 9, py + (h(k * 3 + 11) - .5) * 9, 1.5 + h(k + 20), h(k + 4))
    else if (e > .5 && e < .78 && h(2) < .45) peaks.push(px, py + 3, 5 + e * 7 + h(5) * 3, h(9))
    if (isRiverCell(mesh, i) && mesh.parent[i] >= 0) { const j = mesh.parent[i]; rivers.push(px, py, mesh.points[j][0], mesh.points[j][1], Math.min(2.2, .35 + Math.sqrt(mesh.flow[i]) / 11)) }
  }
  // Painter's order: farther (higher) glyphs first.
  const sortBy = (arr: number[], stride: number) => { const rows: number[][] = []; for (let k = 0; k < arr.length; k += stride) rows.push(arr.slice(k, k + stride)); rows.sort((a, b) => a[1] - b[1]); return new Float32Array(rows.flat()) }
  return { trees: sortBy(trees, 4), peaks: sortBy(peaks, 4), rivers: new Float32Array(rivers) }
}

self.onmessage = (event: MessageEvent<TerrainRequest>) => {
  const { seed, scale } = event.data
  const field = terrainField(seed)
  const W = Math.round(MAP_WIDTH * scale), H = Math.round(MAP_HEIGHT * scale)
  const E = new Float32Array(W * H)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) E[y * W + x] = elevationAt(field, x / scale, y / scale)
  const color = new Uint8ClampedArray(W * H * 4), mask = new Uint8ClampedArray(W * H * 4)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const k = y * W + x, e = E[k], wx = x / scale, wy = y / scale
    let c: RGB
    if (e < 0) {
      c = mix(SEA_S, SEA_D, Math.min(1, -e * 4))
      const wave = valueNoise(seed + 91, wx / 9, wy / 3.5)
      if (wave > .7) c = mix(c, [c[0] + 26, c[1] + 30, c[2] + 30], (wave - .7) * 2.2)
      // Soft alpha at the shoreline keeps the clipped political layer smooth when upscaled.
      mask[k * 4 + 3] = Math.max(0, Math.min(255, (e + .012) / .012 * 255))
    } else {
      const m = moistureAt(seed, wx, wy)
      let b = m < .45 ? mix(DRY, MID, sm(.32, .45, m)) : mix(MID, WET, sm(.45, .62, m))
      b = mix(SAND, b, sm(0, .03, e))
      b = mix(b, FOR, sm(.55, .63, m) * (1 - sm(.36, .46, e)))
      b = mix(b, HILL, sm(.28, .44, e)); b = mix(b, MTN, sm(.44, .58, e)); b = mix(b, ROCK, sm(.6, .7, e)); b = mix(b, SNOW, sm(.72, .82, e))
      const ex = E[k + (x < W - 1 ? 1 : 0)] - E[k - (x > 0 ? 1 : 0)], ey = E[k + (y < H - 1 ? W : 0)] - E[k - (y > 0 ? W : 0)]
      const shade = Math.max(.55, Math.min(1.42, 1 + (-ex - ey) * scale * 17))
      c = [b[0] * shade, b[1] * shade, b[2] * shade]
      mask[k * 4 + 3] = 255
    }
    mask[k * 4] = mask[k * 4 + 1] = mask[k * 4 + 2] = 255
    const grain = (valueNoise(seed + 5, x * 1.7 / scale, y * 1.7 / scale) - .5) * 10
    color[k * 4] = c[0] + grain; color[k * 4 + 1] = c[1] + grain; color[k * 4 + 2] = c[2] + grain; color[k * 4 + 3] = 255
  }
  const result: TerrainResult = { scale, width: W, height: H, color: color.buffer, mask: mask.buffer, ...(event.data.details ? details(seed) : {}) }
  const transfer: Transferable[] = [color.buffer, mask.buffer]
  if (result.trees) transfer.push(result.trees.buffer, result.peaks!.buffer, result.rivers!.buffer)
  ;(self as unknown as Worker).postMessage(result, transfer)
}
