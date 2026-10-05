import { initializeCampaign } from './campaign'
import { inPolygon, polygonArea } from './geography'
import { buildMesh, isRiverCell, partitionProvinces, traceLabelRings, traceRivers } from './mesh'
import { hash, rng } from './random'
import { REALMS } from './worldData'
import { PROVINCIAL_HOUSES, provinceNamePool } from './names'
import { buildRoads } from './routes'
import { buildSeaRoutes } from './seafaring'
import type { Fief, GameState, House, Point, Production, Province, Realm, Resource, Settlement, SettlementType, Stock, Terrain, World } from './types'

export const WORLD_SEED = 128042
export const PROVINCE_COUNT = 252
const provinceId = (index: number) => `province-${String(index + 1).padStart(3, '0')}`
const fiefId = (realmIndex: number, fiefIndex: number) => `fief-${realmIndex + 1}-${fiefIndex + 1}`
const realmId = (index: number) => `realm-${index + 1}`
const royalHouseId = (index: number) => `house-royal-${index + 1}`
const grandHouseId = (realmIndex: number, fiefIndex: number) => `house-grand-${realmIndex + 1}-${fiefIndex + 1}`
const provincialHouseId = (realmIndex: number, houseIndex: number) => `house-prov-${realmIndex + 1}-${houseIndex + 1}`
export const PLAYER_HOUSE_ID = 'house-prov-1-5'
/** Which fief each of a realm's 12 provincial houses sits in. Três Pontes (Velária, fief 3) holds five, Serraval among them. */
const HOUSE_FIEFS = [[0, 0, 1, 1, 2, 2, 2, 2, 2, 3, 4, 5], [0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5]]
/** Authored houses of Três Pontes, in house-index order 5…9 (Serraval is index 5 → id house-prov-1-5). */
const TRES_PONTES = [
  { name: 'Serraval', motto: 'O que construímos permanece.', color: '#1f5b5c' },
  { name: 'Morvane', motto: 'O sal não esquece.', color: '#23466f' },
  { name: 'Quellan', motto: 'Duas vozes, uma palavra.', color: '#56662a' },
  { name: 'Ardesh', motto: 'A pedra resiste ao tempo.', color: '#4d4d55' },
  { name: 'Vasterre', motto: 'O vento escolhe os ousados.', color: '#6e3a7c' },
]

/**
 * Balanced, connected allocation of items to groups grown from anchors. `penalty` lets
 * mountains be claimed last, so realm and fief borders settle on ridges.
 */
function allocateConnected<T>(items: T[], groups: { anchor: Point; count: number }[], position: (item: T) => Point, neighbors: number[][], seed: number, penalty: (index: number) => number = () => 0): number[] {
  const distance = (itemIndex: number, groupIndex: number) => Math.hypot(position(items[itemIndex])[0] - groups[groupIndex].anchor[0], position(items[itemIndex])[1] - groups[groupIndex].anchor[1])
  for (let attempt = 0; attempt < 24; attempt++) {
    const random = rng(seed ^ (attempt * 10949))
    const result = items.map(() => -1)
    const counts = groups.map(() => 0)
    const frontiers = groups.map(() => new Set<number>())
    const assign = (itemIndex: number, groupIndex: number) => {
      result[itemIndex] = groupIndex; counts[groupIndex]++
      for (const frontier of frontiers) frontier.delete(itemIndex)
      for (const neighbor of neighbors[itemIndex]) if (result[neighbor] === -1) frontiers[groupIndex].add(neighbor)
    }
    groups.forEach((_, groupIndex) => {
      const start = items.map((_, i) => i).filter(i => result[i] === -1).sort((a, b) => distance(a, groupIndex) - distance(b, groupIndex))[0]
      assign(start, groupIndex)
    })
    while (result.some(g => g === -1)) {
      const options = groups.map((_group, groupIndex) => ({ groupIndex, available: [...frontiers[groupIndex]].filter(i => result[i] === -1), tie: random() }))
        .filter(o => o.available.length > 0)
        .sort((a, b) => counts[a.groupIndex] / groups[a.groupIndex].count - counts[b.groupIndex] / groups[b.groupIndex].count || a.tie - b.tie)
      if (!options.length) break
      const chosen = options[0]
      const itemIndex = chosen.available.map(i => ({ i, score: distance(i, chosen.groupIndex) + penalty(i) + (random() - .5) * (attempt === 0 ? 2 : 18) })).sort((a, b) => a.score - b.score)[0].i
      assign(itemIndex, chosen.groupIndex)
    }
    if (result.every(v => v >= 0) && counts.every(c => c >= 2)) return result
  }
  throw new Error('Falha ao criar territórios contíguos')
}

function fiefAnchors(points: Point[]): Point[] {
  const centroid: Point = [points.reduce((s, p) => s + p[0], 0) / points.length, points.reduce((s, p) => s + p[1], 0) / points.length]
  const chosen: Point[] = [points.reduce((b, p) => Math.hypot(p[0] - centroid[0], p[1] - centroid[1]) < Math.hypot(b[0] - centroid[0], b[1] - centroid[1]) ? p : b)]
  while (chosen.length < 6) {
    const next = points.reduce((best, p) => Math.min(...chosen.map(c => Math.hypot(p[0] - c[0], p[1] - c[1]))) > Math.min(...chosen.map(c => Math.hypot(best[0] - c[0], best[1] - c[1]))) ? p : best)
    chosen.push(next)
  }
  for (let it = 0; it < 7; it++) {
    const clusters = chosen.map(() => [] as Point[])
    for (const p of points) { let b = 0; for (let i = 1; i < chosen.length; i++) if (Math.hypot(p[0] - chosen[i][0], p[1] - chosen[i][1]) < Math.hypot(p[0] - chosen[b][0], p[1] - chosen[b][1])) b = i; clusters[b].push(p) }
    clusters.forEach((c, i) => { if (c.length) chosen[i] = [c.reduce((s, p) => s + p[0], 0) / c.length, c.reduce((s, p) => s + p[1], 0) / c.length] })
  }
  return chosen
}

const round5 = (n: number) => Math.round(n / 5) * 5
/** Monthly output of a province: one formula, then apportioned to its settlements (the single source the economy reads). */
export function provinceOutput(population: number, resources: Resource[]): Production {
  const has = (r: Resource) => resources.includes(r)
  return {
    gold: round5(population * .0194),
    food: has('grãos') ? round5(population * .0387) : round5(population * .012),
    wood: has('madeira') ? round5(population * .0073) : 0,
    stone: has('pedra') ? round5(population * .006) : 0,
    iron: has('ferro') ? round5(population * .0065) : 0,
    salt: has('sal') ? round5(population * .005) : 0,
    silver: has('prata') ? round5(population * .003) : 0,
  }
}
const SETTLEMENT_GOODS: Record<SettlementType, (keyof Production)[]> = {
  castelo: ['gold'], fortaleza: ['gold'], cidade: ['gold'], vila: ['food', 'gold'], aldeia: ['food'], fazenda: ['food'], mina: ['iron', 'stone', 'silver'],
  porto: ['salt', 'gold'], entreposto: ['gold'], serraria: ['wood'], mosteiro: ['food'], torre: ['gold'],
}
function apportion(total: Production, types: SettlementType[]): Production[] {
  const out = types.map(() => ({ gold: 0, food: 0, wood: 0, stone: 0, iron: 0, salt: 0, silver: 0 }))
  for (const key of Object.keys(total) as (keyof Production)[]) {
    if (!total[key]) continue
    const takers = types.map((t, i) => SETTLEMENT_GOODS[t].includes(key) ? i : -1).filter(i => i >= 0)
    const list = takers.length ? takers : [0]
    const share = Math.floor(total[key] / list.length)
    list.forEach((i, k) => { out[i][key] = share + (k === 0 ? total[key] - share * list.length : 0) })
  }
  return out
}

export function createWorld(seed = WORLD_SEED): World {
  const random = rng(seed)
  const mesh = buildMesh(seed)
  const label = partitionProvinces(mesh, PROVINCE_COUNT, seed)
  const N = mesh.points.length
  // Coastal sea cells join the neighbouring province's outline so fills reach the painted coast.
  const outline = Int32Array.from(label)
  for (let i = 0; i < N; i++) if (!mesh.land[i]) { const j = mesh.neighbors[i].find(j => label[j] >= 0); if (j !== undefined) outline[i] = label[j] }
  const rings = traceLabelRings(mesh, outline)
  const landLabel = new Int32Array(N).fill(-1)
  const compSizes = new Map<number, number>()
  for (let i = 0; i < N; i++) if (mesh.land[i]) compSizes.set(mesh.component[i], (compSizes.get(mesh.component[i]) ?? 0) + 1)
  const compOrder = [...compSizes.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0]).map(([c]) => c)
  const landmassOf = new Map(compOrder.map((c, k) => [c, k]))
  for (let i = 0; i < N; i++) if (mesh.land[i]) landLabel[i] = landmassOf.get(mesh.component[i])!
  const landRings = traceLabelRings(mesh, landLabel)
  const landPolygons = compOrder.map((_, k) => landRings.get(k)![0])

  // Province geometry and physical attributes.
  const cells: number[][] = Array.from({ length: PROVINCE_COUNT }, () => [])
  for (let i = 0; i < N; i++) if (label[i] >= 0) cells[label[i]].push(i)
  const geo = cells.map((members, k) => {
    const depth = new Map<number, number>(), queue: number[] = []
    for (const i of members) if (mesh.neighbors[i].some(j => label[j] !== k)) { depth.set(i, 0); queue.push(i) }
    for (let h = 0; h < queue.length; h++) for (const j of mesh.neighbors[queue[h]]) if (label[j] === k && !depth.has(j)) { depth.set(j, depth.get(queue[h])! + 1); queue.push(j) }
    const cx = members.reduce((s, i) => s + mesh.points[i][0], 0) / members.length, cy = members.reduce((s, i) => s + mesh.points[i][1], 0) / members.length
    const pole = members.reduce((b, i) => { const s = (depth.get(i) ?? 0) * 40 - Math.hypot(mesh.points[i][0] - cx, mesh.points[i][1] - cy); const sb = (depth.get(b) ?? 0) * 40 - Math.hypot(mesh.points[b][0] - cx, mesh.points[b][1] - cy); return s > sb ? i : b })
    let cxx = 0, cyy = 0, cxy = 0
    for (const i of members) { const dx = mesh.points[i][0] - cx, dy = mesh.points[i][1] - cy; cxx += dx * dx; cyy += dy * dy; cxy += dx * dy }
    const tr = cxx + cyy, det = cxx * cyy - cxy * cxy, disc = Math.sqrt(Math.max(0, tr * tr / 4 - det))
    const elong = Math.sqrt((tr / 2 + disc) / Math.max(1, tr / 2 - disc))
    let angle = .5 * Math.atan2(2 * cxy, cxx - cyy) * 180 / Math.PI
    if (angle > 70) angle -= 180; if (angle < -70) angle += 180
    const avgE = members.reduce((s, i) => s + mesh.elevation[i], 0) / members.length
    const avgM = members.reduce((s, i) => s + mesh.moisture[i], 0) / members.length
    const coastal = members.some(i => mesh.neighbors[i].some(j => !mesh.land[j]))
    const riverShare = members.filter(i => isRiverCell(mesh, i)).length / members.length
    const area = Math.round(members.reduce((s, i) => s + polygonArea(mesh.polygons[i]), 0))
    const neighbors = new Set<number>()
    for (const i of members) for (const j of mesh.neighbors[i]) if (label[j] >= 0 && label[j] !== k) neighbors.add(label[j])
    return { members, depth, pole, avgE, avgM, coastal, riverShare, area, neighbors: [...neighbors].sort((a, b) => a - b), angle: elong > 1.7 ? (Math.round(Math.max(-65, Math.min(65, angle))) || 0) : 0, landmass: landmassOf.get(mesh.component[members[0]])! }
  })
  const terrainOf = (g: typeof geo[number]): Terrain => g.avgE > .55 ? 'montanha' : g.avgE > .36 ? 'colina' : g.coastal && g.avgE < .17 ? 'litoral' : g.riverShare > .25 && g.avgE < .22 ? 'várzea' : g.avgM > .58 ? 'floresta' : 'planície'
  const resourcesOf = (g: typeof geo[number], terrain: Terrain, k: number): Resource[] => {
    const r = hash(`${seed}:res:${k}`) % 6
    switch (terrain) {
      case 'montanha': return [['pedra', 'ferro'], ['ferro', 'prata'], ['pedra', 'prata'], ['ferro'], ['pedra'], ['prata', 'pedra']][r] as Resource[]
      case 'colina': return [['pedra'], ['prata'], ['ferro'], ['pedra', 'grãos'], ['ferro', 'madeira'], ['prata', 'grãos']][r] as Resource[]
      case 'floresta': return r < 3 ? ['madeira'] : ['madeira', 'grãos']
      case 'litoral': return r < 3 ? ['sal', 'grãos'] : ['sal']
      case 'várzea': return r < 4 ? ['grãos'] : ['grãos', 'sal']
      default: return g.avgM > .5 && r < 3 ? ['grãos', 'madeira'] : ['grãos']
    }
  }
  const provinces: Province[] = geo.map((g, k) => {
    const terrain = terrainOf(g)
    const fertility = (g.avgE > .5 ? .35 : g.avgE > .32 ? .7 : 1.15) + g.riverShare * .6
    return {
      id: provinceId(k), name: '', realmId: '', fiefId: '', legalHouseId: '', governingHouseId: '', occupyingHouseId: null, liegeHouseId: '',
      polygon: rings.get(k)![0], polygons: rings.get(k)!, landmass: g.landmass, center: mesh.points[g.pole], neighbors: g.neighbors.map(provinceId),
      elevation: Math.round(g.avgE * 100), terrain, resources: resourcesOf(g, terrain, k), area: g.area, labelAngle: g.angle,
      population: Math.round(1600 + g.members.length * 230 * fertility + random() * 1400), loyalty: 58 + Math.floor(random() * 35), settlementIds: [], color: '#888',
    }
  })
  // Islands keep an administrative maritime link to the nearest mainland province.
  const maritime: [number, number][] = []
  const allocationNeighbors = geo.map(g => [...g.neighbors])
  provinces.forEach((p, k) => {
    if (p.landmass === 0) return
    const nearest = provinces.map((o, i) => ({ i, d: Math.hypot(o.center[0] - p.center[0], o.center[1] - p.center[1]) })).filter(x => provinces[x.i].landmass === 0).sort((a, b) => a.d - b.d)[0].i
    allocationNeighbors[k].push(nearest); allocationNeighbors[nearest].push(k); maritime.push([k, nearest])
  })
  const highland = (i: number) => Math.max(0, geo[i].avgE - .42) * 260

  // Realms, fiefs and houses.
  const weights = [58, 26, 47, 44, 23, 31, 23]
  const realmAssignment = allocateConnected(provinces, REALMS.map((t, i) => ({ anchor: t.anchor, count: weights[i] })), p => p.center, allocationNeighbors, seed, highland)
  const realms: Realm[] = REALMS.map((t, index) => ({ id: realmId(index), name: t.name, royalHouseId: royalHouseId(index), capital: t.capital, color: t.color, accent: t.accent, culture: t.culture, specialty: t.specialty, motto: t.motto, fiefIds: t.fiefs.map((_, f) => fiefId(index, f)), anchor: t.anchor }))
  provinces.forEach((p, k) => { p.realmId = realmId(realmAssignment[k]); p.color = realms[realmAssignment[k]].color })
  const fiefs: Fief[] = [], houses: House[] = []
  const pool = provinceNamePool(PROVINCE_COUNT, n => hash(`${seed}:name:${n}`))
  const shuffled = [...pool].sort((a, b) => hash(`${seed}:${a}`) - hash(`${seed}:${b}`)).filter(n => n !== 'Torrealva')
  let nameIndex = 0
  const nextName = () => shuffled[nameIndex++]
  const stock = (food: number, wood: number, stone: number, iron: number, salt: number, silver: number): Stock => ({ food, wood, stone, iron, salt, silver })
  let houseSequence = 0
  for (let realmIndex = 0; realmIndex < REALMS.length; realmIndex++) {
    const template = REALMS[realmIndex]
    const inRealm = provinces.filter(p => p.realmId === realmId(realmIndex))
    const anchors = fiefAnchors(inRealm.map(p => p.center))
    const local = new Map(inRealm.map((p, i) => [p.id, i]))
    const localNeighbors = inRealm.map(p => allocationNeighbors[provinces.indexOf(p)].map(i => local.get(provinceId(i))).filter((i): i is number => i !== undefined))
    const assignment = allocateConnected(inRealm, anchors.map(anchor => ({ anchor, count: 6 })), p => p.center, localNeighbors, seed + realmIndex + 1, i => highland(provinces.indexOf(inRealm[i])))
    template.fiefs.forEach(([name, houseName], fiefIndex) => {
      const members = inRealm.filter((_, i) => assignment[i] === fiefIndex)
      const capital = members.reduce((b, p) => Math.hypot(p.center[0] - anchors[fiefIndex][0], p.center[1] - anchors[fiefIndex][1]) < Math.hypot(b.center[0] - anchors[fiefIndex][0], b.center[1] - anchors[fiefIndex][1]) ? p : b)
      fiefs.push({ id: fiefId(realmIndex, fiefIndex), name, realmId: realmId(realmIndex), grandHouseId: grandHouseId(realmIndex, fiefIndex), provinceIds: members.map(p => p.id), capitalProvinceId: capital.id })
      for (const p of members) { p.fiefId = fiefId(realmIndex, fiefIndex); p.name = realmIndex === 0 && fiefIndex === 2 && p === capital ? 'Torrealva' : nextName() }
      houses.push({ id: grandHouseId(realmIndex, fiefIndex), name: `Casa ${houseName}`, rank: 'grão-senhorial', realmId: realmId(realmIndex), seatProvinceId: capital.id, motto: `Pela honra de ${name}`, symbol: ['♜', '⚔', '✦', '♣', '⚜', '✥'][fiefIndex], color: template.color, gold: 2400 + Math.floor(random() * 1300), stock: stock(4300, 950, 300, 410, 120, 80), mobilizable: 1700, prestige: 46 + Math.floor(random() * 30), influence: 38 + Math.floor(random() * 30), titleIds: [fiefId(realmIndex, fiefIndex)], memberIds: [], memory: [`A Casa ${houseName} recebeu ${name} no início da Era do Pacto.`] })
    })
    houses.push({ id: royalHouseId(realmIndex), name: `Casa ${template.house}`, rank: 'real', realmId: realmId(realmIndex), seatProvinceId: fiefs.find(f => f.realmId === realmId(realmIndex))!.capitalProvinceId, motto: template.motto, symbol: template.symbol, color: template.color, gold: 9200 + Math.floor(random() * 4000), stock: stock(18500, 4200, 1800, 2500, 600, 500), mobilizable: 7800, prestige: 80, influence: 80, titleIds: [realmId(realmIndex)], memberIds: [], memory: [`A Casa ${template.house} governa ${template.name} desde a consolidação do Pacto.`] })
    // Provincial houses: distinct non-capital seats inside their fief.
    const layout = HOUSE_FIEFS[realmIndex === 0 ? 0 : 1]
    const taken = new Set<string>()
    for (let houseIndex = 0; houseIndex < 12; houseIndex++) {
      const fief = fiefs.find(f => f.id === fiefId(realmIndex, layout[houseIndex]))!
      const candidates = fief.provinceIds.map(id => provinces.find(p => p.id === id)!).filter(p => p.id !== fief.capitalProvinceId && !taken.has(p.id))
      const authored = realmIndex === 0 && houseIndex >= 4 && houseIndex <= 8 ? TRES_PONTES[houseIndex - 4] : null
      const capital = provinces.find(p => p.id === fief.capitalProvinceId)!
      const g = (p: Province) => geo[provinces.indexOf(p)]
      const score = (p: Province) => {
        const adjacent = p.neighbors.includes(capital.id) ? 25 : 0
        switch (authored?.name) {
          case 'Serraval': return g(p).riverShare * 120 + adjacent - g(p).avgE * 80 - (g(p).coastal ? 15 : 0) - Math.abs(g(p).members.length - 18)
          case 'Morvane': return (g(p).coastal ? 100 : 0) + g(p).riverShare * 30
          case 'Quellan': return g(p).riverShare * 60 - g(p).avgE * 60 + adjacent
          case 'Ardesh': return g(p).avgE * 200
          case 'Vasterre': return g(p).members.length
          default: return -hash(`${seed}:${p.id}`) / 1e9
        }
      }
      const seat = (candidates.length ? candidates : fief.provinceIds.map(id => provinces.find(p => p.id === id)!).filter(p => !taken.has(p.id))).sort((a, b) => score(b) - score(a))[0]
      taken.add(seat.id)
      const name = authored ? authored.name : PROVINCIAL_HOUSES[4 + (houseSequence++ % (PROVINCIAL_HOUSES.length - 4))]
      const id = provincialHouseId(realmIndex, houseIndex)
      const isPlayer = id === PLAYER_HOUSE_ID
      seat.legalHouseId = id; seat.governingHouseId = id; seat.liegeHouseId = fief.grandHouseId
      houses.push({ id, name: `Casa ${name}`, rank: 'provincial', realmId: realmId(realmIndex), seatProvinceId: seat.id, motto: authored?.motto ?? ['Pela terra e pelo sangue.', 'Sob o mesmo céu.', 'Firme diante da noite.', 'Nossa palavra perdura.'][houseIndex % 4], symbol: ['♜', '✦', '⚜', '♣', '◆', '⚒'][houseIndex % 6], color: authored?.color ?? template.color, gold: isPlayer ? 700 : 620 + Math.floor(random() * 750), stock: isPlayer ? stock(1240, 420, 0, 180, 35, 20) : stock(900, 300, 60, 120, 40, 20), mobilizable: isPlayer ? 325 : 260 + Math.floor(random() * 380), prestige: isPlayer ? 32 : 20 + Math.floor(random() * 30), influence: isPlayer ? 26 : 15 + Math.floor(random() * 25), titleIds: [seat.id], memberIds: [], memory: [] })
    }
  }
  for (const p of provinces) if (!p.legalHouseId) {
    const fief = fiefs.find(f => f.id === p.fiefId)!
    p.legalHouseId = fief.grandHouseId; p.governingHouseId = fief.grandHouseId
    p.liegeHouseId = realms.find(r => r.id === p.realmId)!.royalHouseId
  }
  const player = houses.find(h => h.id === PLAYER_HOUSE_ID)!
  const pontevela = provinces.find(p => p.id === player.seatProvinceId)!
  pontevela.name = 'Pontevela'; pontevela.population = 6200; pontevela.loyalty = 78; pontevela.resources = ['grãos', 'madeira']
  // Authored economy of Três Pontes: Pontevela lacks stone, and the stone belongs to Ardesh.
  const AUTHORED_RESOURCES: Record<string, Resource[]> = { 'Casa Morvane': ['sal'], 'Casa Quellan': ['grãos'], 'Casa Ardesh': ['pedra', 'ferro'], 'Casa Vasterre': ['madeira', 'prata'] }
  for (const h of houses) if (AUTHORED_RESOURCES[h.name]) provinces.find(p => p.id === h.seatProvinceId)!.resources = AUTHORED_RESOURCES[h.name]
  const torrealva = provinces.find(p => p.name === 'Torrealva')!; torrealva.resources = ['grãos', 'prata']
  for (const p of provinces) if (p.fiefId === pontevela.fiefId && p.governingHouseId === fiefs.find(f => f.id === p.fiefId)!.grandHouseId && p !== torrealva) p.resources = p.resources.filter(r => r !== 'pedra' && r !== 'ferro').length ? p.resources.filter(r => r !== 'pedra' && r !== 'ferro') : ['grãos']
  for (const h of houses) if (h.rank === 'provincial') h.memory = [`A ${h.name} consolidou sua sede em ${provinces.find(p => p.id === h.seatProvinceId)!.name}.`]
  for (const p of provinces) {
    const fief = fiefs.find(f => f.id === p.fiefId)!
    if (p.id === fief.capitalProvinceId) continue
    if (!houses.some(h => h.seatProvinceId === p.id) && fief.provinceIds.length < 2) throw new Error('Feudo sem províncias suficientes')
  }

  // Settlements: four per province, placed on the province's own cells.
  const settlements: Settlement[] = []
  provinces.forEach((province, k) => {
    const g = geo[k], isPlayer = province.id === pontevela.id
    const royalRealm = realms.find(r => houses.find(h => h.id === r.royalHouseId)?.seatProvinceId === province.id)
    const extract = province.resources.some(r => r === 'ferro' || r === 'pedra' || r === 'prata')
    const types: SettlementType[] = isPlayer ? ['castelo', 'vila', 'vila', 'entreposto'] : ['castelo', royalRealm ? 'cidade' : g.coastal && province.resources.includes('sal') ? 'porto' : extract ? 'mina' : province.resources.includes('madeira') ? 'serraria' : 'vila', 'aldeia', province.terrain === 'várzea' || province.resources.includes('grãos') ? 'fazenda' : 'vila']
    const total = provinceOutput(province.population, province.resources)
    if (isPlayer) total.iron = 15
    const production = apportion(total, types)
    // Positions: castle on the pole, others spread over the remaining cells.
    const others = g.members.filter(i => i !== g.pole).sort((a, b) => hash(`${seed}:${province.id}:${a}`) - hash(`${seed}:${province.id}:${b}`))
    const positions: Point[] = [mesh.points[g.pole]]
    for (const i of others) { if (positions.length >= 4) break; const p = mesh.points[i]; if (positions.every(q => Math.hypot(q[0] - p[0], q[1] - p[1]) > 7)) positions.push(p) }
    for (const i of others) { if (positions.length >= 4) break; positions.push(mesh.points[i]) }
    while (positions.length < 4) { const a = mesh.points[g.pole], b = mesh.points[g.members[positions.length % g.members.length]] ?? a; const mid: Point = [(a[0] + b[0]) / 2 + positions.length, (a[1] + b[1]) / 2]; positions.push(inPolygon(mid, province.polygon) ? mid : [a[0] + positions.length * .5, a[1] + positions.length * .5]) }
    const portIndex = types.indexOf('porto')
    if (portIndex >= 0) {
      const shore = g.members.find(i => mesh.neighbors[i].some(j => !mesh.land[j] && outline[j] === k))
      if (shore !== undefined) { const sea = mesh.neighbors[shore].find(j => !mesh.land[j] && outline[j] === k)!; const quay: Point = [(mesh.points[shore][0] * .6 + mesh.points[sea][0] * .4), (mesh.points[shore][1] * .6 + mesh.points[sea][1] * .4)]; positions[portIndex] = inPolygon(quay, province.polygon) ? quay : mesh.points[shore] }
    }
    types.forEach((type, index) => {
      const id = `settlement-${province.id}-${index + 1}`
      const name = isPlayer ? ['Castelo da Ponte Alta', 'Vila do Junco', 'Vila das Pedras', 'Entreposto das Três Águas'][index] : royalRealm && index === 1 ? royalRealm.capital : `${['Castelo de', type === 'porto' ? 'Porto de' : type === 'mina' ? 'Minas de' : type === 'serraria' ? 'Serraria de' : 'Vila de', 'Aldeia de', type === 'fazenda' ? 'Campos de' : 'Vila Baixa de'][index]} ${province.name}`
      const population = Math.round(province.population * [.25, .34, .22, .19][index])
      const defense = index === 0 ? 35 + Math.floor(random() * 25) + (province.terrain === 'montanha' ? 15 : province.terrain === 'colina' ? 8 : 0) : 3 + Math.floor(random() * 7)
      settlements.push({ id, name, provinceId: province.id, type, position: positions[index], population, garrison: index === 0 ? (isPlayer ? 75 : 50 + Math.floor(random() * 120)) : 0, ownerHouseId: royalRealm && index === 1 ? royalRealm.royalHouseId : province.legalHouseId, defense, production: production[index] })
      province.settlementIds.push(id)
    })
  })
  const roads = buildRoads({ provinces, fiefs, realms })
  const world: World = {
    geographyRevision: 4, seed, landPolygon: landPolygons[0], landPolygons,
    maritimeLinks: maritime.map(([a, b]) => [provinceId(a), provinceId(b)]), seaRoutes: buildSeaRoutes(landPolygons),
    realms, fiefs, provinces, settlements, houses, rivers: traceRivers(mesh), roads,
    history: [{ id: 'history-1', day: 0, category: 'fundação', description: 'A Casa Serraval mantém Pontevela sob juramento à Casa Hadrin, no reino de Velária.', entityIds: [player.id, pontevela.id] }],
  }
  return world
}

export function createGame(seed = WORLD_SEED): GameState { return initializeCampaign({ version: 1, world: createWorld(seed), day: 0, playerHouseId: PLAYER_HOUSE_ID, speed: 0, updatedAt: Date.now() }) }
