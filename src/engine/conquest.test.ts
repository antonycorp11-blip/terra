import { describe, expect, it } from 'vitest'
import { createGame } from './world'
import { advanceGame } from './simulation'
import { attack, attackQuote, defenders, moveTroops, recruit, levyCap } from './military'
import { openDecisions, resolveDecision } from './decisions'
import { economicBalance } from './economy'
import { influenceAction, influenceOf, oathReady, proposeOath } from './influence'
import { offersFor, propose, scoreOffer, startNegotiation, negotiationBlocked } from './negotiation'
import { diplomaticAction } from './diplomacy'
import { ascension, liegeHouse } from './politics'
import { startTravel, buyResource, purchaseQuote, sellers } from './travel'
import { knowledge } from './knowledge'
import { migrateGame } from './persistence'
import { isVassal, inPlayerRealm, controlled } from './stateUtils'
import { BALANCE } from './balance'
import type { GameState } from './types'

const base = createGame()
const fresh = (): GameState => structuredClone(base)
const roundTrip = (g: GameState): GameState => migrateGame(JSON.parse(JSON.stringify(g)))
const player = (g: GameState) => g.world.houses.find(h => h.id === g.playerHouseId)!
const seat = (g: GameState) => g.world.provinces.find(p => p.id === player(g).seatProvinceId)!
const house = (g: GameState, name: string) => g.world.houses.find(h => h.name === name)!
const seatOf = (g: GameState, name: string) => g.world.provinces.find(p => p.id === house(g, name).seatProvinceId)!
const rich = (g: GameState) => { const h = player(g); h.gold = 5000; h.prestige = 200; h.stock = { food: 9000, wood: 2000, stone: 500, iron: 2000, salt: 300, silver: 400 }; return g }
/** Runs time until a decision of `kind` appears (or the limit is hit). */
function until(g: GameState, kind: string, limit = 120) {
  for (let i = 0; i < limit && !openDecisions(g).some(d => d.kind === kind); i++) g = advanceGame(g, 1)
  return g
}

describe('conquista militar', () => {
  it('recrutar custa ouro, renome e ferro, e respeita a população', () => {
    const g = fresh(), p = seat(g)
    const r = recruit(g, p.id)
    expect(r.campaign.garrisons[p.id]).toBe(325 + 50)
    expect(player(r).gold).toBe(700 - BALANCE.military.recruitGold)
    expect(player(r).prestige).toBe(32 - BALANCE.military.recruitRenown)
    expect(player(r).stock.iron).toBe(180 - BALANCE.military.recruitIron)
    expect(levyCap(r, p)).toBe(490)
    let full = rich(fresh())
    while ((full.campaign.garrisons[p.id] ?? 0) + 50 <= levyCap(r, p)) full = recruit(full, p.id)
    expect(() => recruit(full, p.id)).toThrow('sustenta no máximo')
  })
  it('marcha, cerca, pede a escolha da tática, vence e transforma a casa em vassala', () => {
    let g = rich(fresh())
    const target = seatOf(g, 'Casa Ardesh')
    g.campaign.garrisons[seat(g).id] = 1600
    const q = attackQuote(g, seat(g).id, target.id)
    expect(q.justified).toBe(true) // Ardesh's insult is a real grievance
    expect(q.route.length).toBeGreaterThan(1)
    g = attack(g, seat(g).id, target.id, 1500)
    expect(g.campaign.armies).toHaveLength(1)
    expect(g.campaign.garrisons[seat(g).id]).toBe(100)
    g = until(g, 'assalto')
    const decision = openDecisions(g).find(d => d.kind === 'assalto')!
    expect(decision.provinceId).toBe(target.id)
    expect(g.day).toBeGreaterThanOrEqual(q.days + q.siegeDays)
    // Starving the garrison buys time and weakens it; the assault follows.
    g = resolveDecision(g, decision.id, 'cerco')
    g = until(g, 'assalto')
    const second = openDecisions(g).find(d => d.kind === 'assalto')!
    g = resolveDecision(g, second.id, 'assalto')
    const battle = g.campaign.battles.at(-1)!
    expect(battle.victory).toBe(true)
    expect(battle.phases).toHaveLength(3)
    expect(battle.attackerLeft).toBeLessThan(battle.attackerStart)
    const submit = openDecisions(g).find(d => d.kind === 'submissão')!
    const threat = g.campaign.politics.liegeThreat
    g = resolveDecision(g, submit.id, 'firmes')
    const ardesh = house(g, 'Casa Ardesh')
    expect(isVassal(g, ardesh.id)).toBe(true)
    // The land passes to the player's rule: all of its output, recruitment and decisions.
    const taken = g.world.provinces.find(p => p.id === target.id)!
    expect(taken.governingHouseId).toBe(g.playerHouseId)
    expect(controlled(g).some(p => p.id === target.id)).toBe(true)
    expect(inPlayerRealm(g, target.id)).toBe(true)
    expect(g.campaign.garrisons[target.id]).toBeGreaterThan(0)
    expect(g.campaign.admin[target.id].governor).toBeNull() // firm terms strip the old lord
    expect(economicBalance(g).revenue).toBeGreaterThan(economicBalance(rich(fresh())).revenue)
    expect(g.campaign.politics.liegeThreat).toBeGreaterThan(threat)
    expect(recruit(g, target.id).campaign.garrisons[target.id]).toBe(g.campaign.garrisons[target.id] + BALANCE.military.recruitBatch)
    expect(roundTrip(g)).toEqual(g)
  })
  it('atacar sem justificativa custa renome e assusta o grão-lorde', () => {
    const g = rich(fresh())
    const target = seatOf(g, 'Casa Vasterre')
    g.campaign.garrisons[seat(g).id] = 600
    expect(attackQuote(g, seat(g).id, target.id).justified).toBe(false)
    const before = player(g).prestige, threat = g.campaign.politics.liegeThreat
    const after = attack(g, seat(g).id, target.id, 400)
    expect(player(after).prestige).toBe(before - BALANCE.military.unjustRenown)
    expect(after.campaign.politics.liegeThreat).toBe(threat + BALANCE.military.unjustThreat)
  })
  it('desloca tropas apenas dentro do próprio território', () => {
    const g = fresh(), foreign = seatOf(g, 'Casa Quellan')
    expect(() => moveTroops(g, seat(g).id, foreign.id, 100)).toThrow('dentro do seu território')
    expect(defenders(g, foreign)).toBeGreaterThan(0)
  })
})

describe('conquista diplomática', () => {
  it('evolui de comércio a aliança e a vassalagem por tratado, com contrapropostas', () => {
    let g = rich(fresh())
    const id = house(g, 'Casa Vasterre').id
    g = startNegotiation(g, id, 'comércio')
    let neg = g.campaign.negotiations.at(-1)!
    // An empty proposal is refused; the escrow comes back and the house names what it wants.
    g = propose(g, neg.id, [])
    g = advanceGame(g, g.campaign.negotiations.at(-1)!.replyDay - g.day)
    neg = g.campaign.negotiations.at(-1)!
    expect(neg.status).toBe('aberta'); expect(neg.round).toBe(2)
    const gold = player(g).gold
    g = propose(g, neg.id, ['comércio', 'ouro'])
    expect(player(g).gold).toBe(gold - 150)
    g = advanceGame(g, g.campaign.negotiations.at(-1)!.replyDay - g.day)
    expect(g.campaign.negotiations.at(-1)!.status).toBe('aceita')
    expect(g.campaign.contacts.find(c => c.houseId === id)!.trade).toBe(true)
    g = startNegotiation(g, id, 'aliança')
    g = propose(g, g.campaign.negotiations.at(-1)!.id, ['ouro', 'prata', 'casamento'])
    g = advanceGame(g, g.campaign.negotiations.at(-1)!.replyDay - g.day)
    expect(g.campaign.contacts.find(c => c.houseId === id)!.alliance).toBe(true)
    // Vassalage by treaty needs real strength: 1.5× their defenders under arms.
    g.campaign.garrisons[seat(g).id] = 100
    expect(negotiationBlocked(g, id, 'vassalagem')).toContain('homens em armas')
    g.campaign.garrisons[seat(g).id] = 450
    expect(offersFor(g, id).find(o => o.kind === 'proteção')!.value).toBe(30) // Vasterre fears Ardesh
    // A treaty of vassalage needs months of standing at court: banquets, patronage and gifts.
    g = influenceAction(influenceAction(g, id, 'banquete'), id, 'patrocínio')
    g = startNegotiation(g, id, 'vassalagem')
    expect(scoreOffer(g, id, 'vassalagem', ['proteção', 'ouro', 'prata', 'casamento'])).toBeLessThan(BALANCE.negotiation.thresholds.vassalagem)
    g = advanceGame(g, 31); g = diplomaticAction(influenceAction(g, id, 'banquete'), id, 'gift')
    g = advanceGame(g, 16); g = influenceAction(g, id, 'patrocínio')
    g = propose(g, g.campaign.negotiations.at(-1)!.id, ['proteção', 'ouro', 'prata', 'casamento'])
    g = advanceGame(g, g.campaign.negotiations.at(-1)!.replyDay - g.day)
    const oath = openDecisions(g).find(d => d.kind === 'juramento')!
    expect(oath).toBeDefined()
    g = resolveDecision(g, oath.id, 'generosos')
    expect(isVassal(g, id)).toBe(true)
    expect(g.campaign.vassals.find(v => v.houseId === id)!.path).toBe('diplomacia')
    expect(g.world.provinces.find(p => p.id === house(g, 'Casa Vasterre').seatProvinceId)!.governingHouseId).toBe(g.playerHouseId)
  })
})

describe('conquista por influência', () => {
  it('exige influência e um laço antes da cerimônia de juramento', () => {
    let g = rich(fresh())
    const id = house(g, 'Casa Quellan').id
    expect(influenceOf(g, id)).toBe(41)
    expect(oathReady(g, id)).toBe(false)
    g = influenceAction(g, id, 'banquete')
    expect(influenceOf(g, id)).toBeGreaterThan(41)
    expect(() => influenceAction(g, id, 'banquete')).toThrow('Espere')
    g = influenceAction(g, id, 'dívida')
    expect(g.campaign.bonds.some(b => b.houseId === id && b.kind === 'dívida')).toBe(true)
    g = influenceAction(g, id, 'patrocínio')
    // Each step is worth less as the house nears the oath: one more month of courting.
    expect(oathReady(g, id)).toBe(false)
    g = influenceAction(advanceGame(g, 31), id, 'banquete')
    expect(oathReady(g, id)).toBe(true)
    g = proposeOath(g, id)
    g = resolveDecision(g, openDecisions(g).find(d => d.kind === 'juramento')!.id, 'generosos')
    expect(isVassal(g, id)).toBe(true)
    expect(g.campaign.vassals[0].path).toBe('influência')
  })
})

describe('o mundo reage', () => {
  it('o grão-lorde convoca, adverte, dá ultimato e marcha; a muralha decide a defesa', () => {
    let g = fresh()
    g = until(g, 'convocação', 40)
    const levy = openDecisions(g).find(d => d.kind === 'convocação')!
    expect(levy.houseId).toBe(liegeHouse(g).id)
    g = resolveDecision(g, levy.id, 'enviar')
    expect(g.campaign.garrisons[seat(g).id]).toBe(225)
    expect(g.campaign.armies.some(a => a.order === 'mover')).toBe(true)
    g.campaign.politics.liegeThreat = 65
    g = advanceGame(g, 1)
    expect(g.campaign.politics.stage).toBe('advertido')
    g = advanceGame(g, 1)
    const ultimatum = openDecisions(g).find(d => d.kind === 'ultimato')!
    g = resolveDecision(g, ultimatum.id, 'recusar')
    expect(g.campaign.politics.stage).toBe('guerra')
    const enemy = g.campaign.armies.find(a => a.houseId === liegeHouse(g).id)!
    expect(enemy.order).toBe('atacar')
    for (let i = 0; i < 80 && g.campaign.armies.some(a => a.houseId !== g.playerHouseId); i++) g = advanceGame(g, 1)
    const battle = g.campaign.battles.at(-1)!
    expect(battle.attackerHouseId).toBe(liegeHouse(g).id)
    expect(battle.defenderHouseId).toBe(g.playerHouseId)
  })
  it('a coroa oferece proteção quando o grão-lorde enfraquece', () => {
    let g = rich(fresh())
    g.campaign.politics.kingFavor = 35; g.campaign.politics.liegeThreat = 35
    g = advanceGame(g, 1)
    const offer = openDecisions(g).find(d => d.kind === 'rei')!
    expect(offer).toBeDefined()
    g = resolveDecision(g, offer.id, 'aceitar')
    expect(g.campaign.politics.kingPact).toBe(true)
    // With the crown's protection, the grand lord's war is stopped.
    g.campaign.politics.liegeThreat = 90; g.campaign.politics.stage = 'ultimato'
    g = advanceGame(g, 1)
    expect(g.campaign.armies.some(a => a.houseId !== g.playerHouseId)).toBe(false)
  })
  it('quatro casas e o reconhecimento da coroa tornam o jogador grão-lorde', () => {
    const g = rich(fresh())
    expect(ascension(g).support).toBe(1)
    g.campaign.politics.kingPact = true
    let next = g
    for (const name of ['Casa Quellan', 'Casa Vasterre', 'Casa Morvane']) {
      const id = house(next, name).id
      next = structuredClone(next); next.campaign.influence[id] = 70; next.campaign.contacts.find(c => c.houseId === id)!.relation = 30; next.campaign.bonds.push({ houseId: id, kind: 'segredo', day: 0, text: 'teste' })
      next = proposeOath(next, id)
      next = resolveDecision(next, openDecisions(next).find(d => d.kind === 'juramento')!.id, 'generosos')
    }
    next = advanceGame(next, 1)
    expect(player(next).rank).toBe('grão-senhorial')
    expect(next.world.fiefs.find(f => f.id === seat(next).fiefId)!.grandHouseId).toBe(next.playerHouseId)
    expect(isVassal(next, house(next, 'Casa Hadrin').id)).toBe(true)
  })
})

describe('viagem do lorde e comércio de recursos', () => {
  it('viajar revela a terra, estabelece contato e traz Irian de volta', () => {
    let g = fresh()
    const target = g.world.provinces.find(p => knowledge(g, p.id) === 1 && p.landmass === 0)!
    g = startTravel(g, target.id)
    expect(() => startTravel(g, target.id)).toThrow('já está viajando')
    const t = g.campaign.travel!
    g = advanceGame(g, t.arriveDay - g.day)
    expect(knowledge(g, target.id)).toBe(3)
    expect(g.campaign.contacts.some(c => c.houseId === target.governingHouseId && c.establishedDay !== null)).toBe(true)
    g = advanceGame(g, g.campaign.travel!.returnDay - g.day)
    expect(g.campaign.travel).toBeNull()
  })
  it('comprar recursos depende de quem produz e da relação', () => {
    const g = fresh(), ardesh = house(g, 'Casa Ardesh')
    expect(sellers(g, 'pedra').some(h => h.id === ardesh.id)).toBe(true)
    expect(purchaseQuote(g, ardesh.id, 'pedra').refuses).toContain('recusam')
    const vasterre = house(g, 'Casa Vasterre')
    const bought = buyResource(g, vasterre.id, 'prata')
    expect(player(bought).stock.silver).toBe(20 + 50)
    expect(player(bought).gold).toBe(700 - purchaseQuote(g, vasterre.id, 'prata').price)
  })
  it('no inverno, sem sal, parte dos grãos estraga', () => {
    const g = fresh(); player(g).stock.salt = 0
    const winter = advanceGame(g, 270)
    expect(winter.campaign.notifications.some(n => n.title === 'Inverno sem sal')).toBe(true)
  })
})
