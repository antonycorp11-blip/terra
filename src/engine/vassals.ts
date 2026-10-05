import type { GameState, Id } from './types'
import type { Vassal } from './mvpTypes'
import { BALANCE } from './balance'
import { clamp, playerHouse, record } from './stateUtils'
import { notify } from './notifications'
import { reveal } from './knowledge'

export type Terms = 'generosos' | 'firmes'
/** A house swears fealty to the player. Its provinces take the player's colours; its old liege notices. */
export function makeVassal(g: GameState, houseId: Id, path: Vassal['path'], terms: Terms) {
  if (g.campaign.vassals.some(v => v.houseId === houseId) || houseId === g.playerHouseId) return
  const house = g.world.houses.find(h => h.id === houseId)!
  const loyalty = clamp(BALANCE.vassal.loyalty[path] + BALANCE.vassal.loyalty[terms], 5, 100)
  g.campaign.vassals.push({ houseId, since: g.day, loyalty, tribute: BALANCE.vassal.tribute[terms], path })
  for (const p of g.world.provinces) if (p.governingHouseId === houseId) { p.liegeHouseId = g.playerHouseId; reveal(g, p.id, 'investigada', 'Juramento de vassalagem') }
  g.campaign.influence[houseId] = 100
  g.campaign.politics.liegeThreat = clamp(g.campaign.politics.liegeThreat + BALANCE.politics.threatPerVassal[path], 0, 100)
  g.campaign.politics.kingFavor = clamp(g.campaign.politics.kingFavor + BALANCE.politics.kingPerVassal)
  playerHouse(g).prestige += path === 'militar' ? BALANCE.military.victoryRenown : 6
  house.memory.push(`Jurou lealdade à ${playerHouse(g).name} no dia ${g.day}.`)
  const contact = g.campaign.contacts.find(c => c.houseId === houseId)
  if (contact) contact.relation = clamp(contact.relation + (path === 'militar' ? -10 : 15))
  record(g, `A ${house.name} jurou vassalagem à ${playerHouse(g).name} (${path}, termos ${terms}).`, [houseId, g.playerHouseId])
  notify(g, 'Nova vassala', `A ${house.name} agora jura lealdade a você. Tributo de ${Math.round(BALANCE.vassal.tribute[terms] * 100)}% da produção, lealdade inicial ${loyalty}.`, house.seatProvinceId, true)
}
/** Vassal loyalty drifts each month; a broken vassal stops paying and eventually renounces the oath. */
export function processVassals(g: GameState) {
  if (g.day % BALANCE.month !== 0) return
  for (const v of [...g.campaign.vassals]) {
    const house = g.world.houses.find(h => h.id === v.houseId)!
    v.loyalty = clamp(v.loyalty + (v.tribute <= .15 ? 1 : -1), 0, 100)
    if (v.loyalty < 5) {
      g.campaign.vassals = g.campaign.vassals.filter(x => x !== v)
      const fief = g.world.fiefs.find(f => f.id === g.world.provinces.find(p => p.id === house.seatProvinceId)!.fiefId)!
      for (const p of g.world.provinces) if (p.governingHouseId === v.houseId) p.liegeHouseId = fief.grandHouseId === v.houseId ? g.world.realms.find(r => r.id === p.realmId)!.royalHouseId : fief.grandHouseId
      notify(g, 'Juramento rompido', `A ${house.name} renunciou à vassalagem. Tributos pesados e pouca atenção cobram seu preço.`, house.seatProvinceId, true)
    } else if (v.loyalty < BALANCE.vassal.rebelBelow) notify(g, 'Vassala inquieta', `A ${house.name} deixou de pagar tributo. Lealdade ${v.loyalty}.`, house.seatProvinceId)
  }
}
