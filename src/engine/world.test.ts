import { describe, expect, it } from 'vitest'
import { createGame, createWorld } from './world'
import { advanceGame } from './simulation'
import { dateFromDay } from './calendar'
import { inPolygon, onLand } from './geography'
import { shortestPath } from './routes'
import { migrateGeography } from './persistence'
import { PONTEVELA_AUDIENCE_ID, resolvePontevelaAudience } from './audience'
import type { GameState, World } from './types'

describe('fundação de Varedor', () => {
  const world = createWorld()
  const area = (polygon:[number,number][]) => Math.abs(polygon.reduce((sum,point,index) => {const next=polygon[(index+1)%polygon.length];return sum+point[0]*next[1]-next[0]*point[1]},0)/2)
  it('cria a hierarquia oficial com referências válidas', () => {
    expect(world.realms).toHaveLength(7)
    expect(world.fiefs).toHaveLength(42)
    expect(world.provinces).toHaveLength(252)
    expect(world.settlements).toHaveLength(1008)
    expect(world.houses).toHaveLength(133)
    for (const realm of world.realms) {
      expect(realm.fiefIds).toHaveLength(6)
      expect(world.provinces.filter(province => province.realmId === realm.id).length).toBeGreaterThanOrEqual(12)
    }
    for (const fief of world.fiefs) {
      expect(world.realms.some(realm => realm.id === fief.realmId)).toBe(true)
      expect(fief.provinceIds.length).toBeGreaterThanOrEqual(2)
      expect(fief.provinceIds).toContain(fief.capitalProvinceId)
    }
    for (const province of world.provinces) {
      expect(world.fiefs.some(fief => fief.id === province.fiefId)).toBe(true)
      expect(world.houses.some(house => house.id === province.legalHouseId)).toBe(true)
      expect(world.houses.some(house => house.id === province.governingHouseId)).toBe(true)
      expect(world.houses.some(house => house.id === province.liegeHouseId)).toBe(true)
      expect(province.settlementIds).toHaveLength(4)
      expect(province.polygon.length).toBeGreaterThanOrEqual(3)
      expect(onLand(province.center, world.landPolygons)).toBe(true)
    }
    for (const settlement of world.settlements) {const province=world.provinces.find(province=>province.id===settlement.provinceId)!;expect(province).toBeDefined();expect(inPolygon(settlement.position,province.polygon)).toBe(true)}
    expect(new Set(world.provinces.map(province => province.id)).size).toBe(252)
    expect(new Set(world.provinces.map(province=>province.name)).size).toBe(252)
    expect(new Set(world.settlements.map(settlement => settlement.id)).size).toBe(1008)
    expect(new Set(world.houses.map(house => house.id)).size).toBe(133)
    expect(new Set(world.houses.map(house => house.name)).size).toBe(133)
    for (const realm of world.realms) {
      const capital = world.settlements.find(settlement => settlement.name === realm.capital)
      expect(capital?.type).toBe('cidade')
      expect(capital?.ownerHouseId).toBe(realm.royalHouseId)
    }
    expect(world.provinces.reduce((sum,province)=>sum+province.polygons.reduce((s,p)=>s+area(p),0),0)/world.landPolygons.reduce((s,p)=>s+area(p),0)).toBeCloseTo(1,3)
  })
  it('mantém a malha territorial conectada e as relações de vizinhança recíprocas', () => {
    const byId = new Map(world.provinces.map(province => [province.id, province]))
    const visited = new Set<string>()
    const queue = [world.provinces[0].id]
    while (queue.length) {
      const id = queue.shift()!
      if (visited.has(id)) continue
      visited.add(id)
      for (const neighbor of byId.get(id)!.neighbors) {
        expect(byId.get(neighbor)?.neighbors).toContain(id)
        queue.push(neighbor)
      }
    }
    expect(visited.size).toBe(world.provinces.filter(p=>p.landmass===0).length)
    for(const territory of [...world.realms.map(realm => world.provinces.filter(province => province.realmId === realm.id)),...world.fiefs.map(fief => fief.provinceIds.map(id => byId.get(id)!))]) {
      const members=new Set(territory.map(province => province.id))
      const connected=new Set<string>(),pending=[territory[0].id]
      while(pending.length){const id=pending.pop()!;if(connected.has(id))continue;connected.add(id);for(const neighbor of [...byId.get(id)!.neighbors,...world.maritimeLinks.filter(edge=>edge.includes(id)).map(edge=>edge.find(n=>n!==id)!)])if(members.has(neighbor))pending.push(neighbor)}
      expect(connected.size).toBe(members.size)
    }
    expect(shortestPath(world.provinces, world.provinces[0].id, world.provinces[200].id, world.roads).length).toBeGreaterThan(1)
    for (const [from,to] of world.roads) expect(byId.get(from)?.neighbors).toContain(to)
    for (const river of world.rivers) {
      expect(river.length).toBeGreaterThanOrEqual(4)
      const elevations = river.slice(0,-1).map(point => world.provinces.find(province => province.center[0] === point[0] && province.center[1] === point[1])!.elevation)
      for (let i=1;i<elevations.length;i++) expect(elevations[i]).toBeLessThan(elevations[i-1])
    }
  })
  it('possui ilhas tituladas, tamanhos variados e rotas apenas sobre água',()=>{
    expect(world.landPolygons.length).toBeGreaterThan(10)
    expect(onLand([670,480],world.landPolygons)).toBe(false)
    const areas=world.realms.map(r=>world.provinces.filter(p=>p.realmId===r.id).reduce((s,p)=>s+p.polygons.reduce((s,poly)=>s+area(poly),0),0))
    expect(Math.max(...areas)/Math.min(...areas)).toBeGreaterThan(2)
    for(const island of world.provinces.filter(p=>p.landmass>0)){
      expect(island.neighbors).toHaveLength(0)
      expect(world.maritimeLinks.some(link=>link.includes(island.id))).toBe(true)
      expect(shortestPath(world.provinces,island.id,world.provinces[0].id)).toEqual([])
    }
    expect(world.seaRoutes.length).toBeGreaterThanOrEqual(6)
    for(const route of world.seaRoutes)for(let i=1;i<route.length;i++){
      const a=route[i-1],b=route[i],steps=Math.ceil(Math.hypot(a[0]-b[0],a[1]-b[1])/2)
      for(let step=0;step<=steps;step++)expect(onLand([a[0]+(b[0]-a[0])*step/steps,a[1]+(b[1]-a[1])*step/steps],world.landPolygons)).toBe(false)
    }
  })
  it('inicia Serraval em Pontevela com quatro assentamentos e juramento a Hadrin', () => {
    const house = world.houses.find(house => house.name === 'Casa Serraval')!
    const province = world.provinces.find(province => province.id === house.seatProvinceId)!
    const fief = world.fiefs.find(fief => fief.id === province.fiefId)!
    expect(province.name).toBe('Pontevela')
    expect(province.population).toBe(6200)
    expect(house.gold).toBe(700)
    expect(fief.name).toBe('Três Pontes')
    expect(province.legalHouseId).toBe(house.id)
    expect(province.governingHouseId).toBe(house.id)
    expect(province.occupyingHouseId).toBeNull()
    expect(province.liegeHouseId).toBe(fief.grandHouseId)
    expect(province.settlementIds.map(id => world.settlements.find(item => item.id === id)?.type)).toEqual(['castelo','vila','vila','entreposto'])
  })
  it('é determinístico para a mesma semente', () => {
    const copy = createWorld()
    expect(copy.provinces).toEqual(world.provinces)
    expect(copy.houses).toEqual(world.houses)
  })
  it('avança o calendário de 360 dias e registra a passagem das estações', () => {
    const game = advanceGame(createGame(), 360)
    expect(dateFromDay(game.day)).toEqual({ year:129, dayOfSeason:1, season:'Primavera' })
    expect(game.world.history.filter(record => record.category === 'calendário')).toHaveLength(4)
    expect(game.world.provinces).toHaveLength(252)
  })
  it('migra salvamentos do mapa anterior preservando tempo e recursos', () => {
    const game=createGame()
    const oldWorld={...game.world} as Partial<World>
    delete oldWorld.geographyRevision
    oldWorld.houses=game.world.houses.map(house => ({...house,gold:house.id === game.playerHouseId ? 930 : house.gold}))
    const old={...game,day:37,world:oldWorld as World} as GameState
    const migrated=migrateGeography(old)
    expect(migrated.world.geographyRevision).toBe(3)
    expect(migrated.day).toBe(37)
    expect(migrated.world.houses.find(house => house.id === game.playerHouseId)?.gold).toBe(930)
    expect(migrated.world.provinces).toHaveLength(252)
    expect(migrated.world.history).toEqual(old.world.history)
  })
  it('a audiência em Pontevela altera recursos e lealdade uma única vez', () => {
    const start=createGame()
    const distribute=resolvePontevelaAudience(start,'distribuir')
    const house=distribute.world.houses.find(item => item.id === distribute.playerHouseId)!
    const province=distribute.world.provinces.find(item => item.id === house.seatProvinceId)!
    expect(house.stock.food).toBe(1120)
    expect(house.prestige).toBe(34)
    expect(province.loyalty).toBe(82)
    expect(distribute.world.history.some(record => record.id === PONTEVELA_AUDIENCE_ID)).toBe(true)
    expect(resolvePontevelaAudience(distribute,'vender')).toBe(distribute)
    const sell=resolvePontevelaAudience(start,'vender')
    expect(sell.world.houses.find(item => item.id === sell.playerHouseId)?.gold).toBe(790)
    expect(sell.world.provinces.find(item => item.id === province.id)?.loyalty).toBe(76)
  })
})
