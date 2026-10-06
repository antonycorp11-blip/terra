import { describe, expect, it } from 'vitest'
import { createGame } from './world'
import { endTurn } from './turns'
import { openDecisions, resolveDecision, choicesFor } from './decisions'
import { attackParty, lordLocation, moveParty, moveToward, partyPath, partyReach, playerParty, processParties, transferMen, withOrder, PLAYER_PARTY } from './party'
import { converse } from './dialogue'
import { rulerOf } from './characters'
import { knowledge } from './knowledge'
import { startInvestment } from './investments'
import { BALANCE } from './balance'
import { migrateGame } from './persistence'
import type { GameState, Id } from './types'

const base = createGame()
const fresh = (): GameState => structuredClone(base)
const player = (g: GameState) => g.world.houses.find(h => h.id === g.playerHouseId)!
const house = (g: GameState, name: string) => g.world.houses.find(h => h.name === name)!
const roundTrip = (g: GameState): GameState => migrateGame(JSON.parse(JSON.stringify(g)))
/** Puts a band of outlaws somewhere for a test. */
function band(g: GameState, provinceId: Id, men: number) {
  g.campaign.parties.push({ id: 'band-test', kind: 'bandidos', houseId: null, leaderId: null, name: 'Os Corvos do Vau', men, provinceId, homeId: provinceId, goal: null, moves: 1, wounded: 0 })
}

describe('turnos e comitiva', () => {
  it('a campanha começa com Irian e a comitiva na sede, e os lordes do reino na estrada', () => {
    const g = fresh(), me = playerParty(g)
    expect(me.men).toBe(BALANCE.party.start)
    expect(me.provinceId).toBe(player(g).seatProvinceId)
    expect(g.campaign.turn).toBe(1); expect(g.campaign.orders).toBe(BALANCE.turn.orders)
    expect(g.campaign.parties.filter(p => p.kind === 'lorde').length).toBeGreaterThan(5)
    expect(roundTrip(g)).toEqual(g)
  })
  it('a comitiva anda até 2 movimentos por turno e descobre a terra por onde passa', () => {
    let g = fresh()
    const reach = partyReach(g)
    expect([...reach.values()].every(c => c >= 1 && c <= BALANCE.party.moves)).toBe(true)
    const far = [...reach].find(([, c]) => c === 2)![0]
    g = moveParty(g, far)
    expect(playerParty(g).provinceId).toBe(far)
    expect(playerParty(g).moves).toBe(0)
    expect(knowledge(g, far)).toBeGreaterThanOrEqual(2)
    expect(() => moveParty(g, [...partyReach(fresh())][0][0])).toThrow('não chega')
  })
  it('viagens longas seguem em vários turnos pelo melhor caminho', () => {
    let g = fresh()
    const target = g.world.provinces.find(p => knowledge(g, p.id) >= 1 && !partyReach(g).has(p.id) && partyPath(g, p.id) && partyPath(g, p.id)!.cost > BALANCE.party.moves)!
    const route = partyPath(g, target.id)!
    g = moveToward(g, target.id)
    expect(route.path).toContain(playerParty(g).provinceId)
    g = endTurn(g); for (const d of openDecisions(g)) g = resolveDecision(g, d.id, choicesFor(g, d).at(-1)!.id)
    expect(playerParty(g).moves).toBe(BALANCE.party.moves)
  })
  it('encerrar o turno passa uma semana, renova ordens e movimentos, e exige decidir antes', () => {
    let g = fresh()
    g = withOrder(g, x => startInvestment(x, 'market'))
    expect(g.campaign.orders).toBe(BALANCE.turn.orders - 1)
    g = moveParty(g, [...partyReach(g)][0][0])
    const day = g.day
    g = endTurn(g)
    expect(g.day).toBe(day + BALANCE.turn.days); expect(g.campaign.turn).toBe(2)
    expect(g.campaign.orders).toBe(BALANCE.turn.orders); expect(playerParty(g).moves).toBe(BALANCE.party.moves)
    g.campaign.orders = 0
    expect(() => withOrder(g, x => x)).toThrow('Sem ordens')
    g.campaign.decisions.push({ id: 'd-x', kind: 'evento', day: g.day, provinceId: null, houseId: null, resolved: false, event: { key: 'mercador', title: 't', text: 't', data: { key: 'salt', amount: 10 }, choices: [{ id: 'recusar', label: 'x', detail: 'x' }] } })
    expect(() => endTurn(g)).toThrow('Resolva')
  })
  it('homens passam da guarnição para a comitiva até o limite das terras', () => {
    let g = fresh()
    g = transferMen(g, 25)
    expect(playerParty(g).men).toBe(BALANCE.party.start + 25)
    expect(() => transferMen(g, 25)).toThrow('comporta')
  })
  it('conversar exige estar com o lorde', () => {
    let g = fresh()
    const quellan = house(g, 'Casa Quellan'), ruler = rulerOf(g, quellan.id)
    expect(() => converse(g, ruler.id, 'greet')).toThrow('comitiva')
    playerParty(g).provinceId = lordLocation(g, quellan.id)!
    g = converse(g, ruler.id, 'greet')
    expect(g.campaign.conversations.at(-1)!.characterId).toBe(ruler.id)
  })
})

describe('bandos, recompensas e batalhas em campo', () => {
  it('alcançar um bando abre o combate; vencer dá saque, renome e paga a recompensa', () => {
    let g = fresh()
    const at = [...partyReach(g)].find(([, c]) => c === 1)![0]
    band(g, at, 20)
    const morvane = house(g, 'Casa Morvane')
    g.campaign.quests.push({ id: 'q-test', houseId: morvane.id, partyId: 'band-test', gold: 80, influence: 10, relation: 10, turn: 1, done: false })
    const gold = player(g).gold, renown = player(g).prestige, influence = g.campaign.influence[morvane.id] ?? 0
    g = moveParty(g, at)
    const fight = openDecisions(g).find(d => d.kind === 'combate')!
    expect(choicesFor(g, fight).map(c => c.id)).toContain('recuar')
    g = resolveDecision(g, fight.id, 'investida')
    const battle = g.campaign.battles.at(-1)!
    expect(battle.victory).toBe(true); expect(battle.bandit?.name).toBe('Os Corvos do Vau')
    expect(g.campaign.parties.some(p => p.id === 'band-test')).toBe(false)
    expect(player(g).gold).toBeGreaterThan(gold + 80)
    expect(player(g).prestige).toBeGreaterThan(renown)
    expect(g.campaign.influence[morvane.id]).toBe(influence + 10)
  })
  it('perder em campo devolve Irian para casa com o que sobrou', () => {
    let g = fresh()
    const at = [...partyReach(g)].find(([, c]) => c === 1)![0]
    band(g, at, 400)
    g = moveParty(g, at)
    g = resolveDecision(g, openDecisions(g)[0].id, 'investida')
    expect(g.campaign.battles.at(-1)!.victory).toBe(false)
    expect(playerParty(g).provinceId).toBe(player(g).seatProvinceId)
    expect(playerParty(g).men).toBeLessThan(BALANCE.party.start)
  })
  it('bandos saqueiam terras mal guardadas', () => {
    const g = fresh(), seat = player(g).seatProvinceId
    g.campaign.garrisons[seat] = 10
    band(g, seat, 60)
    playerParty(g).provinceId = g.world.provinces.find(p => p.id !== seat && partyReach(g).has(p.id))!.id
    const gold = player(g).gold
    processParties(g)
    expect(player(g).gold).toBeLessThan(gold)
    expect(g.campaign.notifications.some(n => /saqueiam/.test(n.title))).toBe(true)
  })
  it('um lorde vencido pode ser capturado; o prisioneiro rende resgate, juramento ou gratidão', () => {
    let g = fresh()
    const quellan = house(g, 'Casa Quellan'), at = quellan.seatProvinceId
    g.campaign.parties = g.campaign.parties.filter(p => p.houseId !== quellan.id)
    g.campaign.parties.push({ id: `party-${quellan.id}`, kind: 'lorde', houseId: quellan.id, leaderId: `ruler-${quellan.id}`, name: 'Escolta', men: 30, provinceId: at, homeId: at, goal: null, moves: 1, wounded: 0 })
    const me = playerParty(g); me.provinceId = at; me.men = 300
    g = attackParty(g, `party-${quellan.id}`)
    expect(g.campaign.notifications.at(-1)!.title).toBe('Ataque sem aviso')
    g = resolveDecision(g, openDecisions(g)[0].id, 'investida')
    expect(g.campaign.battles.at(-1)!.victory).toBe(true)
    const captive = g.campaign.prisoners.find(p => p.houseId === quellan.id)
    if (captive) {
      const ask = openDecisions(g).find(d => d.event?.key === 'prisioneiro')!
      expect(choicesFor(g, ask).map(c => c.id)).toEqual(['juramento', 'resgate', 'libertar', 'manter'])
      // Quellan already leans to Irian (influence 41): the oath under duress holds.
      g = resolveDecision(g, ask.id, 'juramento')
      expect(g.campaign.vassals.some(v => v.houseId === quellan.id)).toBe(true)
      expect(g.world.provinces.find(p => p.id === at)!.governingHouseId).toBe(g.playerHouseId)
    } else expect(g.campaign.parties.find(p => p.houseId === quellan.id)!.wounded).toBeGreaterThan(0)
  })
  it('lordes e bandos se movem a cada turno e o mundo segue determinístico', () => {
    let a = fresh(), b = fresh()
    for (let i = 0; i < 6; i++) {
      a = endTurn(a); for (const d of openDecisions(a)) a = resolveDecision(a, d.id, choicesFor(a, d).at(-1)!.id)
      b = endTurn(b); for (const d of openDecisions(b)) b = resolveDecision(b, d.id, choicesFor(b, d).at(-1)!.id)
    }
    expect(a.campaign.parties).toEqual(b.campaign.parties)
    expect(a.campaign.parties.some(p => p.kind === 'bandidos')).toBe(true)
    expect(a.campaign.parties.find(p => p.id === PLAYER_PARTY)).toBeDefined()
  })
})
