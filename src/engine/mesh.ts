import { Delaunay } from 'd3-delaunay'
import { MAP_HEIGHT, MAP_WIDTH, polygonArea } from './geography'
import { rng } from './random'
import { elevationAt, moistureAt, noiseHash, terrainField } from './terrain'
import type { Point } from './types'

/**
 * Fine Voronoi mesh (~8 000 cells) over the terrain field. Provinces are grown on it so borders
 * follow ridges and rivers, and sizes vary with the land: fertile lowlands split into many small
 * provinces, mountains form few large ones, coasts produce narrow strips.
 */
export interface Mesh {
  points: Point[]; polygons: Point[][]; neighbors: number[][]
  elevation: Float32Array; moisture: Float32Array; land: Uint8Array
  parent: Int32Array; flow: Float32Array; component: Int32Array
}
export const MESH_SPACING = 10.5
export const RIVER_FLOW = 30
export const isRiverCell = (m: Mesh, i: number) => m.land[i] === 1 && m.flow[i] > RIVER_FLOW

class Heap {
  private a: [number, number][] = []
  get size() { return this.a.length }
  push(p: number, v: number) { const a = this.a; a.push([p, v]); let i = a.length - 1; while (i > 0) { const j = (i - 1) >> 1; if (a[j][0] <= a[i][0]) break; [a[i], a[j]] = [a[j], a[i]]; i = j } }
  pop(): [number, number] { const a = this.a, top = a[0], last = a.pop()!; if (a.length) { a[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < a.length && a[l][0] < a[m][0]) m = l; if (r < a.length && a[r][0] < a[m][0]) m = r; if (m === i) break; [a[i], a[m]] = [a[m], a[i]]; i = m } } return top }
}

const meshes = new Map<number, Mesh>()
export function buildMesh(seed: number): Mesh {
  const cached = meshes.get(seed)
  if (cached) return cached
  const field = terrainField(seed), random = rng(seed ^ 0x51ed)
  const points: Point[] = []
  for (let r = 0, y = MESH_SPACING * .45; y < MAP_HEIGHT; r++, y += MESH_SPACING * .866)
    for (let x = (r % 2 ? MESH_SPACING * .5 : 0) + MESH_SPACING * .25; x < MAP_WIDTH; x += MESH_SPACING)
      points.push([x + (random() - .5) * MESH_SPACING * .55, y + (random() - .5) * MESH_SPACING * .55])
  const delaunay = Delaunay.from(points), voronoi = delaunay.voronoi([0, 0, MAP_WIDTH, MAP_HEIGHT])
  const N = points.length
  const polygons = points.map((_, i) => (voronoi.cellPolygon(i) ?? []).slice(0, -1).map(p => [p[0], p[1]] as Point))
  const neighbors = points.map((_, i) => [...delaunay.neighbors(i)])
  const elevation = new Float32Array(N), moisture = new Float32Array(N), land = new Uint8Array(N)
  for (let i = 0; i < N; i++) { elevation[i] = elevationAt(field, points[i][0], points[i][1]); moisture[i] = moistureAt(seed, points[i][0], points[i][1]); land[i] = elevation[i] > 0 ? 1 : 0 }
  // Connected land components; islets too small to hold a province return to the sea.
  const component = new Int32Array(N).fill(-1)
  let components = 0
  for (let i = 0; i < N; i++) {
    if (!land[i] || component[i] >= 0) continue
    const members = [i]; component[i] = components
    for (let h = 0; h < members.length; h++) for (const j of neighbors[members[h]]) if (land[j] && component[j] < 0) { component[j] = components; members.push(j) }
    if (members.length < 7) { for (const m of members) { land[m] = 0; component[m] = -1 } } else components++
  }
  // Priority-flood drainage: every land cell drains to the sea through `parent`.
  const parent = new Int32Array(N).fill(-1), flow = new Float32Array(N), order: number[] = []
  {
    const done = new Uint8Array(N), heap = new Heap()
    for (let i = 0; i < N; i++) if (!land[i]) { done[i] = 1; heap.push(elevation[i], i) }
    while (heap.size) {
      const [level, i] = heap.pop(); order.push(i)
      for (const j of neighbors[i]) if (!done[j]) { done[j] = 1; parent[j] = i; heap.push(Math.max(elevation[j], level + 1e-5), j) }
    }
    for (let i = 0; i < N; i++) flow[i] = land[i] ? .45 + moisture[i] : 0
    for (let k = order.length - 1; k >= 0; k--) { const i = order[k]; if (land[i] && parent[i] >= 0) flow[parent[i]] += flow[i] }
  }
  const mesh = { points, polygons, neighbors, elevation, moisture, land, parent, flow, component }
  meshes.set(seed, mesh)
  return mesh
}

/** Exactly `count` provinces: one per island, the rest spread over the mainland with density following fertility. */
export function partitionProvinces(mesh: Mesh, count: number, seed: number): Int32Array {
  const N = mesh.points.length, { land, elevation, component, points, neighbors } = mesh
  const sizes = new Map<number, number>()
  for (let i = 0; i < N; i++) if (land[i]) sizes.set(component[i], (sizes.get(component[i]) ?? 0) + 1)
  const mainland = [...sizes.entries()].sort((a, b) => b[1] - a[1])[0][0]
  const islandSeeds: number[] = []
  // Each island receives its most central cell as seed (islands get the last province ids).
  for (const [comp] of [...sizes.entries()].filter(([c]) => c !== mainland).sort((a, b) => a[0] - b[0])) {
    const cells: number[] = []; for (let i = 0; i < N; i++) if (component[i] === comp) cells.push(i)
    const cx = cells.reduce((s, i) => s + points[i][0], 0) / cells.length, cy = cells.reduce((s, i) => s + points[i][1], 0) / cells.length
    islandSeeds.push(cells.reduce((b, i) => Math.hypot(points[i][0] - cx, points[i][1] - cy) < Math.hypot(points[b][0] - cx, points[b][1] - cy) ? i : b))
  }
  const mainCells: number[] = []; for (let i = 0; i < N; i++) if (component[i] === mainland) mainCells.push(i)
  const weight = new Float32Array(N)
  for (const i of mainCells) {
    const e = elevation[i]
    let w = e > .55 ? .42 : e > .38 ? .62 : e > .25 ? .85 : 1
    if (isRiverCell(mesh, i)) w *= 1.18
    if (neighbors[i].some(j => !land[j])) w *= 1.08
    weight[i] = w * (.72 + .56 * noiseHash(seed + 3, i, 17))
  }
  const minD = new Float32Array(N).fill(1e9)
  const update = (s: number) => { for (const i of mainCells) { const d = Math.hypot(points[i][0] - points[s][0], points[i][1] - points[s][1]); if (d < minD[i]) minD[i] = d } }
  const seeds: number[] = []
  const first = mainCells.reduce((b, i) => weight[i] > weight[b] ? i : b)
  seeds.push(first); update(first)
  while (seeds.length < count - islandSeeds.length) {
    let best = -1, score = -1
    for (const i of mainCells) { const v = minD[i] * weight[i]; if (v > score) { score = v; best = i } }
    seeds.push(best); update(best)
  }
  seeds.push(...islandSeeds)
  // Multi-source growth: borders settle on ridges and rivers because crossing them is expensive.
  const prov = new Int32Array(N).fill(-1), dist = new Float64Array(N).fill(Infinity), heap = new Heap()
  const speed = seeds.map((_, k) => .62 + noiseHash(seed + 5, k, 99) * 1.05)
  seeds.forEach((s, k) => { dist[s] = 0; prov[s] = k; heap.push(0, s) })
  const terrainCost = (j: number) => 1 + (elevation[j] > .42 ? (elevation[j] - .42) * 14 : 0) + (mesh.moisture[j] > .6 && elevation[j] < .4 ? .3 : 0)
  while (heap.size) {
    const [d, i] = heap.pop()
    if (d > dist[i]) continue
    for (const j of neighbors[i]) {
      if (!land[j]) continue
      let c = Math.hypot(points[j][0] - points[i][0], points[j][1] - points[i][1]) * terrainCost(j) / speed[prov[i]]
      if ((isRiverCell(mesh, i) || isRiverCell(mesh, j)) && mesh.parent[i] !== j && mesh.parent[j] !== i) c += 24
      if (Math.abs(elevation[j] - elevation[i]) > .06) c += 7
      if (d + c < dist[j]) { dist[j] = d + c; prov[j] = prov[i]; heap.push(d + c, j) }
    }
  }
  return prov
}

const vkey = (p: Point) => `${Math.round(p[0] * 1000)},${Math.round(p[1] * 1000)}`
/** Traces the outline of every label in one pass into closed rings (largest first; holes included). */
export function traceLabelRings(mesh: Mesh, label: Int32Array): Map<number, Point[][]> {
  const owners = edgeOwners(mesh)
  const nexts = new Map<number, Map<string, [Point, Point]>>()
  for (let i = 0; i < mesh.points.length; i++) {
    const L = label[i]
    if (L < 0) continue
    const poly = mesh.polygons[i]
    for (let k = 0; k < poly.length; k++) {
      const a = poly[k], b = poly[(k + 1) % poly.length], ka = vkey(a), kb = vkey(b)
      const pair = owners.get(ka < kb ? ka + '|' + kb : kb + '|' + ka)
      const other = pair ? (pair[0] === i ? pair[1] : pair[0]) : undefined
      if (other !== undefined && label[other] === L) continue
      let m = nexts.get(L); if (!m) { m = new Map(); nexts.set(L, m) }
      m.set(ka, [a, b])
    }
  }
  const result = new Map<number, Point[][]>()
  for (const [L, m] of nexts) {
    const rings: Point[][] = [], used = new Set<string>()
    for (const start of m.keys()) {
      if (used.has(start)) continue
      const ring: Point[] = []
      let key = start
      for (let guard = 0; guard < 200000 && !used.has(key) && m.has(key); guard++) { used.add(key); const [a, b] = m.get(key)!; ring.push(a); key = vkey(b) }
      if (ring.length >= 3) rings.push(ring)
    }
    result.set(L, rings.sort((a, b) => polygonArea(b) - polygonArea(a)))
  }
  return result
}
const owners = new WeakMap<Mesh, Map<string, number[]>>()
function edgeOwners(mesh: Mesh) {
  let map = owners.get(mesh)
  if (map) return map
  map = new Map()
  mesh.polygons.forEach((poly, i) => {
    for (let k = 0; k < poly.length; k++) {
      const ka = vkey(poly[k]), kb = vkey(poly[(k + 1) % poly.length]), key = ka < kb ? ka + '|' + kb : kb + '|' + ka
      const list = map!.get(key); if (list) list.push(i); else map!.set(key, [i])
    }
  })
  owners.set(mesh, map)
  return map
}

/** River polylines from flow accumulation; each starts at a source and ends at the sea or a confluence. */
export function traceRivers(mesh: Mesh): Point[][] {
  const N = mesh.points.length, river = (i: number) => isRiverCell(mesh, i)
  const hasUpstream = new Uint8Array(N)
  for (let i = 0; i < N; i++) if (river(i) && mesh.parent[i] >= 0) hasUpstream[mesh.parent[i]] = 1
  const drawn = new Uint8Array(N), lines: Point[][] = []
  for (let i = 0; i < N; i++) {
    if (!river(i) || hasUpstream[i]) continue
    const line: Point[] = []
    let c = i
    while (c >= 0) {
      line.push(mesh.points[c])
      if (drawn[c] || !mesh.land[c]) break
      drawn[c] = 1; c = mesh.parent[c]
    }
    if (line.length >= 4) lines.push(line)
  }
  return lines
}
