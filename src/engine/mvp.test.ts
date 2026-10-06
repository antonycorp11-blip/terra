import { describe, expect, it } from 'vitest'
import { createGame } from './world'
import { advanceGame } from './simulation'
import { customizeHouse, houseNameError } from './houseCustomization'
import { COLORS, DIVISIONS, SYMBOLS, SYMBOL_PATHS } from './heraldry'
import { KNOWLEDGE, knowledge } from './knowledge'
import { canExplore, expeditionQuote, sendExpedition } from './exploration'
import { economicBalance } from './economy'
import { startInvestment } from './investments'
import { diplomaticAction, sendEmissary } from './diplomacy'
import { hireSpy, sendSpy, spyQuote } from './espionage'
import { converse, dialogueWait } from './dialogue'
import { canConverse, rulerOf } from './characters'
import { migrateGame } from './persistence'
import { BALANCE } from './balance'
import { lordLocation, playerParty } from './party'
import type { GameState } from './types'

const base = createGame()
const fresh = (): GameState => structuredClone(base)
const roundTrip = (game: GameState): GameState => migrateGame(JSON.parse(JSON.stringify(game)))
const player = (g: GameState) => g.world.houses.find(h => h.id === g.playerHouseId)!
const seat = (g: GameState) => g.world.provinces.find(p => p.id === player(g).seatProvinceId)!
const frontier = (g: GameState) => g.world.provinces.filter(p => canExplore(g, p.id))
/** Explores the first frontier province and returns the game plus that province id. */
function exploreOne(g: GameState, index = 0) {
  const target = frontier(g)[index].id
  const sent = sendExpedition(g, target)
  return { game:advanceGame(sent, expeditionQuote(g, target).days), target }
}
function contactOne(g: GameState, index = 0) {
  const { game, target } = exploreOne(g, index)
  const sent = sendEmissary(game, target)
  const done = advanceGame(sent, sent.campaign.diplomacy.at(-1)!.endDay - sent.day)
  const houseId = done.world.provinces.find(p => p.id === target)!.governingHouseId
  // Conversations happen in person: the retinue stands where the lord is.
  playerParty(done).provinceId = lordLocation(done, houseId)!
  return { game:done, target, houseId }
}

describe('criação da casa do jogador', () => {
  it('aplica nome, brasão e cores mantendo identificadores estáveis', () => {
    const heraldry = { division:3, symbol:1, primary:COLORS[2], secondary:COLORS[4] }
    const g = customizeHouse(fresh(), { name:'  Casa   Ravencor ', heraldry })
    const house = player(g)
    expect(house.id).toBe(base.playerHouseId)
    expect(house.name).toBe('Casa Ravencor')
    expect(house.seatProvinceId).toBe(seat(base).id)
    expect(house.color).toBe(COLORS[2])
    expect(g.campaign.customization).toEqual({ name:'Ravencor', heraldry })
    expect(g.world.history.some(r => r.description.includes('Casa Ravencor'))).toBe(true)
    expect(g.world.history.some(r => r.description.includes('Casa Serraval'))).toBe(false)
    const loaded = roundTrip(g)
    expect(loaded.campaign.customization).toEqual(g.campaign.customization)
    expect(player(loaded).name).toBe('Casa Ravencor')
    // Systems keep working after renaming because nothing searches houses by name.
    expect(() => sendExpedition(loaded, frontier(loaded)[0].id)).not.toThrow()
  })
  it('oferece 8 divisões, 16 símbolos e 12 cores', () => {
    expect(DIVISIONS).toHaveLength(8); expect(SYMBOLS).toHaveLength(16); expect(SYMBOL_PATHS).toHaveLength(16); expect(COLORS).toHaveLength(12)
  })
  it('rejeita nomes vazios, longos, duplicados ou com caracteres inadequados', () => {
    const g = fresh()
    expect(houseNameError(g, '')).not.toBeNull()
    expect(houseNameError(g, 'A'.repeat(30))).not.toBeNull()
    expect(houseNameError(g, 'Hadrin')).toBe('Esta casa já existe em Varedor.')
    expect(houseNameError(g, 'Casa <b>')).not.toBeNull()
    expect(houseNameError(g, 'Serraval')).toBeNull()
    expect(houseNameError(g, "D'Arvel")).toBeNull()
    expect(() => customizeHouse(g, { name:'Draven', heraldry:{ division:0, symbol:0, primary:COLORS[1], secondary:COLORS[1] } })).toThrow()
    expect(() => customizeHouse(advanceGame(g, 1), { name:'Draven', heraldry:{ division:0, symbol:0, primary:COLORS[1], secondary:COLORS[2] } })).toThrow()
  })
})

describe('mapa desconhecido e exploração', () => {
  it('começa com Pontevela conhecida, vizinhas avistadas e o restante encoberto', () => {
    const g = fresh()
    expect(knowledge(g, seat(g).id)).toBe(KNOWLEDGE.indexOf('investigada'))
    // The player's own fief is known; its outer borders are sighted; the rest of Varedor is hidden.
    const fief = g.world.provinces.filter(p => p.fiefId === seat(g).fiefId)
    for (const p of fief) expect(knowledge(g, p.id)).toBeGreaterThanOrEqual(2)
    const border = new Set(fief.flatMap(p => p.neighbors).filter(id => !fief.some(f => f.id === id)))
    for (const id of border) expect(knowledge(g, id)).toBe(1)
    const unknown = g.world.provinces.filter(p => knowledge(g, p.id) === 0)
    expect(unknown).toHaveLength(252 - fief.length - border.size)
  })
  it('cobra custos, respeita duração, limite e alcance, e revela a província', () => {
    const g = fresh()
    const distant = g.world.provinces.find(p => knowledge(g, p.id) === 0)!
    expect(() => sendExpedition(g, distant.id)).toThrow()
    const [a, b, c] = frontier(g)
    const quote = expeditionQuote(g, a.id)
    expect(quote.gold).toBe(60); expect(quote.food).toBe(80)
    expect(quote.days).toBe(BALANCE.expedition.days + Math.max(0, quote.route.length - 2) * 2 + BALANCE.terrainDays[a.terrain])
    let s = sendExpedition(g, a.id)
    expect(player(s).gold).toBe(640); expect(player(s).stock.food).toBe(1160)
    s = sendExpedition(s, b.id)
    expect(() => sendExpedition(s, c.id)).toThrow('No máximo duas expedições simultâneas.')
    const before = advanceGame(s, quote.days - 1)
    expect(knowledge(before, a.id)).toBe(1)
    const after = advanceGame(s, quote.days)
    expect(knowledge(after, a.id)).toBe(2)
    const expedition = after.campaign.expeditions.find(e => e.provinceId === a.id)!
    expect(expedition.completed).toBe(true)
    // Findings mention real settlements of that province.
    const names = after.world.settlements.filter(x => x.provinceId === a.id).map(x => x.name)
    expect(names.some(name => expedition.report!.includes(name))).toBe(true)
    expect(expedition.findings).toContain('personagem')
    // Newly explored land sights new frontiers and persists through save/load.
    expect(a.neighbors.filter(id => knowledge(after, id) >= 1)).toHaveLength(a.neighbors.length)
    expect(knowledge(roundTrip(after), a.id)).toBe(2)
    expect(after.campaign.notifications.some(n => n.title === 'Expedição concluída' && n.important)).toBe(true)
  })
})

describe('economia e investimentos', () => {
  it('produz o saldo mensal configurado', () => {
    const g = fresh()
    const b = economicBalance(g)
    expect([b.gold, b.food, b.wood, b.iron]).toEqual([80, 90, 45, 15])
    const month = advanceGame(g, 30)
    expect(player(month).gold).toBe(780); expect(player(month).stock.food).toBe(1330)
    expect(player(month).stock.wood).toBe(465); expect(player(month).stock.iron).toBe(195)
    expect(month.campaign.ledger).toHaveLength(1)
  })
  it('desconta recursos, leva tempo e concede benefícios permanentes uma vez', () => {
    let g = startInvestment(fresh(), 'market')
    expect(player(g).gold).toBe(480); expect(player(g).stock.wood).toBe(320)
    expect(() => startInvestment(g, 'market')).toThrow()
    expect(economicBalance(advanceGame(g, 24)).revenue).toBe(120)
    g = advanceGame(g, 25)
    expect(g.campaign.investments[0].completed).toBe(true)
    expect(economicBalance(g).revenue).toBe(165)
    g = startInvestment(startInvestment(g, 'farms'), 'mine')
    g = advanceGame(g, 30)
    const b = economicBalance(roundTrip(g))
    expect(b.foodProduction).toBe(300); expect(b.iron).toBe(45)
    expect(g.world.history.some(r => r.description.includes('Obra concluída'))).toBe(true)
    const broke = structuredClone(base); broke.world.houses.find(h => h.id === broke.playerHouseId)!.gold = 10
    expect(() => startInvestment(broke, 'farms')).toThrow('Faltam')
  })
})

describe('diplomacia', () => {
  it('exige exploração, cobra o emissário e estabelece contato com razões explicadas', () => {
    const g = fresh()
    expect(() => sendEmissary(g, frontier(g)[0].id)).toThrow()
    const { game, houseId } = contactOne(g)
    const contact = game.campaign.contacts.find(c => c.houseId === houseId)!
    expect(contact.establishedDay).not.toBeNull()
    expect(contact.relation).toBeGreaterThanOrEqual(-100); expect(contact.relation).toBeLessThanOrEqual(100)
    expect(contact.reasons.length).toBeGreaterThanOrEqual(5)
    expect(game.campaign.notifications.some(n => n.title === 'Primeiro contato')).toBe(true)
  })
  it('vizinhos têm personalidades diferentes', () => {
    const g = fresh()
    const houses = [...new Set(g.world.provinces.filter(p => p.fiefId === seat(g).fiefId).map(p => p.governingHouseId))].filter(id => id !== g.playerHouseId)
    const rulers = houses.map(id => rulerOf(g, id))
    expect(new Set(rulers.map(r => r.traits.join('/'))).size).toBeGreaterThan(1)
    expect(new Set(rulers.map(r => r.name)).size).toBe(rulers.length)
  })
  it('presentes, aproximação e comércio funcionam com custos e intervalos', () => {
    let { game: g, houseId } = contactOne(fresh())
    const relation = () => g.campaign.contacts.find(c => c.houseId === houseId)!.relation
    const start = relation(), gold = player(g).gold
    g = diplomaticAction(g, houseId, 'gift')
    expect(relation()).toBe(Math.min(100, start + 10)); expect(player(g).gold).toBe(gold - 50)
    expect(() => diplomaticAction(g, houseId, 'gift')).toThrow()
    g = diplomaticAction(g, houseId, 'rapprochement')
    const afterGift = relation()
    g = advanceGame(g, BALANCE.diplomacy.rapprochementDays)
    expect(relation()).toBeGreaterThan(afterGift)
    if (relation() >= 0) {
      g = diplomaticAction(g, houseId, 'trade')
      expect(economicBalance(g).trade).toBe(BALANCE.diplomacy.tradeIncome)
    }
    // A hostile house refuses trade.
    const hostile = structuredClone(g); hostile.campaign.contacts.find(c => c.houseId === houseId)!.relation = -40; hostile.campaign.contacts.find(c => c.houseId === houseId)!.trade = false
    expect(() => diplomaticAction(hostile, houseId, 'trade')).toThrow()
  })
})

describe('espionagem', () => {
  it('contrata com custo, limite e manutenção', () => {
    let g = fresh()
    g = hireSpy(hireSpy(hireSpy(g, 'agent-0'), 'agent-1'), 'agent-2')
    expect(player(g).gold).toBe(700 - 270)
    expect(() => hireSpy(g, 'agent-3')).toThrow('Limite de três agentes.')
    expect(economicBalance(g).upkeep).toBe(18)
  })
  it('missões geram relatórios datados com fonte, confiança e validade, incluindo falhas', () => {
    let g = fresh()
    const explored = exploreOne(exploreOne(g).game, 0)
    g = hireSpy(explored.game, 'agent-0')
    const targets = g.world.provinces.filter(p => knowledge(g, p.id) === 2 && spyQuote(g, p.id).route.length > 0)
    expect(() => sendSpy(g, 'agent-0', g.world.provinces.find(p => knowledge(g, p.id) === 0)!.id)).toThrow()
    const outcomes = new Set<string>()
    // Repeat missions deterministically until both success-like and failure-like outcomes appear.
    for (let i = 0; i < 12 && outcomes.size < 2; i++) {
      g = sendSpy(g, 'agent-0', targets[i % targets.length].id)
      const mission = g.campaign.spyMissions.at(-1)!
      g = advanceGame(g, mission.endDay - g.day)
      outcomes.add(g.campaign.spyMissions.at(-1)!.outcome!)
    }
    expect(outcomes.size).toBeGreaterThanOrEqual(2)
    for (const report of g.campaign.reports) {
      expect(report.source).toBe('Nara')
      expect(['alta', 'média', 'baixa']).toContain(report.confidence)
      expect(report.expiresDay).toBe(report.day + BALANCE.spy.reportValidity)
      expect(report.text.length).toBeGreaterThan(10)
    }
    expect(roundTrip(g).campaign.reports).toEqual(g.campaign.reports)
  })
})

describe('personagens e conversas', () => {
  it('exigem contato, alteram relações, guardam memória e limitam repetições', () => {
    const g0 = fresh()
    const foreign = rulerOf(g0, g0.world.provinces.find(p => p.id === frontier(g0)[0].id)!.governingHouseId)
    expect(canConverse(g0, foreign)).toBe(false)
    expect(() => converse(g0, foreign.id, 'greet')).toThrow()
    let { game: g, houseId } = contactOne(g0)
    const ruler = rulerOf(g, houseId)
    g = converse(g, ruler.id, 'compliment')
    const after = rulerOf(g, houseId)
    expect(after.relationship.friendship).toBeGreaterThan(0)
    expect(after.memory.at(-1)!.text).toContain('Elogiar')
    expect(dialogueWait(g, ruler.id, 'compliment')).toBe(BALANCE.dialogue.cooldown)
    expect(() => converse(g, ruler.id, 'compliment')).toThrow()
    g = converse(g, ruler.id, 'greet')
    expect(g.campaign.conversations.at(-1)!.response).toContain('Lembro-me')
  })
  it('responde de acordo com a personalidade', () => {
    const g = fresh()
    const court = g.campaign.characters.filter(c => c.houseId === g.playerHouseId && c.id.startsWith('court-'))
    const warm = court.find(c => c.traits[0] === 'acolhedor')!, cold = court.find(c => c.traits[0] === 'desconfiado')!
    const a = converse(g, warm.id, 'compliment'), b = converse(g, cold.id, 'compliment')
    expect(a.campaign.conversations.at(-1)!.response).not.toBe(b.campaign.conversations.at(-1)!.response)
    expect(a.campaign.characters.find(c => c.id === warm.id)!.relationship.friendship - warm.relationship.friendship).toBe(5)
    expect(b.campaign.characters.find(c => c.id === cold.id)!.relationship.friendship - cold.relationship.friendship).toBe(1)
  })
})

describe('persistência e determinismo', () => {
  it('recupera expedições, obras e missões em andamento com o mesmo resultado', () => {
    let g = hireSpy(startInvestment(fresh(), 'farms'), 'agent-1')
    g = sendExpedition(g, frontier(g)[0].id)
    g = sendSpy(g, 'agent-1', seat(g).id)
    g = advanceGame(g, 3)
    const loaded = roundTrip(g)
    expect(loaded.campaign.expeditions).toEqual(g.campaign.expeditions)
    expect(loaded.campaign.investments).toEqual(g.campaign.investments)
    expect(loaded.campaign.spyMissions).toEqual(g.campaign.spyMissions)
    expect(advanceGame(loaded, 40)).toEqual(advanceGame(g, 40))
  })
  it('avançar vários dias de uma vez equivale a avançar dia a dia', () => {
    let g = sendExpedition(fresh(), frontier(base)[0].id)
    const once = advanceGame(g, 45)
    for (let i = 0; i < 45; i++) g = advanceGame(g, 1)
    expect(g).toEqual(once)
  })
  it('migra salvamentos da versão 1 sem campanha', () => {
    const legacy = JSON.parse(JSON.stringify({ ...base, version:1 })) as Record<string, unknown>
    delete legacy.campaign
    const migrated = migrateGame(legacy as never)
    expect(migrated.version).toBe(3)
    expect(migrated.campaign.customization.name).toBe('Serraval')
    expect(knowledge(migrated, seat(migrated).id)).toBe(3)
  })
})

describe('campanha simulada de 180 dias', () => {
  it('mantém recursos, projetos, relações e ações programadas estáveis', () => {
    let g = customizeHouse(fresh(), { name:'Santiago', heraldry:{ division:1, symbol:6, primary:COLORS[1], secondary:COLORS[4] } })
    g = startInvestment(g, 'farms')
    const first = contactOne(g); g = first.game
    g = diplomaticAction(g, first.houseId, 'gift')
    g = hireSpy(g, 'agent-2')
    g = sendSpy(g, 'agent-2', first.target)
    g = converse(g, rulerOf(g, first.houseId).id, 'politics')
    for (let day = g.day; day < 180; day += 10) {
      g = advanceGame(g, 10)
      // A simple strategy: fund projects first, explore with the surplus.
      if (!g.campaign.investments.some(i => i.kind === 'market') && player(g).gold >= 260) g = startInvestment(g, 'market')
      if (!g.campaign.investments.some(i => i.kind === 'mine') && player(g).gold >= 220 && player(g).stock.wood >= 80) g = startInvestment(g, 'mine')
      if (frontier(g).length && g.campaign.expeditions.filter(e => !e.completed).length < 2 && player(g).gold > 320) g = sendExpedition(g, frontier(g)[0].id)
    }
    g = advanceGame(g, Math.max(0, 180 - g.day))
    expect(g.day).toBeGreaterThanOrEqual(180)
    const h = player(g)
    for (const value of [h.gold, h.stock.food, h.stock.wood, h.stock.iron]) { expect(Number.isFinite(value)).toBe(true); expect(value).toBeGreaterThanOrEqual(0) }
    expect(g.campaign.ledger.length).toBe(6)
    expect(g.campaign.investments.filter(i => i.completed).length).toBeGreaterThanOrEqual(2)
    for (const action of [...g.campaign.expeditions, ...g.campaign.investments, ...g.campaign.diplomacy, ...g.campaign.spyMissions]) expect(action.completed || action.endDay > g.day).toBe(true)
    for (const c of g.campaign.contacts) { expect(c.relation).toBeGreaterThanOrEqual(-100); expect(c.relation).toBeLessThanOrEqual(100) }
    expect(g.world.provinces.filter(p => knowledge(g, p.id) >= 2).length).toBeGreaterThanOrEqual(4)
    expect(seat(g).loyalty).toBeGreaterThan(50)
    expect(roundTrip(g)).toEqual(g)
  })
})
