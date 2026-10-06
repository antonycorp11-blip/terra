import { describe, expect, it } from 'vitest'
import { createGame } from './world'
import { advanceGame } from './simulation'
import { openDecisions, resolveDecision, choicesFor } from './decisions'
import { economicBalance, populationGrowth, setTax, setGovernor, governorCandidates, adminOf } from './economy'
import { attack } from './military'
import { startInvestment, workLevel, workQuote } from './investments'
import { levyCap } from './military'
import { liegeHouse } from './politics'
import { rulerOf } from './characters'
import { migrateGame } from './persistence'
import type { GameState } from './types'

const base = createGame()
const fresh = (): GameState => structuredClone(base)
const player = (g: GameState) => g.world.houses.find(h => h.id === g.playerHouseId)!
const seat = (g: GameState) => g.world.provinces.find(p => p.id === player(g).seatProvinceId)!
const house = (g: GameState, name: string) => g.world.houses.find(h => h.name === name)!
const rich = (g: GameState) => { const h = player(g); h.gold = 5000; h.prestige = 200; h.stock = { food: 9000, wood: 2000, stone: 500, iron: 2000, salt: 300, silver: 400 }; return g }
/** Advances day by day, always taking the last (cheapest) choice of any open decision. */
function live(g: GameState, days: number) {
  for (let i = 0; i < days; i++) { g = advanceGame(g, 1); for (const d of openDecisions(g)) g = resolveDecision(g, d.id, choicesFor(g, d).at(-1)!.id) }
  return g
}

describe('mundo vivo', () => {
  it('levanta eventos com escolhas a cada poucos dias, e cada escolha tem consequência', () => {
    let g = fresh()
    for (let i = 0; i < 15 && !openDecisions(g).some(d => d.kind === 'evento'); i++) g = advanceGame(g, 1)
    const ev = openDecisions(g).find(d => d.kind === 'evento')!
    expect(ev.event!.choices.length).toBeGreaterThanOrEqual(2)
    const before = g.campaign.notifications.length
    g = resolveDecision(g, ev.id, ev.event!.choices[0].id)
    expect(g.campaign.decisions.find(d => d.id === ev.id)!.resolved).toBe(true)
    expect(g.campaign.notifications.length).toBeGreaterThan(before)
    g = live(g, 120)
    expect(g.campaign.decisions.filter(d => d.kind === 'evento').length).toBeGreaterThanOrEqual(8)
  })
  it('as casas guerreiam entre si e o velho grão-lorde morre', () => {
    let g = live(fresh(), 41)
    const war = g.campaign.wars[0]
    expect(war.attackerId).toBe(house(g, 'Casa Ardesh').id)
    expect(war.defenderId).toBe(liegeHouse(g).id)
    expect(g.campaign.armies.some(a => a.houseId === war.attackerId)).toBe(true)
    const old = rulerOf(g, liegeHouse(g).id).name
    g = live(g, 130)
    expect(rulerOf(g, liegeHouse(g).id).name).not.toBe(old)
    expect(g.campaign.decisions.some(d => d.event?.key === 'sucessao')).toBe(true)
    expect(g.world.history.some(r => r.description.includes('Paz') || r.description.includes('tomou') || r.description.includes('repeliu'))).toBe(true)
  })
})

describe('governo das províncias', () => {
  it('a população cresce a cada mês e explica por quê', () => {
    let g = fresh()
    const pop = seat(g).population, growth = populationGrowth(g, seat(g))
    expect(growth.factors[0][0]).toBe('crescimento natural')
    expect(growth.perMonth).toBeGreaterThan(0)
    g = advanceGame(g, 30)
    expect(seat(g).population).toBeGreaterThan(pop)
  })
  it('imposto alto rende mais ouro e custa lealdade; o governador segura a província', () => {
    const g = fresh(), p = seat(g)
    const high = setTax(g, p.id, 'alto')
    expect(economicBalance(high).revenue).toBeGreaterThan(economicBalance(g).revenue)
    expect(advanceGame(high, 30).world.provinces.find(x => x.id === p.id)!.loyalty).toBeLessThan(advanceGame(g, 30).world.provinces.find(x => x.id === p.id)!.loyalty)
    const gov = governorCandidates(g)[0]
    const ruled = setGovernor(g, p.id, gov.id)
    expect(adminOf(ruled, p.id).governor).toBe(gov.id)
    expect(governorCandidates(ruled).some(c => c.id === gov.id)).toBe(false)
  })
  it('obras têm três níveis cada vez mais caros, e o quartel aumenta o recrutamento', () => {
    let g = rich(fresh()); const p = seat(g)
    const cap = levyCap(g, p), first = workQuote(g, p.id, 'barracks')
    g = advanceGame(startInvestment(g, 'barracks', p.id), first.days)
    expect(workLevel(g, p.id, 'barracks')).toBe(1)
    expect(levyCap(g, seat(g))).toBeGreaterThan(cap)
    expect(workQuote(g, p.id, 'barracks').gold).toBeGreaterThan(first.gold)
  })
})

describe('conquista mais dura', () => {
  it('o cerco desgasta o sitiante e o suserano manda socorro', () => {
    let g = rich(fresh())
    const target = g.world.provinces.find(p => p.id === house(g, 'Casa Ardesh').seatProvinceId)!
    g.campaign.garrisons[seat(g).id] = 1600
    g = attack(g, seat(g).id, target.id, 1500)
    for (let i = 0; i < 40 && !g.campaign.armies.some(a => a.status === 'sitiando'); i++) g = advanceGame(g, 1)
    const army = g.campaign.armies.find(a => a.status === 'sitiando')!
    expect(g.campaign.armies.some(a => a.order === 'socorrer' && a.targetProvinceId === target.id)).toBe(true)
    const men = army.men
    g = advanceGame(g, 2)
    expect(g.campaign.armies.find(a => a.id === army.id)!.men).toBeLessThan(men)
  })
  it('salvamentos da revisão 2 ganham as novas camadas sem perder nada', () => {
    const g = advanceGame(fresh(), 5) as unknown as { campaign: Record<string, unknown> }
    const old = structuredClone(g); old.campaign.revision = 2
    for (const k of ['admin', 'nextEventDay', 'eventLog', 'wars', 'conditions']) delete old.campaign[k]
    const migrated = migrateGame(old as never)
    expect(migrated.campaign.revision).toBe(3)
    expect(migrated.campaign.wars).toEqual([])
    expect(migrated.day).toBe(5)
    expect(migrated.campaign.notifications.length).toBe((g.campaign.notifications as unknown[]).length)
  })
})
