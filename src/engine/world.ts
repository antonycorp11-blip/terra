import { initializeCampaign } from './campaign'
import { createCells, createLandmasses, inPolygon } from './geography'
import { rng } from './random'
import { FIRST_NAMES, PLACE_PREFIX, PLACE_ROOT, REALMS } from './worldData'
import { buildRivers, buildRoads } from './routes'
import { buildSeaRoutes } from './seafaring'
import type { Fief, GameState, House, Point, Province, Realm, Settlement, SettlementType, Terrain, World } from './types'

export const WORLD_SEED = 128042
const provinceId = (index: number) => `province-${String(index + 1).padStart(3, '0')}`
const fiefId = (realmIndex: number, fiefIndex: number) => `fief-${realmIndex + 1}-${fiefIndex + 1}`
const realmId = (index: number) => `realm-${index + 1}`
const royalHouseId = (index: number) => `house-royal-${index + 1}`
const grandHouseId = (realmIndex: number, fiefIndex: number) => `house-grand-${realmIndex + 1}-${fiefIndex + 1}`
const provincialHouseId = (realmIndex: number, houseIndex: number) => `house-prov-${realmIndex + 1}-${houseIndex + 1}`

function allocateConnected<T>(items: T[], groups: { anchor: Point; count: number }[], position: (item: T) => Point, neighbors: number[][], seed:number): number[] {
  const distance = (itemIndex:number, groupIndex:number) => Math.hypot(position(items[itemIndex])[0]-groups[groupIndex].anchor[0],position(items[itemIndex])[1]-groups[groupIndex].anchor[1])
  for (let attempt=0;attempt<24;attempt++) {
    const random = rng(seed ^ (attempt*10949))
    const result = items.map(() => -1)
    const counts = groups.map(() => 0)
    const frontiers = groups.map(() => new Set<number>())
    function assign(itemIndex:number, groupIndex:number) {
      result[itemIndex]=groupIndex
      counts[groupIndex]++
      for (const frontier of frontiers) frontier.delete(itemIndex)
      for (const neighbor of neighbors[itemIndex]) if (result[neighbor] === -1) frontiers[groupIndex].add(neighbor)
    }
    groups.forEach((_, groupIndex) => {
      const start = items.map((_, itemIndex) => itemIndex).filter(itemIndex => result[itemIndex] === -1).sort((a,b) => distance(a,groupIndex)-distance(b,groupIndex))[0]
      assign(start,groupIndex)
    })
    while (result.some(groupIndex => groupIndex === -1)) {
      const options = groups.map((group,groupIndex) => ({groupIndex,available:[...frontiers[groupIndex]].filter(index => result[index] === -1),remaining:group.count-counts[groupIndex],tie:random()}))
        .filter(option => option.available.length > 0)
        .sort((a,b) => counts[a.groupIndex]/groups[a.groupIndex].count-counts[b.groupIndex]/groups[b.groupIndex].count || a.tie-b.tie)
      if (!options.length) break
      const chosen = options[0]
      const itemIndex = chosen.available.map(index => ({index,score:distance(index,chosen.groupIndex)+(random()-.5)*(attempt === 0 ? 2 : 18)})).sort((a,b) => a.score-b.score)[0].index
      assign(itemIndex,chosen.groupIndex)
    }
    if (result.every(value => value >= 0) && counts.every(count => count >= 2)) return result
  }
  throw new Error('Falha ao criar territórios contíguos')
}

function fiefAnchors(points: Point[]): Point[] {
  const centroid:Point = [points.reduce((sum,point)=>sum+point[0],0)/points.length,points.reduce((sum,point)=>sum+point[1],0)/points.length]
  const chosen: Point[] = [points.reduce((best,current) => Math.hypot(current[0]-centroid[0],current[1]-centroid[1]) < Math.hypot(best[0]-centroid[0],best[1]-centroid[1]) ? current : best)]
  while (chosen.length < 6) {
    const next = points.reduce((best, point) => {
      const distance = Math.min(...chosen.map(p => Math.hypot(point[0] - p[0], point[1] - p[1])))
      const bestDistance = Math.min(...chosen.map(p => Math.hypot(best[0] - p[0], best[1] - p[1])))
      return distance > bestDistance ? point : best
    })
    chosen.push(next)
  }
  for(let iteration=0;iteration<7;iteration++) {
    const clusters = chosen.map(()=>[] as Point[])
    for(const point of points){let best=0;for(let i=1;i<chosen.length;i++) if(Math.hypot(point[0]-chosen[i][0],point[1]-chosen[i][1])<Math.hypot(point[0]-chosen[best][0],point[1]-chosen[best][1])) best=i;clusters[best].push(point)}
    clusters.forEach((cluster,index)=>{if(cluster.length) chosen[index]=[cluster.reduce((sum,point)=>sum+point[0],0)/cluster.length,cluster.reduce((sum,point)=>sum+point[1],0)/cluster.length]})
  }
  return chosen
}

function terrainAt(center: Point, land: Point[]): Terrain {
  const [x, y] = center
  const ridge=Math.abs(x-(790+(y-100)*.4+28*Math.sin(y/65)))
  const northernRidge=Math.abs(y-(170+30*Math.sin(x/75)))
  if((ridge<25&&y<420&&y>80)||(northernRidge<18&&x>570))return 'montanha'
  if((ridge<52&&y<460)||(northernRidge<43&&x>540))return 'colina'
  const coastal=Math.min(...land.map(p=>Math.hypot(p[0]-x,p[1]-y)))<30
  if(coastal)return 'litoral'
  if(x<440&&y>460)return 'várzea'
  if((Math.sin(x/51)+Math.cos(y/59)>.4)||(x>830&&y>280))return 'floresta'
  return 'planície'
}

function placeName(index: number): string {
  return `${PLACE_PREFIX[index % PLACE_PREFIX.length]} ${PLACE_ROOT[Math.floor(index / PLACE_PREFIX.length) % PLACE_ROOT.length]}${Math.floor(index / (PLACE_PREFIX.length * PLACE_ROOT.length)) || ''}`
}

function settlementPosition(center: Point, polygon: Point[], index: number, random: () => number): Point {
  for (let attempt = 0; attempt < 40; attempt++) {
    const angle = random() * Math.PI * 2
    const radius = 4 + random() * (index === 0 ? 6 : 17)
    const candidate: Point = [center[0] + Math.cos(angle) * radius, center[1] + Math.sin(angle) * radius]
    if (inPolygon(candidate, polygon)) return candidate
  }
  return center
}

export function createWorld(seed = WORLD_SEED): World {
  const random = rng(seed)
  const landPolygons = createLandmasses(seed), landPolygon=landPolygons[0]
  const cells = createCells(seed, landPolygons)
  const landNeighbors = cells.map(cell => cell.neighborIndexes.filter(index => Array.from({length:19},(_,i)=>(i+1)/20).every(t => inPolygon([cell.center[0]*(1-t)+cells[index].center[0]*t,cell.center[1]*(1-t)+cells[index].center[1]*t],landPolygon))))
  const allocationNeighbors=landNeighbors.map(neighbors=>[...neighbors])
  const maritimeIndexes:[number,number][]=[]
  cells.forEach((cell,index)=> {
    if(cell.landmass===0)return
    const nearest=cells.map((other,i)=>({i,other})).filter(({other})=>other.landmass===0).sort((a,b)=>Math.hypot(a.other.center[0]-cell.center[0],a.other.center[1]-cell.center[1])-Math.hypot(b.other.center[0]-cell.center[0],b.other.center[1]-cell.center[1]))[0].i
    allocationNeighbors[index].push(nearest);allocationNeighbors[nearest].push(index);maritimeIndexes.push([index,nearest])
  })
  const weights=[58,26,47,44,23,31,23]
  const realmAssignment = allocateConnected(cells, REALMS.map((template,i) => ({ anchor: template.anchor, count: weights[i] })), cell => cell.center, allocationNeighbors, seed)
  const realms: Realm[] = REALMS.map((template, index) => ({ id: realmId(index), name: template.name, royalHouseId: royalHouseId(index), capital: template.capital, color: template.color, accent: template.accent, culture: template.culture, specialty: template.specialty, motto: template.motto, fiefIds: template.fiefs.map((_, fiefIndex) => fiefId(index, fiefIndex)), anchor: template.anchor }))
  const fiefs: Fief[] = []
  const provinces: Province[] = cells.map((cell, index) => ({ id: provinceId(index), name: '', realmId: realmId(realmAssignment[index]), fiefId: '', legalHouseId: '', governingHouseId: '', occupyingHouseId: null, liegeHouseId: '', polygon: cell.polygon, polygons:cell.polygons, landmass:cell.landmass, center: cell.center, neighbors: landNeighbors[index].map(provinceId), elevation:0, terrain: cell.landmass ? 'litoral' : terrainAt(cell.center, landPolygon), population: 2800 + Math.floor(random() * 6700), loyalty: 58 + Math.floor(random() * 35), settlementIds: [], color: realms[realmAssignment[index]].color }))
  const houses: House[] = []
  for (let realmIndex = 0; realmIndex < REALMS.length; realmIndex++) {
    const template = REALMS[realmIndex]
    const inRealm = provinces.filter(province => province.realmId === realmId(realmIndex))
    const anchors = fiefAnchors(inRealm.map(province => province.center))
    const localIndex = new Map(inRealm.map((province,index) => [province.id,index]))
    const localAssignment = allocateConnected(inRealm, anchors.map(anchor => ({ anchor, count: 6 })), province => province.center, inRealm.map(province => allocationNeighbors[provinces.indexOf(province)].map(index=>provinceId(index)).map(id => localIndex.get(id)).filter((index):index is number => index !== undefined)), seed + realmIndex + 1)
    template.fiefs.forEach(([name, houseName], fiefIndex) => {
      const members = inRealm.filter((_, index) => localAssignment[index] === fiefIndex)
      const capital = members.reduce((best, province) => Math.hypot(province.center[0] - anchors[fiefIndex][0], province.center[1] - anchors[fiefIndex][1]) < Math.hypot(best.center[0] - anchors[fiefIndex][0], best.center[1] - anchors[fiefIndex][1]) ? province : best)
      fiefs.push({ id: fiefId(realmIndex, fiefIndex), name, realmId: realmId(realmIndex), grandHouseId: grandHouseId(realmIndex, fiefIndex), provinceIds: members.map(province => province.id), capitalProvinceId: capital.id })
      members.forEach(province => { province.fiefId = fiefId(realmIndex, fiefIndex); province.name = placeName(provinces.indexOf(province)) })
      houses.push({ id: grandHouseId(realmIndex, fiefIndex), name: `Casa ${houseName}`, rank: 'grão-senhorial', realmId: realmId(realmIndex), seatProvinceId: capital.id, motto: `Pela honra de ${name}`, symbol: ['♜','⚔','✦','♣','⚜','✥'][fiefIndex], color: template.color, gold: 2400 + Math.floor(random() * 1300), stock:{food:4300,wood:950,iron:410,horses:150}, mobilizable:1700, prestige: 46 + Math.floor(random() * 30), influence: 38 + Math.floor(random() * 30), titleIds: [fiefId(realmIndex, fiefIndex)], memberIds: [], memory: [`A Casa ${houseName} recebeu ${name} no início da Era do Pacto.`] })
    })
    houses.push({ id: royalHouseId(realmIndex), name: `Casa ${template.house}`, rank: 'real', realmId: realmId(realmIndex), seatProvinceId: fiefs.find(fief => fief.realmId === realmId(realmIndex))!.capitalProvinceId, motto: template.motto, symbol: template.symbol, color: template.color, gold: 9200 + Math.floor(random() * 4000), stock:{food:18500,wood:4200,iron:2500,horses:900}, mobilizable:7800, prestige: 80, influence: 80, titleIds: [realmId(realmIndex)], memberIds: [], memory: [`A Casa ${template.house} governa ${template.name} desde a consolidação do Pacto.`] })
    for (let houseIndex = 0; houseIndex < 12; houseIndex++) {
      const fiefIndex = Math.floor(houseIndex / 2)
      const fief = fiefs.find(item => item.id === fiefId(realmIndex, fiefIndex))!
      const seat = provinces.find(province => province.id === fief.provinceIds[houseIndex % 2])!
      const sequence = realmIndex * 12 + houseIndex
      const name = realmIndex === 0 && fiefIndex === 2 && houseIndex % 2 === 0 ? 'Serraval' : `${FIRST_NAMES[sequence % FIRST_NAMES.length]}${['val','dor','sen','mar'][Math.floor(sequence / FIRST_NAMES.length)]}`
      const id = provincialHouseId(realmIndex, houseIndex)
      seat.legalHouseId = id
      seat.governingHouseId = id
      seat.liegeHouseId = fief.grandHouseId
      houses.push({ id, name: `Casa ${name}`, rank: 'provincial', realmId: realmId(realmIndex), seatProvinceId: seat.id, motto: name === 'Serraval' ? 'O que construímos permanece.' : ['Pela terra e pelo sangue.','Sob o mesmo céu.','Firme diante da noite.','Nossa palavra perdura.'][houseIndex % 4], symbol: name === 'Serraval' ? '≋' : ['♜','✦','⚜','♣','◆','⚒'][houseIndex % 6], color: name === 'Serraval' ? '#317c75' : template.color, gold: name === 'Serraval' ? 700 : 620 + Math.floor(random() * 750), stock:{food:name === 'Serraval' ? 1240 : 900,wood:name === 'Serraval' ? 420 : 300,iron:name === 'Serraval' ? 180 : 120,horses:name === 'Serraval' ? 80 : 65}, mobilizable:name === 'Serraval' ? 325 : 300, prestige: name === 'Serraval' ? 32 : 20 + Math.floor(random() * 30), influence: name === 'Serraval' ? 26 : 15 + Math.floor(random() * 25), titleIds: [seat.id], memberIds: [], memory: [`A Casa ${name} consolidou sua sede em ${seat.name}.`] })
    }
  }
  for (const province of provinces) {
    if (!province.legalHouseId) {
      const fief = fiefs.find(item => item.id === province.fiefId)!
      province.legalHouseId = fief.grandHouseId
      province.governingHouseId = fief.grandHouseId
      province.liegeHouseId = realms.find(realm => realm.id === province.realmId)!.royalHouseId
    }
  }
  const player = houses.find(house => house.id === 'house-prov-1-5')!
  const pontevela = provinces.find(province => province.id === player.seatProvinceId)!
  const formerName = pontevela.name
  pontevela.name = 'Pontevela'; pontevela.population = 6200; pontevela.loyalty = 78
  for (const house of houses) house.memory = house.memory.map(entry => entry.replaceAll(formerName, 'Pontevela'))
  function portPosition(province:Province):Point {
    const coast=landPolygons[province.landmass]
    const candidates=[...coast].sort((a,b)=>Math.hypot(a[0]-province.center[0],a[1]-province.center[1])-Math.hypot(b[0]-province.center[0],b[1]-province.center[1]))
    for(const shore of candidates){const p:Point=[shore[0]*.82+province.center[0]*.18,shore[1]*.82+province.center[1]*.18];if(inPolygon(p,province.polygon))return p}
    return province.center
  }
  const settlements: Settlement[] = []
  for (const province of provinces) {
    const isPlayer = province.id === pontevela.id
    const royalRealm = realms.find(realm => houses.find(house => house.id === realm.royalHouseId)?.seatProvinceId === province.id)
    const types: SettlementType[] = isPlayer ? ['castelo','vila','vila','entreposto'] : ['castelo', royalRealm ? 'cidade' : province.terrain === 'litoral' ? 'porto' : province.terrain === 'montanha' ? 'mina' : province.terrain === 'floresta' ? 'serraria' : 'vila', 'aldeia', province.terrain === 'várzea' ? 'fazenda' : 'vila']
    types.forEach((type, index) => {
      const id = `settlement-${province.id}-${index + 1}`
      const name = isPlayer ? ['Castelo da Ponte Alta','Vila do Junco','Vila das Pedras','Entreposto das Três Águas'][index] : royalRealm && index === 1 ? royalRealm.capital : `${['Castelo de','Porto de','Aldeia de','Campos de'][index]} ${province.name}`
      const population = Math.round(province.population * [0.25,0.34,0.22,0.19][index])
      const settlement: Settlement = { id, name, provinceId: province.id, type, position: type==='porto'?portPosition(province):settlementPosition(province.center, province.polygon, index, random), population, garrison: index === 0 ? (isPlayer ? 75 : 50 + Math.floor(random() * 120)) : 0, ownerHouseId: royalRealm && index === 1 ? royalRealm.royalHouseId : province.legalHouseId, defense: index === 0 ? 35 + Math.floor(random() * 25) : 3 + Math.floor(random() * 7), production: { gold: type === 'cidade' ? 32 : type === 'entreposto' || type === 'porto' ? 18 : 4, food: type === 'fazenda' || type === 'vila' ? 26 : 8, wood: type === 'serraria' ? 22 : 2, iron: type === 'mina' ? 20 : 0 } }
      settlements.push(settlement); province.settlementIds.push(id)
    })
  }
  const rivers = buildRivers(provinces, landPolygons.flat(), seed)
  const roads = buildRoads({provinces,fiefs,realms})
  return { geographyRevision:3, seed, landPolygon, landPolygons, maritimeLinks:maritimeIndexes.map(([a,b])=>[provinceId(a),provinceId(b)]), seaRoutes:buildSeaRoutes(landPolygons), realms, fiefs, provinces, settlements, houses, rivers, roads, history: [{ id:'history-1', day:0, category:'fundação', description:'A Casa Serraval mantém Pontevela sob juramento à Casa Hadrin, no reino de Velária.', entityIds:[player.id, pontevela.id] }] }
}

export function createGame(seed = WORLD_SEED): GameState { return initializeCampaign({ version:1, world:createWorld(seed), day:0, playerHouseId:'house-prov-1-5', speed:0, updatedAt:Date.now() }) }
