import type { GameState, Id } from './types'
import type { Vassal } from './mvpTypes'
import { BALANCE } from './balance'
import { clamp, nextId, playerHouse, playerSeat, record } from './stateUtils'
import { notify } from './notifications'
import { reveal } from './knowledge'
import { rulerOf } from './characters'

export type Terms = 'generosos' | 'firmes'
/**
 * A house swears fealty to the player and its lands pass to the player's rule: the player collects
 * everything they produce, recruits there and decides taxes and works. The family stays as a sworn
 * vassal; with generous terms its lord governs the old seat for you, with firm terms it is stripped.
 */
export function makeVassal(g: GameState, houseId: Id, path: Vassal['path'], terms: Terms) {
  if (g.campaign.vassals.some(v => v.houseId === houseId) || houseId === g.playerHouseId) return
  const house = g.world.houses.find(h => h.id === houseId)!
  const loyalty = clamp(BALANCE.vassal.loyalty[path] + BALANCE.vassal.loyalty[terms], 5, 100)
  const liege = playerSeat(g).liegeHouseId
  const lands = g.world.provinces.filter(p => p.governingHouseId === houseId && !p.occupyingHouseId)
  const levy = Math.round(house.mobilizable * (path === 'militar' ? .15 : .4))
  for (const p of lands) {
    p.governingHouseId = g.playerHouseId; p.legalHouseId = g.playerHouseId; p.liegeHouseId = liege
    // Newly taken land is restless; generous terms soften it.
    p.loyalty = clamp(p.loyalty + (terms === 'generosos' ? -5 : -15) + (path === 'militar' ? -15 : 0), 10, 100)
    reveal(g, p.id, 'investigada', 'Juramento de vassalagem')
    g.campaign.admin[p.id] = { tax: 'normal', governor: terms === 'generosos' && p.id === house.seatProvinceId ? `ruler-${houseId}` : null }
  }
  if (lands[0]) g.campaign.garrisons[house.seatProvinceId] = (g.campaign.garrisons[house.seatProvinceId] ?? 0) + levy
  house.mobilizable = Math.max(0, house.mobilizable - levy)
  g.campaign.vassals.push({ houseId, since: g.day, loyalty, tribute: 0, path, terms, provinceIds: lands.map(p => p.id) })
  g.campaign.influence[houseId] = 100
  g.campaign.politics.liegeThreat = clamp(g.campaign.politics.liegeThreat + BALANCE.politics.threatPerVassal[path], 0, 100)
  g.campaign.politics.kingFavor = clamp(g.campaign.politics.kingFavor + BALANCE.politics.kingPerVassal)
  playerHouse(g).prestige += path === 'militar' ? BALANCE.military.victoryRenown : 6
  house.memory.push(`Jurou lealdade à ${playerHouse(g).name} no dia ${g.day} e entregou suas terras.`)
  const contact = g.campaign.contacts.find(c => c.houseId === houseId)
  if (contact) contact.relation = clamp(contact.relation + (path === 'militar' ? -10 : 15))
  record(g, `A ${house.name} jurou vassalagem à ${playerHouse(g).name} e entregou ${lands.map(p => p.name).join(', ')} (${path}, termos ${terms}).`, [houseId, g.playerHouseId])
  notify(g, 'Terras sob seu governo', `${lands.map(p => p.name).join(' e ')} agora são suas: toda a produção vem para você, e você decide impostos, obras e recrutamento. ${rulerOf(g, houseId).name} ${terms === 'generosos' ? 'governa a antiga sede em seu nome' : 'perdeu o governo e vive sob sua vigilância'}. ${levy} homens da casa se juntam à sua guarnição.`, house.seatProvinceId, true)
}
/** Vassal loyalty drifts each month. A bitter vassal rises to take its old seat back. */
export function processVassals(g: GameState) {
  if (g.day % BALANCE.month !== 0) return
  for (const v of g.campaign.vassals) {
    const governs = Object.values(g.campaign.admin).some(a => a.governor === `ruler-${v.houseId}`)
    v.loyalty = clamp(v.loyalty + (v.terms === 'generosos' || governs ? 1 : -2), 0, 100)
    if (v.loyalty < BALANCE.vassal.rebelBelow && !g.campaign.decisions.some(d => !d.resolved && d.event?.key === 'revolta' && d.houseId === v.houseId)) {
      const house = g.world.houses.find(h => h.id === v.houseId)!, seat = g.world.provinces.find(p => p.id === house.seatProvinceId)!
      const rebels = Math.round(120 + seat.population * .03)
      g.campaign.decisions.push({ id: nextId(g, 'decision'), kind: 'evento', day: g.day, provinceId: seat.id, houseId: v.houseId, resolved: false, event: {
        key: 'revolta', title: `A ${house.name} se levanta`, text: `${rulerOf(g, v.houseId).name} reuniu ${rebels} homens em ${seat.name} para retomar a terra que perdeu. Sua guarnição lá tem ${g.campaign.garrisons[seat.id] ?? 0}.`,
        choices: [
          { id: 'concessao', label: 'Fazer concessões', detail: 'Devolver o governo da sede ao antigo lorde e pagar 150 de ouro. A lealdade dele volta a 45.', cost: '150 ouro' },
          { id: 'esmagar', label: 'Esmagar a revolta', detail: 'Sua guarnição enfrenta os rebeldes. Vencendo, a casa é quebrada; perdendo, a província volta para ela.' },
        ], data: { rebels } } })
      notify(g, 'Revolta', `A ${house.name} pegou em armas em ${seat.name}.`, seat.id, true)
    }
  }
}
