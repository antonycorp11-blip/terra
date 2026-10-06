import type { GameState, Id } from './types'
import type { Negotiation, OfferKind } from './mvpTypes'
import { BALANCE } from './balance'
import { clamp, editGame, isVassal, nextId, pay, playerHouse, playerSeat, requireRule } from './stateUtils'
import { notify } from './notifications'
import { rulerOf } from './characters'
import { diplomacyQuote } from './diplomacy'
import { influenceOf, relationWith } from './influence'
import { menUnderArms } from './economy'
import { defenders } from './military'

const NG = BALANCE.negotiation
export const NEGOTIATION_LABEL: Record<Negotiation['kind'], string> = { 'comércio': 'Pacto comercial', 'aliança': 'Aliança', vassalagem: 'Vassalagem por tratado' }
export interface Offer { kind: OfferKind; label: string; cost: { gold?: number; silver?: number; renown?: number }; value: number; available: boolean; why: string }

/** What a house fears: a stronger neighbour or its creditors. Protection is worth more to the threatened. */
export function threatTo(g: GameState, houseId: Id): string | null {
  const house = g.world.houses.find(h => h.id === houseId)!
  if (house.name === 'Casa Vasterre') return 'teme as incursões de Ardesh'
  if (house.name === 'Casa Quellan') return 'teme os cobradores da Casa Mercol'
  if (g.campaign.wars.some(w => w.active && w.defenderId === houseId)) return 'está em guerra e precisa de aliados'
  if (g.campaign.bonds.some(b => b.houseId === houseId && b.kind === 'dívida')) return 'deve a você e teme a cobrança'
  if (house.rank === 'provincial' && defenders(g, g.world.provinces.find(p => p.id === house.seatProvinceId)!) < 250) return 'tem poucos homens para se defender'
  return null
}
/** Men under arms the player needs before a house accepts vassalage by treaty: 1.5× its defenders. */
export const vassalStrength = (g: GameState, houseId: Id) => Math.ceil(defenders(g, g.world.provinces.find(p => p.id === g.world.houses.find(h => h.id === houseId)!.seatProvinceId)!) * 1.5 / 10) * 10
export function offersFor(g: GameState, houseId: Id): Offer[] {
  const house = g.world.houses.find(h => h.id === houseId)!, contact = g.campaign.contacts.find(c => c.houseId === houseId)
  const seat = g.world.provinces.find(p => p.id === house.seatProvinceId)!
  const mine = playerSeat(g).resources, theirs = seat.resources
  const lacks = mine.filter(r => !theirs.includes(r))
  const threat = threatTo(g, houseId), men = menUnderArms(g)
  const debt = g.campaign.bonds.find(b => b.houseId === houseId && b.kind === 'dívida')
  return [
    { kind: 'ouro', label: '150 de ouro', cost: { gold: 150 }, value: house.gold < 900 ? 18 : 10, available: true, why: house.gold < 900 ? 'O cofre deles está baixo.' : 'Ouro sempre ajuda.' },
    { kind: 'prata', label: '40 de prata', cost: { silver: 40 }, value: 15, available: true, why: 'Prata compra favores na corte.' },
    { kind: 'comércio', label: 'Abrir comércio', cost: {}, value: contact?.trade ? 0 : 8 + lacks.length * 6, available: !contact?.trade, why: lacks.length ? `Eles não produzem ${lacks.join(' e ')}, e você sim.` : 'Pouco que vocês produzem lhes falta.' },
    { kind: 'proteção', label: 'Prometer proteção', cost: {}, value: threat ? 30 : 4, available: men >= 400, why: threat ? `A casa ${threat}.` : men >= 400 ? 'Eles não se sentem ameaçados.' : 'Você precisa de 400 homens em armas.' },
    { kind: 'casamento', label: 'Promessa de casamento', cost: { renown: 10 }, value: 20, available: relationWith(g, houseId) >= 0, why: 'Une as famílias. Exige relação não hostil.' },
    { kind: 'perdão', label: 'Perdoar a dívida', cost: {}, value: 35, available: Boolean(debt), why: debt ? 'Você comprou a dívida deles.' : 'Compre uma dívida antes (Influência).' },
  ]
}
/** Willingness to accept: the offers on the table, the relationship, your influence and the ruler's temperament. */
export function scoreOffer(g: GameState, houseId: Id, kind: Negotiation['kind'], offers: OfferKind[]) {
  const ruler = rulerOf(g, houseId), list = offersFor(g, houseId)
  let score = offers.reduce((s, k) => s + (list.find(o => o.kind === k)?.value ?? 0), 0) + relationWith(g, houseId) / 2 + influenceOf(g, houseId) / 4
  if (ruler.traits.includes('generoso')) score += 5
  if (ruler.traits.includes('desconfiado')) score -= 10
  if (kind === 'vassalagem' && (ruler.traits.includes('orgulhoso') || ruler.traits.includes('ambicioso'))) score -= 15
  if (ruler.second) score -= 5 // two minds must agree
  return Math.round(score)
}
export function negotiationBlocked(g: GameState, houseId: Id, kind: Negotiation['kind']): string | null {
  const contact = g.campaign.contacts.find(c => c.houseId === houseId)
  if (!contact || contact.establishedDay === null) return 'Envie um emissário antes.'
  if (isVassal(g, houseId)) return 'Essa casa já é sua vassala.'
  if (g.campaign.negotiations.some(n => n.houseId === houseId && (n.status === 'aberta' || n.status === 'aguardando'))) return null
  const failed = g.campaign.negotiations.filter(n => n.houseId === houseId && n.kind === kind && n.status === 'recusada').at(-1)
  if (failed && g.day - failed.replyDay < NG.failCooldown) return `Recusaram há pouco. Espere ${NG.failCooldown - (g.day - failed.replyDay)} dias.`
  if (kind === 'aliança' && !contact.trade) return 'Uma aliança exige um pacto comercial antes.'
  if (kind === 'vassalagem' && !contact.alliance) return 'Um tratado de vassalagem exige uma aliança antes.'
  if (kind === 'vassalagem') {
    // A house only gives up its land to someone it needs and fears a little.
    const need = vassalStrength(g, houseId)
    if (!threatTo(g, houseId)) return 'Essa casa não teme nada que você possa resolver. Espere uma guerra, uma dívida ou um vizinho forte.'
    if (menUnderArms(g) < need) return `Eles só se curvam a quem é mais forte: você precisa de ${need} homens em armas.`
  }
  if (kind === 'comércio' && contact.trade) return 'O comércio já está aberto.'
  return null
}
export function startNegotiation(game: GameState, houseId: Id, kind: Negotiation['kind']): GameState {
  const blocked = negotiationBlocked(game, houseId, kind); requireRule(!blocked, blocked ?? '')
  const open = game.campaign.negotiations.find(n => n.houseId === houseId && (n.status === 'aberta' || n.status === 'aguardando'))
  requireRule(!open, 'Já há uma negociação em curso com essa casa.')
  const g = editGame(game)
  g.campaign.negotiations.push({ id: nextId(g, 'negotiation'), houseId, kind, round: 1, status: 'aberta', offers: [], replyDay: g.day, lastScore: 0, needed: NG.thresholds[kind], startDay: g.day, log: [] })
  return g
}
/** Sends a proposal. Costs are held by the emissary and returned if the house refuses. */
export function propose(game: GameState, negotiationId: Id, offers: OfferKind[]): GameState {
  const n = game.campaign.negotiations.find(x => x.id === negotiationId)
  requireRule(n && n.status === 'aberta', 'Essa negociação não aceita propostas agora.')
  const list = offersFor(game, n.houseId)
  for (const k of offers) requireRule(list.find(o => o.kind === k)?.available, 'Uma das ofertas não está disponível.')
  const g = editGame(game), neg = g.campaign.negotiations.find(x => x.id === negotiationId)!
  const cost = offers.reduce((c, k) => { const o = list.find(x => x.kind === k)!; return { gold: (c.gold ?? 0) + (o.cost.gold ?? 0), silver: (c.silver ?? 0) + (o.cost.silver ?? 0), renown: (c.renown ?? 0) + (o.cost.renown ?? 0) } }, {} as { gold?: number; silver?: number; renown?: number })
  pay(g, cost)
  neg.offers = offers; neg.status = 'aguardando'; neg.lastScore = scoreOffer(g, neg.houseId, neg.kind, offers)
  const house = g.world.houses.find(h => h.id === neg.houseId)!
  neg.replyDay = g.day + diplomacyQuote(g, house.seatProvinceId)
  neg.log.push(`Rodada ${neg.round}: ${offers.map(k => list.find(o => o.kind === k)!.label.toLowerCase()).join(', ') || 'nenhuma oferta'}.`)
  notify(g, 'Proposta enviada', `O emissário leva sua proposta à ${house.name}. Resposta em ${neg.replyDay - g.day} dias.`, house.seatProvinceId)
  return g
}
export function processNegotiations(g: GameState) {
  for (const n of g.campaign.negotiations) {
    if (n.status !== 'aguardando' || g.day < n.replyDay) continue
    const house = g.world.houses.find(h => h.id === n.houseId)!, contact = g.campaign.contacts.find(c => c.houseId === n.houseId)!, ruler = rulerOf(g, n.houseId)
    const list = offersFor(g, n.houseId)
    if (n.lastScore >= n.needed) {
      n.status = 'aceita'; n.log.push(`${ruler.name} aceitou.`)
      if (n.offers.includes('comércio') || n.kind === 'comércio') contact.trade = true
      if (n.offers.includes('perdão')) g.campaign.bonds = g.campaign.bonds.filter(b => !(b.houseId === n.houseId && b.kind === 'dívida'))
      if (n.offers.includes('casamento')) g.campaign.bonds.push({ houseId: n.houseId, kind: 'casamento', day: g.day, text: 'Promessa de casamento selada no tratado.' })
      contact.relation = clamp(contact.relation + 8)
      if (n.kind === 'aliança') contact.alliance = true
      if (n.kind === 'vassalagem') g.campaign.decisions.push({ id: nextId(g, 'decision'), kind: 'juramento', day: g.day, provinceId: house.seatProvinceId, houseId: n.houseId, resolved: false, choice: 'diplomacia' })
      notify(g, `${NEGOTIATION_LABEL[n.kind]} aceito`, `${ruler.name} ${house.name.replace('Casa ', '')} aceitou sua proposta.${n.kind === 'vassalagem' ? ' Resta definir os termos do juramento.' : ''}`, house.seatProvinceId, true)
    } else {
      // Refused: the escrow comes back and the house names what is missing.
      const back = n.offers.reduce((c, k) => { const o = list.find(x => x.kind === k); return { gold: c.gold + (o?.cost.gold ?? 0), silver: c.silver + (o?.cost.silver ?? 0) } }, { gold: 0, silver: 0 })
      const h = playerHouse(g); h.gold += back.gold; h.stock.silver += back.silver
      const gap = n.needed - n.lastScore
      const hint = list.filter(o => o.available && !n.offers.includes(o.kind)).sort((a, b) => b.value - a.value)[0]
      n.round++
      if (n.round > NG.maxRounds) { n.status = 'recusada'; contact.relation = clamp(contact.relation - 5); n.log.push('As conversas terminaram sem acordo.'); notify(g, 'Negociação encerrada', `${house.name} recusou pela última vez. Tente de novo em ${NG.failCooldown} dias.`, house.seatProvinceId, true) }
      else { n.status = 'aberta'; n.log.push(`Recusado: faltaram ${gap} pontos.${hint ? ` Eles sugerem: ${hint.label.toLowerCase()}.` : ''}`); notify(g, 'Contraproposta', `${ruler.name} recusou, mas a porta segue aberta.${hint ? ` ${hint.why}` : ''} Rodada ${n.round} de ${NG.maxRounds}.`, house.seatProvinceId, true) }
    }
  }
}
