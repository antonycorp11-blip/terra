import type { GameState, Id, Resource } from './types'
import { STOCK_KEY } from './types'
import { BALANCE } from './balance'
import { hash } from './random'
import { clamp, editGame, isVassal, pay, playerHouse, playerSeat, requireRule } from './stateUtils'
import { knowledge, knownRoute, reveal, sightNeighbors } from './knowledge'
import { notify } from './notifications'
import { expeditionQuote } from './exploration'
import { initialRelation } from './relationships'
import { rulerOf } from './characters'
import { relationWith } from './influence'

const T = BALANCE.travel
export function travelQuote(g: GameState, provinceId: Id) {
  const p = g.world.provinces.find(x => x.id === provinceId)!, q = expeditionQuote(g, provinceId)
  const days = Math.max(3, Math.ceil(q.days * T.speed))
  const risk = (T.risk[p.terrain] ?? 12) + (p.realmId !== playerHouse(g).realmId ? T.foreignRealm : 0)
  return { route: q.route, days, risk, gold: T.gold }
}
/** The lord rides out in person: faster than scouts, meets the ruler, but the road may be ambushed. */
export function startTravel(game: GameState, provinceId: Id): GameState {
  requireRule(!game.campaign.travel, 'Irian já está viajando.')
  requireRule(provinceId !== playerSeat(game).id, 'Você já está em casa.')
  requireRule(knowledge(game, provinceId) >= 1, 'Você não sabe chegar a uma terra que nunca avistou.')
  const q = travelQuote(game, provinceId)
  requireRule(q.route.length > 1, 'Não há caminho conhecido até lá.')
  const g = editGame(game)
  pay(g, { gold: q.gold })
  g.campaign.travel = { provinceId, route: q.route, startDay: g.day, arriveDay: g.day + q.days, returnDay: g.day + q.days * 2, arrived: false, ambushed: false }
  notify(g, 'Irian partiu', `Com doze homens, Irian segue para ${knowledge(g, provinceId) >= 2 ? g.world.provinces.find(p => p.id === provinceId)!.name : 'as terras avistadas'}. Chegada em ${q.days} dias; risco de emboscada ${q.risk}%.`, provinceId)
  return g
}
export function processTravel(g: GameState) {
  const t = g.campaign.travel
  if (!t) return
  const seat = playerSeat(g), h = playerHouse(g)
  if ((g.day - t.startDay) % 10 === 0 && g.day > t.startDay) seat.loyalty = clamp(seat.loyalty - T.loyaltyPerTenDays, 0, 100)
  if (!t.arrived && g.day >= t.arriveDay) {
    t.arrived = true
    const p = g.world.provinces.find(x => x.id === t.provinceId)!, q = travelQuote(g, t.provinceId)
    t.ambushed = hash(`${g.world.seed}:travel:${t.provinceId}:${t.startDay}`) % 100 < q.risk
    if (t.ambushed) { h.gold = Math.max(0, h.gold - T.ambushGold); h.prestige = Math.max(0, h.prestige - T.ambushRenown); t.returnDay += T.delay }
    reveal(g, p.id, 'investigada', 'Visita do lorde'); sightNeighbors(g, p.id)
    const houseId = p.governingHouseId, house = g.world.houses.find(x => x.id === houseId)!
    let met = ''
    if (houseId !== g.playerHouseId && !isVassal(g, houseId)) {
      let contact = g.campaign.contacts.find(c => c.houseId === houseId)
      if (!contact) { contact = { houseId, provinceId: p.id, establishedDay: g.day, ...initialRelation(g, houseId, p.id), lastGiftDay: null, audienceUntil: g.day + 30, trade: false }; g.campaign.contacts.push(contact) }
      else if (contact.establishedDay === null) contact.establishedDay = g.day
      contact.relation = clamp(contact.relation + 5)
      const ruler = rulerOf(g, houseId); ruler.relationship.trust = clamp(ruler.relationship.trust + T.trust)
      ruler.memory.push({ day: g.day, text: 'Recebeu Irian em pessoa.' })
      met = ` ${ruler.name} ${house.name.replace('Casa ', '')} o recebeu pessoalmente: contato estabelecido e confiança +${T.trust}.`
    }
    notify(g, t.ambushed ? 'Emboscada na estrada' : `Irian chegou a ${p.name}`, `${t.ambushed ? `Salteadores atacaram a comitiva (−${T.ambushGold} ouro, −${T.ambushRenown} renome), mas Irian chegou a ${p.name}.` : `${p.name} pertence à ${house.name}.`}${met}`, p.id, true)
  }
  if (t.arrived && g.day >= t.returnDay) { g.campaign.travel = null; notify(g, 'Irian voltou', 'O lorde está de volta ao Castelo da Ponte Alta.', seat.id) }
}

/** Buying goods from a house that produces them, along a known route. Hostile houses refuse. */
export function sellers(g: GameState, resource: Resource) {
  return g.world.houses.filter(h => h.id !== g.playerHouseId && g.world.provinces.some(p => p.governingHouseId === h.id && p.resources.includes(resource) && knowledge(g, p.id) >= 2))
}
export function purchaseQuote(g: GameState, houseId: Id, resource: Resource) {
  const rel = relationWith(g, houseId), price = Math.ceil(BALANCE.trade.price[resource] * BALANCE.trade.batch * (rel < 10 ? 1.2 : 1))
  const seat = g.world.provinces.find(p => p.id === g.world.houses.find(h => h.id === houseId)!.seatProvinceId)!
  const refuses = rel < BALANCE.trade.hostileBelow ? 'Eles se recusam a negociar com você.' : knownRoute(g, seat.id).length === 0 && !isVassal(g, houseId) ? 'Não há rota conhecida até eles.' : null
  return { price, amount: BALANCE.trade.batch, refuses }
}
export function buyResource(game: GameState, houseId: Id, resource: Resource): GameState {
  const q = purchaseQuote(game, houseId, resource)
  requireRule(!q.refuses, q.refuses ?? '')
  requireRule(sellers(game, resource).some(h => h.id === houseId), 'Essa casa não produz esse recurso.')
  const g = editGame(game)
  pay(g, { gold: q.price })
  playerHouse(g).stock[STOCK_KEY[resource]] += q.amount
  g.world.houses.find(h => h.id === houseId)!.gold += q.price
  g.campaign.purchases.push({ houseId, resource, amount: q.amount, day: g.day })
  notify(g, 'Compra', `${q.amount} de ${resource} comprados da ${g.world.houses.find(h => h.id === houseId)!.name} por ${q.price} de ouro.`, null)
  return g
}
