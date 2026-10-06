import type { GameState, Id } from './types'
import type { BondKind } from './mvpTypes'
import { BALANCE } from './balance'
import { hash } from './random'
import { clamp, editGame, isVassal, nextId, pay, playerHouse, requireRule } from './stateUtils'
import { notify } from './notifications'
import { rulerOf } from './characters'
import { playerFief } from './politics'

const I = BALANCE.influence
export const influenceOf = (g: GameState, houseId: Id) => g.campaign.influence[houseId] ?? 0
/** Debts are part of the world: Quellan owes Mercol; a few other houses owe their creditors too. */
export function debtOf(g: GameState, houseId: Id): { amount: number; creditor: string } | null {
  if (g.campaign.bonds.some(b => b.houseId === houseId && b.kind === 'dívida')) return null
  const house = g.world.houses.find(h => h.id === houseId)!
  if (house.name === 'Casa Quellan') return { amount: 900, creditor: 'Casa Mercol' }
  if (house.rank !== 'provincial') return null
  const n = hash(`${g.world.seed}:debt:${houseId}`)
  return n % 5 === 0 ? { amount: 500 + n % 700, creditor: g.world.houses.find(h => h.id === g.world.fiefs.find(f => f.provinceIds.includes(house.seatProvinceId))!.grandHouseId)!.name } : null
}
/** Houses the player can court: those of the player's own fief and any house with established contact. */
export function canInfluence(g: GameState, houseId: Id) {
  if (houseId === g.playerHouseId || isVassal(g, houseId)) return false
  const house = g.world.houses.find(h => h.id === houseId)!
  return playerFief(g).provinceIds.includes(house.seatProvinceId) || g.campaign.contacts.some(c => c.houseId === houseId && c.establishedDay !== null)
}
export const relationWith = (g: GameState, houseId: Id) => g.campaign.contacts.find(c => c.houseId === houseId)?.relation ?? 0
export function cooldownLeft(g: GameState, houseId: Id, kind: string, days: number) { const last = g.campaign.influenceCooldowns[`${houseId}:${kind}`]; return last === undefined ? 0 : Math.max(0, last + days - g.day) }
/**
 * How much of an effort turns into influence: a friendly, open lord is easier to win; a proud or
 * suspicious one resists, and the closer a house is to swearing, the harder each step gets.
 */
export function influenceGain(g: GameState, houseId: Id, base: number) {
  const r = relationWith(g, houseId), ruler = rulerOf(g, houseId), now = influenceOf(g, houseId)
  let f = r >= 20 ? 1 : r >= 0 ? .8 : .5
  if (ruler.traits.includes('desconfiado')) f *= .7
  if (ruler.traits.includes('orgulhoso')) f *= .8
  if (ruler.traits.includes('acolhedor') || ruler.traits.includes('generoso')) f *= 1.2
  if (ruler.second) f *= .75 // two minds must both be won
  f *= now >= 60 ? .5 : now >= 40 ? .7 : 1
  return Math.max(1, Math.round(base * f))
}
/** Days since the player last did anything to court a house. */
export function lastCourted(g: GameState, houseId: Id) {
  const days = Object.entries(g.campaign.influenceCooldowns).filter(([k]) => k.startsWith(`${houseId}:`)).map(([, d]) => d)
  return days.length ? Math.max(...days) : 0
}
const addBond = (g: GameState, houseId: Id, kind: BondKind, text: string) => { g.campaign.bonds.push({ houseId, kind, day: g.day, text }) }

export type InfluenceAction = 'banquete' | 'patrocínio' | 'casamento' | 'dívida'
export function influenceAction(game: GameState, houseId: Id, action: InfluenceAction): GameState {
  requireRule(canInfluence(game, houseId), 'Estabeleça contato com essa casa antes.')
  const g = editGame(game), house = g.world.houses.find(h => h.id === houseId)!, ruler = rulerOf(g, houseId)
  const add = (n: number) => { g.campaign.influence[houseId] = clamp(influenceOf(g, houseId) + n, 0, 100) }
  if (action === 'banquete') {
    requireRule(cooldownLeft(g, houseId, action, I.banquet.cooldown) === 0, 'Espere antes de oferecer outro banquete a essa casa.')
    pay(g, { gold: I.banquet.gold, food: I.banquet.food })
    const gain = influenceGain(g, houseId, I.banquet.gain)
    add(gain); ruler.memory.push({ day: g.day, text: `Foi recebido num banquete da ${playerHouse(g).name}.` })
    notify(g, 'Banquete', `${ruler.name} ${house.name.replace('Casa ', '')} jantou em Pontevela. Influência +${gain}.`, house.seatProvinceId)
  } else if (action === 'patrocínio') {
    requireRule(cooldownLeft(g, houseId, action, I.patronage.cooldown) === 0, 'Espere antes de patrocinar essa corte de novo.')
    const gain = influenceGain(g, houseId, I.patronage.gain)
    pay(g, { silver: I.patronage.silver }); add(gain)
    notify(g, 'Patrocínio', `Sua prata financiou a corte da ${house.name}. Influência +${gain}.`, house.seatProvinceId)
  } else if (action === 'casamento') {
    requireRule(relationWith(g, houseId) >= I.marriage.relation, `A relação precisa estar em +${I.marriage.relation} para propor um casamento.`)
    requireRule(!g.campaign.bonds.some(b => b.houseId === houseId && b.kind === 'casamento'), 'Já existe uma promessa de casamento com essa casa.')
    pay(g, { renown: I.marriage.renown }); add(influenceGain(g, houseId, 8))
    addBond(g, houseId, 'casamento', `Promessa de casamento entre Lívia Serraval e a família ${house.name.replace('Casa ', '')}.`)
    notify(g, 'Promessa de casamento', `A ${house.name} aceitou a promessa. As famílias agora estão ligadas.`, house.seatProvinceId, true)
  } else {
    const debt = debtOf(g, houseId)
    requireRule(debt, 'Essa casa não tem dívidas à venda.')
    pay(g, { gold: debt.amount }); add(influenceGain(g, houseId, 10))
    addBond(g, houseId, 'dívida', `Você comprou da ${debt.creditor} a dívida de ${debt.amount} de ouro da ${house.name}.`)
    notify(g, 'Dívida comprada', `A ${house.name} agora deve ${debt.amount} de ouro a você, e não à ${debt.creditor}.`, house.seatProvinceId, true)
  }
  g.campaign.influenceCooldowns[`${houseId}:${action}`] = g.day
  return g
}
export const bondWith = (g: GameState, houseId: Id) => g.campaign.bonds.find(b => b.houseId === houseId)
export const oathReady = (g: GameState, houseId: Id) => influenceOf(g, houseId) >= I.oathThreshold && relationWith(g, houseId) >= I.oathRelation && Boolean(bondWith(g, houseId)) && !isVassal(g, houseId)
/** Calls the oath ceremony; the terms are chosen in the decision that follows. */
export function proposeOath(game: GameState, houseId: Id): GameState {
  requireRule(oathReady(game, houseId), `É preciso ${I.oathThreshold}% de influência, relação +${I.oathRelation} e um laço (dívida, segredo ou casamento).`)
  requireRule(!game.campaign.decisions.some(d => d.kind === 'juramento' && d.houseId === houseId && !d.resolved), 'A cerimônia já foi marcada.')
  const g = editGame(game), house = g.world.houses.find(h => h.id === houseId)!
  g.campaign.decisions.push({ id: nextId(g, 'decision'), kind: 'juramento', day: g.day, provinceId: house.seatProvinceId, houseId, resolved: false, choice: 'influência' })
  notify(g, 'Cerimônia de juramento', `${rulerOf(g, houseId).name} aceita jurar lealdade a você. Defina os termos.`, house.seatProvinceId, true)
  return g
}
export function processInfluence(g: GameState) {
  if (g.day % BALANCE.month !== 0) return
  for (const id of Object.keys(g.campaign.influence)) {
    if (isVassal(g, id)) continue
    const r = relationWith(g, id), v = g.campaign.influence[id]
    // Rival courts work too: influence nobody tends fades.
    const neglected = v > I.decayBelow && g.day - lastCourted(g, id) > I.neglectDays ? -I.neglectDecay : 0
    g.campaign.influence[id] = clamp(v + neglected + (r >= 20 ? I.monthlyFriendly : r < 0 && v > I.decayBelow ? -1 : 0), 0, 100)
  }
}
