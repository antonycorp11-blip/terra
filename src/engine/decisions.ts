import type { GameState, Id } from './types'
import type { Decision, Tactic } from './mvpTypes'
import { BALANCE } from './balance'
import { clamp, editGame, pay, playerHouse, playerSeat, requireRule } from './stateUtils'
import { notify } from './notifications'
import { assault } from './military'
import { makeVassal, type Terms } from './vassals'
import { liegeHouse, sovereign, declareWar } from './politics'
import { newArmy, armyRoute } from './military'
import { resolveEvent } from './events'
import { fieldQuote, fight } from './party'

export const openDecisions = (g: GameState) => g.campaign.decisions.filter(d => !d.resolved)
export interface Choice { id: string; label: string; detail: string; cost?: string }
/** The options each decision offers, with their consequences spelled out for the player. */
export function choicesFor(g: GameState, d: Decision): Choice[] {
  if (d.kind === 'evento') return d.event!.choices
  if (d.kind === 'combate') {
    const q = fieldQuote(g, d), F = BALANCE.field
    const list: Choice[] = [
      { id: 'investida', label: F.investida.label, detail: 'Atacar de frente com tudo: mais força, mais perdas.' },
      { id: 'linha', label: F.linha.label, detail: d.ambush ? 'Defender-se em formação: perdas menores, +15% de força.' : 'Avançar em formação: perdas menores.' },
    ]
    if (q.cover && !d.ambush) list.push({ id: 'emboscada', label: F.emboscada.label, detail: 'Usar o terreno para surpreender: +30% de força.', cost: `${F.emboscada.renown} renome` })
    list.push({ id: 'recuar', label: 'Recuar', detail: `Fugir para a terra sua mais próxima perdendo ${Math.round(F.retreatLoss * 100)}% dos homens.` })
    return list
  }
  const P = BALANCE.politics, M = BALANCE.military
  switch (d.kind) {
    case 'assalto': {
      const a = g.campaign.armies.find(x => x.id === d.armyId)
      const list: Choice[] = [
        { id: 'assalto', label: M.tactics.assalto.label, detail: 'Escadas e aríete agora. Perdas altas, resultado imediato.' },
        { id: 'amanhecer', label: M.tactics.amanhecer.label, detail: 'Surpreender a muralha antes do sol: +14% de força.', cost: `${M.tactics.amanhecer.renown} renome` },
      ]
      if (!a?.starved) list.push({ id: 'cerco', label: M.tactics.cerco.label, detail: `Mais ${M.tactics.cerco.extraDays} dias de cerco; os defensores perdem 32% da força e você perde menos homens.`, cost: `${Math.ceil((a?.men ?? 0) / 10) * M.tactics.cerco.foodPer10} grãos` })
      return list
    }
    case 'submissão': case 'juramento': return [
      { id: 'generosos', label: 'Termos generosos', detail: 'As terras passam a ser suas, mas o antigo lorde governa a sede em seu nome. Menos revolta, lealdade mais alta.' },
      { id: 'firmes', label: 'Termos firmes', detail: 'As terras passam a ser suas e a família perde todo o governo. Lealdade baixa, risco de revolta.' },
    ]
    case 'ultimato': return [
      { id: 'submeter', label: 'Ceder ao grão-lorde', detail: `Pagar ${P.submitGold} de ouro. A ameaça cai ${P.submitRelief} pontos e a paz volta, por ora.`, cost: `${P.submitGold} ouro` },
      { id: 'recusar', label: 'Recusar', detail: 'Hadrin vai marchar contra você. Prepare as muralhas e as guarnições.' },
    ]
    case 'rei': return [
      { id: 'aceitar', label: 'Aceitar a coroa como protetora', detail: `Pagar ${P.kingPactGold} de ouro. A coroa impede a guerra do grão-lorde e reconhece sua ascensão quando 4 casas do feudo apoiarem você.`, cost: `${P.kingPactGold} ouro` },
      { id: 'recusar', label: 'Recusar com cortesia', detail: 'Você mantém o ouro, e a coroa esfria.' },
    ]
    case 'convocação': return [
      { id: 'enviar', label: `Enviar ${P.levyMen} homens`, detail: `Saem de Pontevela por ${P.levyDays} dias. Hadrin confia mais em você (−15 de ameaça).` },
      { id: 'recusar', label: 'Inventar uma desculpa', detail: 'Seus homens ficam em casa. Hadrin percebe (+12 de ameaça).' },
    ]
  }
}
export function resolveDecision(game: GameState, decisionId: Id, choice: string): GameState {
  const d = game.campaign.decisions.find(x => x.id === decisionId)
  requireRule(d && !d.resolved, 'Essa decisão já foi tomada.')
  requireRule(choicesFor(game, d).some(c => c.id === choice), 'Escolha inválida.')
  if (d.kind === 'assalto') return assault(game, d.armyId!, choice as Tactic)
  if (d.kind === 'combate') { const g = editGame(game), dec = g.campaign.decisions.find(x => x.id === decisionId)!; dec.resolved = true; fight(g, dec, choice); return g }
  const g = editGame(game), dec = g.campaign.decisions.find(x => x.id === decisionId)!, pol = g.campaign.politics, P = BALANCE.politics
  const path = dec.choice === 'diplomacia' ? 'diplomacia' : dec.choice === 'influência' ? 'influência' : 'militar'
  dec.resolved = true
  switch (dec.kind) {
    case 'evento': resolveEvent(g, dec, choice); break
    case 'submissão': case 'juramento': dec.choice = choice; makeVassal(g, dec.houseId!, dec.kind === 'submissão' ? 'militar' : path, choice as Terms); break
    case 'ultimato':
      dec.choice = choice
      if (choice === 'submeter') { pay(g, { gold: P.submitGold }); pol.liegeThreat = clamp(pol.liegeThreat - P.submitRelief, 0, 100); pol.stage = 'advertido'; notify(g, 'Paz comprada', `${liegeHouse(g).name} aceitou o ouro. Por ora.`, liegeHouse(g).seatProvinceId) }
      else { pol.liegeThreat = 100; declareWar(g) }
      break
    case 'rei':
      dec.choice = choice
      if (choice === 'aceitar') { pay(g, { gold: P.kingPactGold }); pol.kingPact = true; pol.kingFavor = clamp(pol.kingFavor + 20); notify(g, 'Pacto com a coroa', `A ${sovereign(g).name} agora protege sua casa e reconhecerá sua ascensão.`, sovereign(g).seatProvinceId, true) }
      else { pol.kingFavor = clamp(pol.kingFavor - 15); notify(g, 'A coroa esfria', 'O mensageiro parte em silêncio.', null) }
      break
    case 'convocação': {
      dec.choice = choice
      const seat = playerSeat(g), liege = liegeHouse(g)
      if (choice === 'enviar') {
        const men = Math.min(P.levyMen, g.campaign.garrisons[seat.id] ?? 0)
        g.campaign.garrisons[seat.id] -= men
        pol.liegeThreat = clamp(pol.liegeThreat - 15, 0, 100)
        const route = armyRoute(g, liege.seatProvinceId, seat.id, false)
        // The levy serves at the liege's seat, then marches home.
        if (route.length > 1) newArmy(g, g.playerHouseId, men, route, 'mover', P.levyDays)
        else g.campaign.garrisons[seat.id] += men
        notify(g, 'Homens enviados', `${men} homens servem a ${liege.name} e voltam em cerca de ${P.levyDays} dias.`, liege.seatProvinceId)
      } else { pol.liegeThreat = clamp(pol.liegeThreat + 12, 0, 100); notify(g, 'Desculpa enviada', `${liege.name} não acreditou muito na desculpa.`, liege.seatProvinceId) }
      playerHouse(g).memory.push(`Respondeu à convocação de ${liege.name}: ${choice}.`)
      break
    }
  }
  return g
}
