import type { GameState, Production, Province } from './types'
import { BALANCE } from './balance'
import { playerHouse, playerSeat, clamp, controlled } from './stateUtils'
import { notify } from './notifications'
import { knownRoute } from './knowledge'
import { dateFromDay } from './calendar'

const round5 = (n: number) => Math.round(n / 5) * 5
/** Monthly output of one province, read from its settlements (the single source of production). */
export function provinceProduction(g: GameState, p: Province): Production {
  const out: Production = { gold: 0, food: 0, wood: 0, stone: 0, iron: 0, salt: 0, silver: 0 }
  for (const s of g.world.settlements) if (s.provinceId === p.id) for (const k of Object.keys(out) as (keyof Production)[]) out[k] += s.production[k]
  return out
}
export const provinceUpkeep = (p: Province) => ({ administration: round5(p.population * .0065), consumption: round5(p.population * .0242) })
export const menUnderArms = (g: GameState) => Object.values(g.campaign.garrisons).reduce((a, b) => a + b, 0) + g.campaign.armies.filter(a => a.houseId === g.playerHouseId && a.status !== 'dissolvido').reduce((a, b) => a + b.men, 0)

export function economicBalance(g: GameState) {
  const seat = playerSeat(g)
  const done = (kind: string) => g.campaign.investments.some(i => i.completed && i.kind === kind && i.provinceId === seat.id)
  const sum: Production = { gold: 0, food: 0, wood: 0, stone: 0, iron: 0, salt: 0, silver: 0 }
  let administration = 0, consumption = 0
  for (const p of controlled(g)) {
    const out = provinceProduction(g, p), up = provinceUpkeep(p)
    for (const k of Object.keys(sum) as (keyof Production)[]) sum[k] += out[k]
    administration += up.administration; consumption += up.consumption
  }
  // Vassals pay a share of their own provinces' output.
  const tribute: Production = { gold: 0, food: 0, wood: 0, stone: 0, iron: 0, salt: 0, silver: 0 }
  for (const v of g.campaign.vassals) {
    if (v.loyalty < BALANCE.vassal.rebelBelow) continue
    for (const p of g.world.provinces.filter(p => p.governingHouseId === v.houseId && !p.occupyingHouseId)) {
      const out = provinceProduction(g, p)
      for (const k of Object.keys(tribute) as (keyof Production)[]) tribute[k] += Math.round(out[k] * v.tribute)
    }
  }
  const upkeep = g.campaign.agents.filter(a => a.hired).length * BALANCE.spy.upkeep + Math.max(0, Math.floor((menUnderArms(g) - BALANCE.military.upkeepFreeMen) / 10)) * BALANCE.military.upkeepGoldPer10
  const trade = g.campaign.contacts.filter(c => c.trade && c.relation >= 0 && knownRoute(g, c.provinceId).length > 0).length * BALANCE.diplomacy.tradeIncome
  const revenue = sum.gold + (done('market') ? 45 : 0), foodProduction = sum.food + (done('farms') ? 60 : 0)
  return {
    day: g.day, revenue, administration, upkeep, trade, tribute: tribute.gold, foodProduction, consumption,
    gold: revenue + trade + tribute.gold - administration - upkeep,
    food: foodProduction + tribute.food - consumption,
    wood: sum.wood + tribute.wood, stone: sum.stone + tribute.stone, iron: sum.iron + tribute.iron + (done('mine') ? 30 : 0),
    salt: sum.salt + tribute.salt, silver: sum.silver + tribute.silver,
    renown: g.campaign.vassals.length * BALANCE.vassal.monthlyRenown,
  }
}
export function processEconomy(g: GameState) {
  if (g.day % BALANCE.month !== 0) return
  const b = economicBalance(g), h = playerHouse(g)
  g.campaign.ledger.push(b); g.campaign.ledger = g.campaign.ledger.slice(-24)
  h.gold = Math.max(0, h.gold + b.gold); h.stock.food = Math.max(0, h.stock.food + b.food)
  h.stock.wood += b.wood; h.stock.stone += b.stone; h.stock.iron += b.iron; h.stock.salt += b.salt; h.stock.silver += b.silver; h.prestige += b.renown
  const goods = [['madeira', b.wood], ['pedra', b.stone], ['ferro', b.iron], ['sal', b.salt], ['prata', b.silver]].filter(([, v]) => v).map(([k, v]) => `+${v} ${k}`).join(', ')
  notify(g, 'Balanço mensal', `${h.name}: ${b.gold >= 0 ? '+' : ''}${b.gold} ouro, ${b.food >= 0 ? '+' : ''}${b.food} grãos${goods ? ', ' + goods : ''}${b.tribute ? `. Tributo de vassalos: ${b.tribute} ouro` : ''}.`, h.seatProvinceId)
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
