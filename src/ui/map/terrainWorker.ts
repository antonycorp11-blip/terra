/// <reference lib="webworker" />
import { elevationAt, moistureAt, terrainField, valueNoise } from '../../engine/terrain'
import { MAP_HEIGHT, MAP_WIDTH } from '../../engine/geography'

/**
 * Paints the terrain raster off the main thread: biome colours by elevation and moisture, hillshade
 * from the elevation gradient, and a land mask used to clip political layers to the painted coast.
 */
export interface TerrainRequest { seed: number; scale: number }
export interface TerrainResult { width: number; height: number; color: ArrayBuffer; mask: ArrayBuffer; elevation: ArrayBuffer }

type RGB = [number, number, number]
const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
const sm = (a: number, b: number, x: number) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t) }
const SEA_S = hex('#4a90a0'), SEA_D = hex('#173b4f'), SAND = hex('#d3c495'), DRY = hex('#c2b26e'), MID = hex('#9aad5c'), WET = hex('#6b8c46'), FOR = hex('#4a6b35'), HILL = hex('#958f63'), MTN = hex('#8e8576'), ROCK = hex('#aaa293'), SNOW = hex('#f1efea')

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
    } else {
      const m = moistureAt(seed, wx, wy)
      let b = m < .45 ? mix(DRY, MID, sm(.32, .45, m)) : mix(MID, WET, sm(.45, .62, m))
      b = mix(SAND, b, sm(0, .03, e))
      b = mix(b, FOR, sm(.55, .63, m) * (1 - sm(.36, .46, e)))
      b = mix(b, HILL, sm(.28, .44, e)); b = mix(b, MTN, sm(.44, .58, e)); b = mix(b, ROCK, sm(.6, .7, e)); b = mix(b, SNOW, sm(.72, .82, e))
      const ex = E[k + (x < W - 1 ? 1 : 0)] - E[k - (x > 0 ? 1 : 0)], ey = E[k + (y < H - 1 ? W : 0)] - E[k - (y > 0 ? W : 0)]
      const shade = Math.max(.55, Math.min(1.42, 1 + (-ex - ey) * scale * 17))
      c = [b[0] * shade, b[1] * shade, b[2] * shade]
      mask[k * 4] = mask[k * 4 + 1] = mask[k * 4 + 2] = 255; mask[k * 4 + 3] = 255
    }
    const grain = (valueNoise(seed + 5, x * 1.7, y * 1.7) - .5) * 10
    color[k * 4] = c[0] + grain; color[k * 4 + 1] = c[1] + grain; color[k * 4 + 2] = c[2] + grain; color[k * 4 + 3] = 255
  }
  const result: TerrainResult = { width: W, height: H, color: color.buffer, mask: mask.buffer, elevation: E.buffer }
  ;(self as unknown as Worker).postMessage(result, [color.buffer, mask.buffer, E.buffer])
}
