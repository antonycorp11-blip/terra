import type { GameState, Id, Production, Province } from './types'
import type { ProvinceAdmin } from './mvpTypes'
import { BALANCE } from './balance'
import { playerHouse, playerSeat, clamp, controlled, editGame, requireRule } from './stateUtils'
import { notify } from './notifications'
import { knownRoute } from './knowledge'
import { dateFromDay } from './calendar'
import { mineYield, workLevel } from './investments'

const round5 = (n: number) => Math.round(n / 5) * 5
/** Base monthly output of one province, read from its settlements (the single source of production). */
export function provinceProduction(g: GameState, p: Province): Production {
  const out: Production = { gold: 0, food: 0, wood: 0, stone: 0, iron: 0, salt: 0, silver: 0 }
  for (const s of g.world.settlements) if (s.provinceId === p.id) for (const k of Object.keys(out) as (keyof Production)[]) out[k] += s.production[k]
  return out
}
export const provinceUpkeep = (p: Province) => ({ administration: round5(p.population * .0065), consumption: round5(p.population * .0242) })
export const menUnderArms = (g: GameState) => Object.values(g.campaign.garrisons).reduce((a, b) => a + b, 0) + g.campaign.armies.filter(a => a.houseId === g.playerHouseId && a.status !== 'dissolvido').reduce((a, b) => a + b.men, 0)
export const adminOf = (g: GameState, id: Id): ProvinceAdmin => g.campaign.admin[id] ?? { tax: 'normal', governor: null }
export const conditionOf = (g: GameState, id: Id, kind: string) => g.campaign.conditions.some(c => c.provinceId === id && c.kind === kind && c.until > g.day)

/** One province under the player's rule, with taxes, works and conditions applied. */
export function provinceBalance(g: GameState, p: Province) {
  const base = provinceProduction(g, p), up = provinceUpkeep(p), admin = adminOf(g, p.id)
  const tax = BALANCE.tax[admin.tax]
  const mine = mineYield(p), mines = workLevel(g, p.id, 'mine')
  const drought = conditionOf(g, p.id, 'seca') ? .5 : 1, bandits = conditionOf(g, p.id, 'bandidos') ? .7 : 1
  const out: Production = {
    gold: Math.round((base.gold + workLevel(g, p.id, 'market') * 45) * tax.gold * bandits),
    food: Math.round((base.food + workLevel(g, p.id, 'farms') * 60) * drought),
    wood: base.wood, stone: base.stone, iron: base.iron, salt: base.salt, silver: base.silver,
  }
  out[mine.key] += mines * mine.amount
  return { out, administration: up.administration, consumption: up.consumption, growth: populationGrowth(g, p) }
}
/** Monthly growth rate of a province, with every factor named for the player. */
export function populationGrowth(g: GameState, p: Province) {
  const P = BALANCE.population, admin = adminOf(g, p.id), h = playerHouse(g)
  const factors: [string, number][] = [['crescimento natural', P.base]]
  if (h.stock.food === 0) factors.push(['fome', P.starving]); else if (h.stock.food > provinceUpkeep(p).consumption * 3) factors.push(['celeiros cheios', P.fed])
  if (p.loyalty >= 70) factors.push(['lealdade alta', P.loyalHigh]); else if (p.loyalty < 40) factors.push(['lealdade baixa', P.loyalLow])
  if (BALANCE.tax[admin.tax].growth) factors.push([`imposto ${admin.tax}`, BALANCE.tax[admin.tax].growth])
  const farms = workLevel(g, p.id, 'farms'); if (farms) factors.push([`fazendas nível ${farms}`, P.farms * farms])
  if (dateFromDay(g.day).season === 'Inverno') factors.push(['inverno', P.winter])
  if (conditionOf(g, p.id, 'peste')) factors.push(['peste', P.plague])
  const rate = factors.reduce((a, [, v]) => a + v, 0)
  return { rate, perMonth: Math.round(p.population * rate), factors }
}

export function economicBalance(g: GameState) {
  const sum: Production = { gold: 0, food: 0, wood: 0, stone: 0, iron: 0, salt: 0, silver: 0 }
  let administration = 0, consumption = 0
  for (const p of controlled(g)) {
    const b = provinceBalance(g, p)
    for (const k of Object.keys(sum) as (keyof Production)[]) sum[k] += b.out[k]
    administration += b.administration; consumption += b.consumption
  }
  const upkeep = g.campaign.agents.filter(a => a.hired).length * BALANCE.spy.upkeep + Math.max(0, Math.floor((menUnderArms(g) - BALANCE.military.upkeepFreeMen) / 10)) * BALANCE.military.upkeepGoldPer10
  const trade = g.campaign.contacts.filter(c => c.trade && c.relation >= 0 && knownRoute(g, c.provinceId).length > 0).length * BALANCE.diplomacy.tradeIncome
  return {
    day: g.day, revenue: sum.gold, administration, upkeep, trade, tribute: 0, foodProduction: sum.food, consumption,
    gold: sum.gold + trade - administration - upkeep, food: sum.food - consumption,
    wood: sum.wood, stone: sum.stone, iron: sum.iron, salt: sum.salt, silver: sum.silver,
    renown: g.campaign.vassals.length * BALANCE.vassal.monthlyRenown,
  }
}
export function processEconomy(g: GameState) {
  if (g.day % BALANCE.month !== 0) return
  const b = economicBalance(g), h = playerHouse(g)
  // Growth and loyalty are computed before the month's stores change.
  for (const p of controlled(g)) {
    const growth = populationGrowth(g, p), admin = adminOf(g, p.id)
    p.population = Math.max(500, p.population + growth.perMonth)
    let dl = BALANCE.tax[admin.tax].loyalty
    if (admin.governor) { const gov = g.campaign.characters.find(c => c.id === admin.governor); dl += BALANCE.governorLoyalty + (gov && gov.diplomacy > 60 ? 1 : 0) }
    else if (p.id !== playerSeat(g).id) dl += BALANCE.absentee
    p.loyalty = clamp(p.loyalty + dl, 0, 100)
  }
  g.campaign.ledger.push(b); g.campaign.ledger = g.campaign.ledger.slice(-24)
  h.gold = Math.max(0, h.gold + b.gold); h.stock.food = Math.max(0, h.stock.food + b.food)
  h.stock.wood += b.wood; h.stock.stone += b.stone; h.stock.iron += b.iron; h.stock.salt += b.salt; h.stock.silver += b.silver; h.prestige += b.renown
  const goods = [['madeira', b.wood], ['pedra', b.stone], ['ferro', b.iron], ['sal', b.salt], ['prata', b.silver]].filter(([, v]) => v).map(([k, v]) => `+${v} ${k}`).join(', ')
  notify(g, 'Balanço mensal', `${h.name}: ${b.gold >= 0 ? '+' : ''}${b.gold} ouro, ${b.food >= 0 ? '+' : ''}${b.food} grãos${goods ? ', ' + goods : ''}.`, h.seatProvinceId)
}
/** Taxes and governors are the lord's decisions for each province. */
export function setTax(game: GameState, provinceId: Id, tax: ProvinceAdmin['tax']): GameState {
  requireRule(controlled(game).some(p => p.id === provinceId), 'Só é possível cobrar impostos nas suas províncias.')
  const g = editGame(game); g.campaign.admin[provinceId] = { ...adminOf(g, provinceId), tax }
  return g
}
export function governorCandidates(g: GameState) {
  const taken = new Set(Object.values(g.campaign.admin).map(a => a.governor))
  return g.campaign.characters.filter(c => (c.id.startsWith('court-') || g.campaign.vassals.some(v => c.id === `ruler-${v.houseId}`)) && !taken.has(c.id))
}
export function setGovernor(game: GameState, provinceId: Id, characterId: Id | null): GameState {
  requireRule(controlled(game).some(p => p.id === provinceId), 'Só é possível nomear governadores nas suas províncias.')
  requireRule(characterId === null || governorCandidates(game).some(c => c.id === characterId), 'Esse personagem não pode governar agora.')
  const g = editGame(game), p = g.world.provinces.find(x => x.id === provinceId)!
  g.campaign.admin[provinceId] = { ...adminOf(g, provinceId), governor: characterId }
  if (characterId) { const c = g.campaign.characters.find(x => x.id === characterId)!; c.memory.push({ day: g.day, text: `Foi nomeado governador de ${p.name}.` }); const v = g.campaign.vassals.find(x => characterId === `ruler-${x.houseId}`); if (v) v.loyalty = clamp(v.loyalty + 10, 0, 100) }
  notify(g, 'Governador', characterId ? `${g.campaign.characters.find(x => x.id === characterId)!.name} governa ${p.name} em seu nome.` : `${p.name} fica sem governador.`, provinceId)
  return g
}
/** Salt preserves food through winter; without it part of the granary spoils. */
export function processSeasons(g: GameState) {
  const date = dateFromDay(g.day)
  if (date.season !== 'Inverno' || date.dayOfSeason !== 1) return
  const h = playerHouse(g), need = Math.max(10, Math.round(controlled(g).reduce((s, p) => s + p.population, 0) / 200))
  if (h.stock.salt >= need) { h.stock.salt -= need; notify(g, 'Inverno', `Os celeiros foram salgados com ${need} de sal. Nada se perdeu.`, h.seatProvinceId) }
  else { const lost = Math.round(h.stock.food * .15); h.stock.food -= lost; notify(g, 'Inverno sem sal', `Faltou sal para conservar os celeiros: ${lost} de grãos estragaram. Compre sal antes do próximo inverno.`, h.seatProvinceId, true) }
}
export function processLocalEvents(g: GameState) {
  if (g.day % 60 !== 0) return
  const p = playerSeat(g), h = playerHouse(g)
  if (h.stock.food >= 300) { h.stock.food -= 30; p.loyalty = clamp(p.loyalty + 1, 0, 100); notify(g, 'Mesa dos barqueiros', 'A corte distribuiu 30 de grãos durante a feira. Lealdade local +1.', p.id) }
  else { p.loyalty = clamp(p.loyalty - 2, 0, 100); notify(g, 'Celeiros sob pressão', 'A falta de reservas inquieta os moradores. Lealdade local −2.', p.id) }
}
