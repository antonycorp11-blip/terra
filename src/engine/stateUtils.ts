import type { GameState, Id, Stock } from './types'
export const playerHouse = (g: GameState) => g.world.houses.find(h => h.id === g.playerHouseId)!
export const playerSeat = (g: GameState) => g.world.provinces.find(p => p.id === playerHouse(g).seatProvinceId)!
export const clamp = (n: number, min = -100, max = 100) => Math.min(max, Math.max(min, n))
export function requireRule(ok: unknown, message: string): asserts ok { if (!ok) throw new Error(message) }
// Geometry is immutable and shared. Only campaign and mutable domain records are copied.
export function editGame(g: GameState): GameState { return { ...g, world: { ...g.world, fiefs: g.world.fiefs.map(f => ({ ...f })), houses: g.world.houses.map(h => ({ ...h, stock: { ...h.stock }, memory: [...h.memory] })), provinces: g.world.provinces.map(p => ({ ...p })), settlements: g.world.settlements.map(s => ({ ...s })), history: [...g.world.history] }, campaign: structuredClone(g.campaign) } }
export function nextId(g: GameState, prefix: string) { return `${prefix}-${g.campaign.nextId++}` }
export type Cost = Partial<Stock> & { gold?: number; renown?: number }
const LABEL: Record<string, string> = { gold: 'ouro', renown: 'renome', food: 'grãos', wood: 'madeira', stone: 'pedra', iron: 'ferro', salt: 'sal', silver: 'prata' }
export function missing(g: GameState, cost: Cost): string[] {
  const h = playerHouse(g), out: string[] = []
  for (const [k, v] of Object.entries(cost)) {
    if (!v) continue
    const have = k === 'gold' ? h.gold : k === 'renown' ? h.prestige : h.stock[k as keyof Stock]
    if (have < v) out.push(`${v - have} de ${LABEL[k]}`)
  }
  return out
}
/** Pays a cost from the player's treasury, stores and renown, or fails naming what is missing. */
export function pay(g: GameState, cost: Cost) {
  const lack = missing(g, cost)
  requireRule(!lack.length, `Faltam ${lack.join(', ')}.`)
  const h = playerHouse(g)
  for (const [k, v] of Object.entries(cost)) {
    if (!v) continue
    if (k === 'gold') h.gold -= v; else if (k === 'renown') h.prestige -= v; else h.stock[k as keyof Stock] -= v
  }
}
export function spend(g: GameState, gold = 0, food = 0, wood = 0) { pay(g, { gold, food, wood }) }
export function record(g: GameState, description: string, entityIds: Id[]) { g.world.history.push({ id: nextId(g, 'history'), day: g.day, category: 'território', description, entityIds }) }
/** Provinces the player rules directly or holds by occupation. */
export const controlled = (g: GameState) => g.world.provinces.filter(p => (p.governingHouseId === g.playerHouseId && !p.occupyingHouseId) || p.occupyingHouseId === g.playerHouseId)
export const isVassal = (g: GameState, houseId: Id) => g.campaign.vassals.some(v => v.houseId === houseId)
/** The player's realm on the map: direct holdings plus every province of a sworn vassal. */
export const inPlayerRealm = (g: GameState, provinceId: Id) => { const p = g.world.provinces.find(x => x.id === provinceId)!; return controlled(g).some(c => c.id === p.id) || (isVassal(g, p.governingHouseId) && !p.occupyingHouseId) }
export const liegeOf = (g: GameState) => g.world.provinces.find(p => p.id === playerHouse(g).seatProvinceId)!.liegeHouseId
