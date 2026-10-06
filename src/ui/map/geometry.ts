import type { Point, Province, World } from '../../engine/types'

/** Shared province edges, classified once per world: provinces, fiefs and realms meet along them. */
export interface Border { a: string; b: string; d: string }
const key = (p: Point) => `${Math.round(p[0] * 1000)},${Math.round(p[1] * 1000)}`
// Geometry never changes during a campaign; landPolygons is shared by every edited state.
const cache = new WeakMap<object, Border[]>()
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
  const borders: Border[] = []
  for (const [pk, segs] of pairs) {
    const [a, b] = pk.split('|')
    borders.push({ a, b, d: segs.map(([p, q]) => `M${p[0].toFixed(1)} ${p[1].toFixed(1)}L${q[0].toFixed(1)} ${q[1].toFixed(1)}`).join('') })
  }
  cache.set(world.landPolygons, borders)
  return borders
}
export const ringPath = (p: Province) => p.polygons.map(r => 'M' + r.map(q => `${q[0].toFixed(1)} ${q[1].toFixed(1)}`).join('L') + 'Z').join('')
/** Label size grows with the province so large territories read from afar. */
export const labelSize = (p: Province) => Math.max(5.5, Math.min(13, 3.6 + Math.sqrt(p.area) * .19))
