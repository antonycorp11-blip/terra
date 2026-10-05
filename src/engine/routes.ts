import type { Id, Point, Province, World } from './types'

function edgeKey(a: Id, b: Id): string { return [a,b].sort().join('|') }
function routeTree(provinces: Province[], startId: Id, roads: [Id,Id][] = []): Map<Id,Id> {
  const byId = new Map(provinces.map(item => [item.id,item]))
  if (!byId.has(startId)) return new Map()
  const roadSet = new Set(roads.map(([a,b]) => edgeKey(a,b)))
  const cost = new Map<Id,number>([[startId,0]])
  const previous = new Map<Id,Id>()
  const pending = new Set<Id>([startId])
  while (pending.size) {
    let current: Id | null = null
    for (const id of pending) if (current === null || cost.get(id)! < cost.get(current)!) current = id
    if (!current) break
    pending.delete(current)
    const origin = byId.get(current)!
    for (const neighborId of origin.neighbors) {
      const neighbor = byId.get(neighborId)
      if (!neighbor) continue
      const distance = Math.hypot(origin.center[0]-neighbor.center[0],origin.center[1]-neighbor.center[1])
      const terrainCost = neighbor.terrain === 'montanha' ? 4.2 : neighbor.terrain === 'floresta' ? 1.6 : neighbor.terrain === 'colina' ? 1.4 : 1
      const borderCost = neighbor.realmId !== origin.realmId ? 1.3 : 1
      const roadDiscount = roadSet.has(edgeKey(current,neighborId)) ? .6 : 1
      const next = cost.get(current)! + distance * terrainCost * borderCost * roadDiscount
      if (next < (cost.get(neighborId) ?? Infinity)) { cost.set(neighborId,next); previous.set(neighborId,current); pending.add(neighborId) }
    }
  }
  return previous
}
function restorePath(previous: Map<Id,Id>, startId: Id, endId: Id): Id[] {
  if (startId === endId) return [startId]
  if (!previous.has(endId)) return []
  const path = [endId]
  while (path[0] !== startId) path.unshift(previous.get(path[0])!)
  return path
}
export function shortestPath(provinces: Province[], startId: Id, endId: Id, roads: [Id,Id][] = []): Id[] {
  return restorePath(routeTree(provinces,startId,roads),startId,endId)
}

export function buildRoads(world: Pick<World,'provinces'|'fiefs'|'realms'>): [Id,Id][] {
  const edges = new Map<string,[Id,Id]>()
  const byId = new Map(world.provinces.map(item => [item.id,item]))
  function roadTree(startId: Id): Map<Id,Id> {
    const previous = new Map<Id,Id>()
    const queue: Id[] = [startId]
    const visited = new Set<Id>(queue)
    for (let index=0;index<queue.length;index++) {
      const current = byId.get(queue[index])!
      const neighbors = [...current.neighbors].sort((a,b) => terrainWeight(byId.get(a)!) - terrainWeight(byId.get(b)!))
      for (const neighbor of neighbors) if (!visited.has(neighbor)) { visited.add(neighbor); previous.set(neighbor,current.id); queue.push(neighbor) }
    }
    return previous
  }
  function addPath(path: Id[]) {
    for (let i=1;i<path.length;i++) edges.set(edgeKey(path[i-1],path[i]),[path[i-1],path[i]])
  }
  for (const fief of world.fiefs) {
    const tree = roadTree(fief.capitalProvinceId)
    for (const provinceId of fief.provinceIds) addPath(restorePath(tree,fief.capitalProvinceId,provinceId))
  }
  for (const realm of world.realms) {
    const capitals = world.fiefs.filter(fief => fief.realmId === realm.id).map(fief => fief.capitalProvinceId)
    const tree = roadTree(capitals[0])
    for (let i=1;i<capitals.length;i++) addPath(restorePath(tree,capitals[0],capitals[i]))
  }
  return [...edges.values()].filter(([a,b]) => byId.get(a)?.neighbors.includes(b))
}
function terrainWeight(province: Province): number { return province.terrain === 'montanha' ? 4 : province.terrain === 'floresta' ? 2 : 1 }

export function buildRivers(provinces: Province[], landPolygon: Point[], seed: number): Point[][] {
  const byId = new Map(provinces.map(item => [item.id,item]))
  const coastDistance = (point: Point) => Math.min(...landPolygon.map(vertex => Math.hypot(point[0]-vertex[0],point[1]-vertex[1])))
  const distance = new Map<Id,number>()
  const queue: Id[] = []
  for (const province of provinces) if (coastDistance(province.center) < 48) { distance.set(province.id,0); queue.push(province.id) }
  for (let index=0;index<queue.length;index++) {
    const current = byId.get(queue[index])!
    for (const neighborId of current.neighbors) if (!distance.has(neighborId)) { distance.set(neighborId,distance.get(current.id)!+1); queue.push(neighborId) }
  }
  for (const province of provinces) province.elevation = (distance.get(province.id) ?? 0) * 10 + ((province.center[0]*3 + province.center[1]*5 + seed) % 5)
  const sources = [...provinces].filter(item => (distance.get(item.id) ?? 0) >= 2).sort((a,b) => b.elevation-a.elevation)
  const rivers: Point[][] = []
  const used = new Set<Id>()
  for (const source of sources) {
    if (rivers.length >= 9) break
    if (rivers.some(river => Math.hypot(river[0][0]-source.center[0],river[0][1]-source.center[1]) < 80)) continue
    const route: Province[] = [source]
    let current = source
    while ((distance.get(current.id) ?? 0) > 0 && route.length < 20) {
      const lower = current.neighbors.map(id => byId.get(id)!).filter(item => item && (distance.get(item.id) ?? Infinity) < (distance.get(current.id) ?? 0)).sort((a,b) => a.elevation-b.elevation)[0]
      if (!lower || used.has(lower.id)) break
      route.push(lower); current = lower
    }
    if (route.length >= 3) { route.forEach(item => used.add(item.id)); const last=route[route.length-1].center;const mouth=landPolygon.reduce((best,p)=>Math.hypot(p[0]-last[0],p[1]-last[1])<Math.hypot(best[0]-last[0],best[1]-last[1])?p:best);rivers.push([...route.map(item=>item.center),mouth]) }
  }
  return rivers
}
