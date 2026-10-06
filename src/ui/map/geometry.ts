import type { Point, Province, World } from '../../engine/types'

/** Shared province edges, classified once per world: provinces, fiefs and realms meet along them. */
export interface Border { a: string; b: string; d: string }
const key = (p: Point) => `${Math.round(p[0] * 1000)},${Math.round(p[1] * 1000)}`
// Geometry never changes during a campaign; landPolygons is shared by every edited state.
const cache = new WeakMap<object, Border[]>()
const smoothCache = new WeakMap<object, Map<string, Point>>()
/**
 * Province outlines follow the cells of the terrain mesh, which leaves saw-toothed edges. Every
 * vertex shared by exactly two edges is relaxed towards its neighbours (Laplacian smoothing); vertices
 * where three provinces meet stay fixed. Each vertex moves the same way for every province that
 * uses it, so neighbours stay seamless.
 */
function smoothed(world: World): Map<string, Point> {
  const hit = smoothCache.get(world.landPolygons)
  if (hit) return hit
  const pos = new Map<string, Point>(), adj = new Map<string, Set<string>>()
  const link = (a: string, b: string) => { let s = adj.get(a); if (!s) adj.set(a, s = new Set()); s.add(b) }
  for (const p of world.provinces) for (const ring of p.polygons) for (let i = 0; i < ring.length; i++) {
    const a = ring[i], b = ring[(i + 1) % ring.length], ka = key(a), kb = key(b)
    pos.set(ka, a); pos.set(kb, b); link(ka, kb); link(kb, ka)
  }
  let cur = new Map(pos)
  for (let it = 0; it < 5; it++) {
    const next = new Map(cur)
    for (const [k, n] of adj) {
      if (n.size !== 2) continue
      const [a, b] = [...n].map(x => cur.get(x)!), p = cur.get(k)!
      next.set(k, [p[0] * .5 + (a[0] + b[0]) * .25, p[1] * .5 + (a[1] + b[1]) * .25])
    }
    cur = next
  }
  smoothCache.set(world.landPolygons, cur)
  return cur
}
/** The smoothed rings of a province, for drawing and hit tests. */
export function smoothRings(world: World, p: Province): Point[][] {
  const m = smoothed(world)
  return p.polygons.map(r => r.map(q => m.get(key(q)) ?? q))
}
export function bordersOf(world: World): Border[] {
  const hit = cache.get(world.landPolygons)
  if (hit) return hit
  const owner = new Map<string, { id: string; a: Point; b: Point }>()
  const pairs = new Map<string, Point[][]>()
  for (const p of world.provinces) for (const ring of p.polygons) for (let i = 0; i < ring.length; i++) {
    const a = ring[i], b = ring[(i + 1) % ring.length], ka = key(a), kb = key(b), k = ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`
    const other = owner.get(k)
    if (!other) { owner.set(k, { id: p.id, a, b }); continue }
    if (other.id === p.id) continue
    const pk = other.id < p.id ? `${other.id}|${p.id}` : `${p.id}|${other.id}`
    const list = pairs.get(pk); if (list) list.push([a, b]); else pairs.set(pk, [[a, b]])
  }
  const borders: Border[] = [], m = smoothed(world), at = (p: Point) => m.get(key(p)) ?? p
  for (const [pk, segs] of pairs) {
    const [a, b] = pk.split('|')
    borders.push({ a, b, d: segs.map(([p0, q0]) => { const p = at(p0), q = at(q0); return `M${p[0].toFixed(1)} ${p[1].toFixed(1)}L${q[0].toFixed(1)} ${q[1].toFixed(1)}` }).join('') })
  }
  cache.set(world.landPolygons, borders)
  return borders
}
export const ringPath = (p: Province) => p.polygons.map(r => 'M' + r.map(q => `${q[0].toFixed(1)} ${q[1].toFixed(1)}`).join('L') + 'Z').join('')
/** Label size grows with the province so large territories read from afar. */
export const labelSize = (p: Province) => Math.max(5.5, Math.min(13, 3.6 + Math.sqrt(p.area) * .19))
