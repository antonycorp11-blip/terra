import type { GameState, Id } from './types'
import { BALANCE } from './balance'
import { attackQuote, hasClaim, naturalGrievance } from './military'
import { bondWith, canInfluence, influenceOf } from './influence'
import { isVassal, playerSeat } from './stateUtils'
import { knowledge } from './knowledge'

/** One conquest path broken into concrete stages, each checked against the live campaign state. */
export interface Requirement { ok: boolean; text: string; detail: string }
export interface Stage { name: string; requirements: Requirement[]; done: boolean }
export interface Plan { path: 'militar' | 'diplomacia' | 'influência'; stages: Stage[]; level: number; next: string }
export const PATH_LABEL = ['Militar', 'Diplomacia', 'Influência'] as const

export function conquestPlan(g: GameState, provinceId: Id, path: 0 | 1 | 2): Plan {
  const p = g.world.provinces.find(x => x.id === provinceId)!, houseId = p.governingHouseId, house = g.world.houses.find(h => h.id === houseId)!
  const contact = g.campaign.contacts.find(c => c.houseId === houseId)
  const vassal = isVassal(g, houseId)
  let stages: Stage[]
  if (path === 0) {
    const seat = playerSeat(g), q = attackQuote(g, seat.id, provinceId), men = g.campaign.garrisons[seat.id] ?? 0
    const justified = hasClaim(g, provinceId) || naturalGrievance(g, provinceId)
    const marching = g.campaign.armies.find(a => a.houseId === g.playerHouseId && a.targetProvinceId === provinceId && a.order === 'atacar')
    stages = [
      { name: 'Justificativa', done: justified, requirements: [{ ok: justified, text: hasClaim(g, provinceId) ? 'Reivindicação legítima' : naturalGrievance(g, provinceId) ? 'Ofensa pública de Ardesh' : 'Uma reivindicação sobre a província', detail: justified ? 'A guerra será vista como justa.' : `Um espião pode fabricar uma em ${BALANCE.spy.claimDays} dias. Sem ela: −${BALANCE.military.unjustRenown} de renome e desconfiança geral.` }] },
      { name: 'Exército', done: men >= q.recommended, requirements: [
        { ok: men >= q.recommended, text: `${q.recommended} homens recomendados`, detail: `Você tem ${men} em ${seat.name}. Defensores estimados: ~${Math.round(q.defenders / 10) * 10}.` },
        { ok: q.route.length > 1, text: 'Caminho conhecido até lá', detail: q.route.length > 1 ? `${q.days} dias de marcha. O exército come ${BALANCE.military.marchFoodPer10PerDay} de grãos por 10 homens por dia.` : 'Explore as terras no caminho.' },
      ] },
      { name: `Cerco · muralha nível ${q.wall}`, done: Boolean(marching && marching.status !== 'marchando'), requirements: [{ ok: Boolean(marching), text: `${q.siegeDays} dias de cerco`, detail: marching ? `Seu exército ${marching.status === 'marchando' ? 'está a caminho' : marching.status === 'sitiando' ? 'cerca as muralhas' : 'aguarda a ordem de assalto'}.` : 'Comece a marcha na visão Militar.' }] },
      { name: 'Assalto e rendição', done: vassal, requirements: [{ ok: vassal, text: house.seatProvinceId === provinceId ? `${house.name} jura vassalagem` : 'A província fica ocupada por você', detail: 'Você escolhe a tática do assalto e os termos da rendição.' }] },
    ]
  } else if (path === 1) {
    const neg = g.campaign.negotiations.filter(n => n.houseId === houseId).at(-1)
    stages = [
      { name: 'Contato', done: Boolean(contact?.establishedDay !== null && contact), requirements: [{ ok: Boolean(contact && contact.establishedDay !== null), text: 'Emissário recebido', detail: contact?.establishedDay !== null && contact ? `Relação ${contact.relation > 0 ? '+' : ''}${contact.relation}.` : knowledge(g, provinceId) >= 2 ? 'Envie um emissário (40 de ouro).' : 'Explore a província antes.' }] },
      { name: 'Pacto comercial', done: Boolean(contact?.trade), requirements: [{ ok: Boolean(contact?.trade), text: 'Comércio aberto', detail: 'Negocie na visão Diplomacia: ofereça o que eles não produzem.' }] },
      { name: 'Aliança', done: Boolean(contact?.alliance), requirements: [{ ok: Boolean(contact?.alliance), text: 'Aliança selada', detail: 'Ouro, prata ou uma promessa de casamento convencem.' }] },
      { name: 'Tratado de vassalagem', done: vassal, requirements: [{ ok: vassal, text: `${house.name} aceita sua proteção`, detail: neg?.kind === 'vassalagem' && neg.status !== 'aceita' ? `Negociação em curso: rodada ${neg.round} de ${BALANCE.negotiation.maxRounds}.` : 'Proteção vale muito para quem se sente ameaçado.' }] },
    ]
  } else {
    const inf = influenceOf(g, houseId), bond = bondWith(g, houseId), ok = canInfluence(g, houseId) || vassal
    stages = [
      { name: 'Acesso à corte', done: ok, requirements: [{ ok, text: 'Contato ou mesmo feudo', detail: ok ? 'Você pode cortejar esta casa.' : 'Estabeleça contato antes.' }] },
      { name: 'Simpatia', done: inf >= BALANCE.influence.oathThreshold || vassal, requirements: [{ ok: inf >= BALANCE.influence.oathThreshold || vassal, text: `${BALANCE.influence.oathThreshold}% de influência`, detail: `Hoje: ${vassal ? 100 : inf}%. Banquetes, presentes e patrocínio aumentam.` }] },
      { name: 'Laço', done: Boolean(bond) || vassal, requirements: [{ ok: Boolean(bond) || vassal, text: 'Dívida, segredo ou casamento', detail: bond ? bond.text : 'Compre uma dívida, mande um espião buscar segredos ou proponha um casamento.' }] },
      { name: 'Juramento', done: vassal, requirements: [{ ok: vassal, text: `${house.name} troca de suserano`, detail: 'Nenhum soldado morre, mas o antigo suserano percebe.' }] },
    ]
  }
  const level = stages.findIndex(s => !s.done)
  const lvl = level < 0 ? stages.length : level
  return { path: (['militar', 'diplomacia', 'influência'] as const)[path], stages, level: lvl, next: lvl < stages.length ? stages[lvl].name : 'Concluído' }
}
