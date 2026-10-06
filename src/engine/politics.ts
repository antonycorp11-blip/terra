import type { GameState, Id } from './types'
import { BALANCE } from './balance'
import { clamp, controlled, isVassal, nextId, playerHouse, playerSeat, record } from './stateUtils'
import { notify } from './notifications'
import { enemyArmy } from './military'
import { makeVassal } from './vassals'
import { rulerOf } from './characters'

const P = BALANCE.politics
export const liegeHouse = (g: GameState) => g.world.houses.find(h => h.id === playerSeat(g).liegeHouseId)!
export const playerFief = (g: GameState) => g.world.fiefs.find(f => f.id === playerSeat(g).fiefId)!
export const sovereign = (g: GameState) => g.world.houses.find(h => h.id === g.world.realms.find(r => r.id === playerHouse(g).realmId)!.royalHouseId)!
/** Houses with a seat in the player's fief (the grand lord included). */
export const fiefHouses = (g: GameState) => { const f = playerFief(g); return g.world.houses.filter(h => f.provinceIds.includes(h.seatProvinceId)) }
export const isGrandLord = (g: GameState) => playerHouse(g).rank !== 'provincial'
/** Support needed to be recognised as grand lord: four of the fief's houses, the player included. */
export function ascension(g: GameState) {
  const houses = fiefHouses(g), support = houses.filter(h => h.id === g.playerHouseId || isVassal(g, h.id))
  const liege = liegeHouse(g), liegeBroken = isVassal(g, liege.id) || controlled(g).some(p => p.id === liege.seatProvinceId)
  return { support: support.length, needed: 4, total: houses.length, recognised: g.campaign.politics.kingPact || liegeBroken, ready: support.length >= 4 && (g.campaign.politics.kingPact || liegeBroken) }
}
const pending = (g: GameState, kind: string) => g.campaign.decisions.some(d => d.kind === kind && !d.resolved)
const decide = (g: GameState, kind: 'ultimato' | 'rei' | 'convocação', houseId: Id | null) => g.campaign.decisions.push({ id: nextId(g, 'decision'), kind, day: g.day, provinceId: houseId ? g.world.houses.find(h => h.id === houseId)!.seatProvinceId : null, houseId, resolved: false })

export function processPolitics(g: GameState) {
  const pol = g.campaign.politics
  if (isGrandLord(g)) return
  const liege = liegeHouse(g), h = playerHouse(g)
  // Quarterly tribute to the liege.
  if (g.day > 0 && g.day % P.tributeDays === 0 && pol.stage !== 'guerra') {
    if (h.gold >= P.tributeGold) { h.gold -= P.tributeGold; pol.lastTributeDay = g.day; pol.liegeThreat = clamp(pol.liegeThreat - 3, 0, 100); notify(g, 'Tributo pago', `${P.tributeGold} de ouro seguiram para a ${liege.name}, como manda o juramento.`, liege.seatProvinceId) }
    else { pol.liegeThreat = clamp(pol.liegeThreat + 10, 0, 100); notify(g, 'Tributo atrasado', `Sem ouro para o tributo. A ${liege.name} toma nota.`, liege.seatProvinceId, true) }
  }
  if (g.day % BALANCE.month === 0 && (pol.stage === 'calmo' || pol.stage === 'advertido')) pol.liegeThreat = clamp(pol.liegeThreat - P.decay, 0, 100)
  // The liege summons his vassals against Ardesh: an early test of loyalty.
  if (g.day === P.levyDay && !pending(g, 'convocação')) {
    decide(g, 'convocação', liege.id)
    notify(g, 'Convocação', `${rulerOf(g, liege.id).name} ${liege.name.replace('Casa ', '')} reúne os vassalos contra as incursões de Ardesh e exige ${P.levyMen} homens de Pontevela por ${P.levyDays} dias.`, liege.seatProvinceId, true)
  }
  if (pol.liegeThreat >= P.warned && pol.stage === 'calmo') { pol.stage = 'advertido'; notify(g, 'Desconfiança', `${liege.name} manda dizer que observa sua ascensão. Presentes e tributo em dia acalmam o grão-lorde.`, liege.seatProvinceId, true) }
  // One step of escalation per day, so each warning reaches the player before the next.
  else if (pol.liegeThreat >= P.ultimatum && pol.stage === 'advertido' && !pending(g, 'ultimato')) { pol.stage = 'ultimato'; decide(g, 'ultimato', liege.id); notify(g, 'Ultimato', `${liege.name} exige ${P.submitGold} de ouro e a renúncia aos novos vassalos, ou tomará Pontevela.`, liege.seatProvinceId, true) }
  else if (pol.liegeThreat >= P.war && pol.stage === 'ultimato' && !pending(g, 'ultimato')) declareWar(g)
  // The sovereign watches: if the grand lord weakens, the crown may back the player, for a price.
  if (pol.kingFavor >= P.kingOffer && !pol.kingPact && pol.liegeThreat >= 30 && !pending(g, 'rei') && !g.campaign.decisions.some(d => d.kind === 'rei' && g.day - d.day < 90)) {
    const king = sovereign(g); decide(g, 'rei', king.id)
    notify(g, 'Mensageiro da coroa', `${rulerOf(g, king.id).role} ${rulerOf(g, king.id).name} ${king.name.replace('Casa ', '')} oferece reconhecer suas conquistas em troca de ${P.kingPactGold} de ouro e lealdade direta à coroa.`, king.seatProvinceId, true)
  }
  const asc = ascension(g)
  if (asc.ready) becomeGrandLord(g)
}
export function declareWar(g: GameState) {
  const pol = g.campaign.politics, liege = liegeHouse(g)
  pol.stage = 'guerra'; pol.liegeThreat = 100
  if (pol.kingPact) {
    pol.stage = 'advertido'; pol.liegeThreat = 60
    notify(g, 'A coroa intervém', `${liege.name} reuniu seus homens, mas a coroa proibiu a guerra entre vassalos. Hadrin recua, furioso.`, liege.seatProvinceId, true)
    return
  }
  const target = controlled(g).slice().sort((a, b) => (g.campaign.garrisons[a.id] ?? 0) - (g.campaign.garrisons[b.id] ?? 0))[0] ?? playerSeat(g)
  const men = Math.round(liege.mobilizable * .6)
  enemyArmy(g, liege.id, men, liege.seatProvinceId, target.id)
  notify(g, 'Guerra', `${liege.name} declarou guerra. ${men} homens marcham contra ${target.name}. Reforce a guarnição ou busque a proteção da coroa.`, target.id, true)
  record(g, `${liege.name} declarou guerra à ${playerHouse(g).name}.`, [liege.id, g.playerHouseId])
}
export function becomeGrandLord(g: GameState) {
  const fief = playerFief(g), old = liegeHouse(g), h = playerHouse(g)
  fief.grandHouseId = h.id; h.rank = 'grão-senhorial'; h.titleIds = [...h.titleIds, fief.id]; h.prestige += 25
  const crown = sovereign(g)
  for (const p of g.world.provinces) if (fief.provinceIds.includes(p.id)) p.liegeHouseId = p.governingHouseId === h.id ? crown.id : h.id
  if (!isVassal(g, old.id)) makeVassal(g, old.id, 'militar', 'firmes')
  g.campaign.politics.stage = 'reconhecido'; g.campaign.politics.liegeThreat = 0
  record(g, `A ${h.name} foi reconhecida como grã-senhora de ${fief.name}.`, [h.id, fief.id])
  // A milestone scene: the first rung of the ladder is climbed.
  g.campaign.decisions.push({ id: nextId(g, 'decision'), kind: 'evento', day: g.day, provinceId: h.seatProvinceId, houseId: null, resolved: false, event: { key: 'marco', title: `Grão-lorde de ${fief.name}`, text: `No salão de ${playerSeat(g).name}, as casas de ${fief.name} se ajoelham. A ${old.name} entrega o estandarte do feudo, e a coroa manda o selo que reconhece o título. Irian já não é um lorde de ponte: é o senhor de ${fief.name}. Próxima ambição: o trono de ${g.world.realms.find(r => r.id === h.realmId)!.name}.`, data: {}, choices: [{ id: 'seguir', label: 'Erguer a taça', detail: 'Renome +25. As casas do feudo agora respondem a você.' }] } })
  notify(g, 'Grão-lorde de ' + fief.name, `As casas de ${fief.name} juram lealdade a você, e a coroa reconhece o título. Próxima ambição: o trono de ${g.world.realms.find(r => r.id === h.realmId)!.name}.`, h.seatProvinceId, true)
}
