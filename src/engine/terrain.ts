import { createLandmasses, MAP_HEIGHT, MAP_WIDTH } from './geography'
import type { Point } from './types'

/**
 * Continuous terrain of Varedor. The canonical coastline (createLandmasses) is turned into a
 * signed-distance field and perturbed with noise, mountain ridges and inland relief. Both the
 * engine (province generation) and the renderer (terrain raster) read the same functions, so the
 * painted coast, rivers and borders always agree.
 */

export function noiseHash(seed: number, x: number, y: number): number {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(seed | 0, 1442695041)) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}
export function valueNoise(seed: number, x: number, y: number): number {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf)
  const a = noiseHash(seed, xi, yi), b = noiseHash(seed, xi + 1, yi), c = noiseHash(seed, xi, yi + 1), d = noiseHash(seed, xi + 1, yi + 1)
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
}
export function fbm(seed: number, x: number, y: number, octaves = 5): number {
  let sum = 0, amp = .5, freq = 1, norm = 0
  for (let i = 0; i < octaves; i++) { sum += amp * valueNoise(seed + i * 101, x * freq, y * freq); norm += amp; freq *= 2.03; amp *= .5 }
  return sum / norm
}
const smooth = (a: number, b: number, x: number) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t) }

export interface TerrainField { seed: number; step: number; gw: number; gh: number; sdf: Float32Array }
const fields = new Map<number, TerrainField>()

/** Signed distance (px) to the canonical coastline on a coarse grid; positive on land. */
export function terrainField(seed: number): TerrainField {
  const cached = fields.get(seed)
  if (cached) return cached
  const lands = createLandmasses(seed)
  const step = 8, gw = Math.ceil(MAP_WIDTH / step) + 1, gh = Math.ceil(MAP_HEIGHT / step) + 1
  const segs: [Point, Point][] = []
  for (const land of lands) for (let i = 0; i < land.length; i++) segs.push([land[i], land[(i + 1) % land.length]])
  // Bucket segments so each grid point only measures nearby coast.
  const B = 40, bw = Math.ceil(MAP_WIDTH / B) + 1, bh = Math.ceil(MAP_HEIGHT / B) + 1
  const buckets: number[][] = Array.from({ length: bw * bh }, () => [])
  segs.forEach(([a, b], k) => {
    const x0 = Math.max(0, Math.floor(Math.min(a[0], b[0]) / B)), x1 = Math.min(bw - 1, Math.floor(Math.max(a[0], b[0]) / B))
    const y0 = Math.max(0, Math.floor(Math.min(a[1], b[1]) / B)), y1 = Math.min(bh - 1, Math.floor(Math.max(a[1], b[1]) / B))
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) buckets[y * bw + x].push(k)
  })
  const segDist = (px: number, py: number, k: number) => {
    const [a, b] = segs[k], dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy
    const t = l2 ? Math.max(0, Math.min(1, ((px - a[0]) * dx + (py - a[1]) * dy) / l2)) : 0
    return Math.hypot(px - a[0] - t * dx, py - a[1] - t * dy)
  }
  const sdf = new Float32Array(gw * gh)
  for (let gy = 0; gy < gh; gy++) {
    const py = gy * step
    // Even-odd scanline for inside/outside over every landmass.
    const xs: number[] = []
    for (const [a, b] of segs) if ((a[1] > py) !== (b[1] > py)) xs.push(a[0] + (py - a[1]) * (b[0] - a[0]) / (b[1] - a[1]))
    xs.sort((p, q) => p - q)
    let xi = 0, inside = false
    for (let gx = 0; gx < gw; gx++) {
      const px = gx * step
      while (xi < xs.length && xs[xi] <= px) { inside = !inside; xi++ }
      const bx = Math.min(bw - 1, Math.floor(px / B)), by = Math.min(bh - 1, Math.floor(py / B))
      let best = 170
      for (let r = 0; r <= 4 && best > (r - 1) * B; r++) {
        for (let y = by - r; y <= by + r; y++) for (let x = bx - r; x <= bx + r; x++) {
          if (x < 0 || y < 0 || x >= bw || y >= bh || (Math.abs(x - bx) !== r && Math.abs(y - by) !== r)) continue
          for (const k of buckets[y * bw + x]) { const d = segDist(px, py, k); if (d < best) best = d }
        }
      }
      sdf[gy * gw + gx] = inside ? best : -best
    }
  }
  const field = { seed, step, gw, gh, sdf }
  fields.set(seed, field)
  return field
}
function sampleSdf(f: TerrainField, x: number, y: number): number {
  const fx = Math.max(0, Math.min(f.gw - 1.001, x / f.step)), fy = Math.max(0, Math.min(f.gh - 1.001, y / f.step))
  const x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0, i = y0 * f.gw + x0
  const a = f.sdf[i], b = f.sdf[i + 1], c = f.sdf[i + f.gw], d = f.sdf[i + f.gw + 1]
  return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty
}
/** Main north-south range between Cársida/Orvêndia and the west, plus the northern range and the southern highlands. */
export const RIDGES = {
  east: (y: number) => 790 + (y - 100) * .4 + 28 * Math.sin(y / 65),
  north: (x: number) => 170 + 30 * Math.sin(x / 75),
  south: (x: number) => 392 + 22 * Math.sin(x / 48),
}
/** Elevation: negative is sea. Roughly 0–0.3 lowland, 0.3–0.5 hills, above 0.5 mountains, above 0.72 snow. */
export function elevationAt(f: TerrainField, x: number, y: number): number {
  const s = f.seed, d = sampleSdf(f, x, y)
  const n = fbm(s, x / 150, y / 150) * .62 + fbm(s + 7, x / 42, y / 42, 4) * .38
  let e = Math.max(-1, Math.min(1, d / 48)) * .3 + (n - .5) * .34
  if (d > -30) {
    const inland = smooth(0, 160, d)
    e += inland * .2 * fbm(s + 11, x / 210, y / 210, 4)
    const rid = 1 - Math.abs(fbm(s + 13, x / 58, y / 58, 4) * 2 - 1)
    const east = y > 70 && y < 470 ? Math.exp(-(((x - RIDGES.east(y)) / 34) ** 2)) : 0
    const north = x > 560 ? Math.exp(-(((y - RIDGES.north(x)) / 26) ** 2)) * smooth(560, 640, x) : 0
    const south = x > 230 && x < 520 ? Math.exp(-(((y - RIDGES.south(x)) / 22) ** 2)) * smooth(230, 290, x) * (1 - smooth(470, 520, x)) : 0
    e += smooth(-10, 25, d) * (east * (.24 + .6 * rid * rid) + north * (.2 + .5 * rid * rid) + south * (.1 + .28 * rid))
  }
  return e
}
export function moistureAt(seed: number, x: number, y: number): number {
  return fbm(seed + 29, x / 140 + 20, y / 140 + 40, 4) * .85 + (1 - y / MAP_HEIGHT) * .05 + (x / MAP_WIDTH) * .1
}
