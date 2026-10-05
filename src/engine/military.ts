import type { GameState, Id, Province } from './types'
import type { Army, BattlePhase, BattleRecord, Tactic } from './mvpTypes'
import { BALANCE } from './balance'
import { hash } from './random'
import { clamp, controlled, editGame, inPlayerRealm, nextId, pay, playerHouse, record, requireRule } from './stateUtils'
import { knowledge, reveal } from './knowledge'
import { notify } from './notifications'
import { menUnderArms } from './economy'
import { rulerOf } from './characters'

const M = BALANCE.military
const byId = (g: GameState, id: Id) => g.world.provinces.find(p => p.id === id)!
export const castleOf = (g: GameState, p: Province) => g.world.settlements.find(s => s.provinceId === p.id && (s.type === 'castelo' || s.type === 'fortaleza'))!
/** Wall level 1–5 from the castle's defence; mountains add one. */
export const wallLevel = (g: GameState, p: Province) => Math.min(5, Math.max(1, Math.round(castleOf(g, p).defense / 15)) + (p.terrain === 'montanha' ? 1 : 0))
export const levyCap = (p: Province) => Math.floor(p.population * M.levyShare / 10) * 10
/** Defenders a province can field: castle garrison plus the house's levy when it is the house seat. */
export function defenders(g: GameState, p: Province): number {
  if (controlled(g).some(c => c.id === p.id)) return g.campaign.garrisons[p.id] ?? 0
  const house = g.world.houses.find(h => h.id === p.governingHouseId)!
  const castle = g.world.settlements.filter(s => s.provinceId === p.id).reduce((s, x) => s + x.garrison, 0)
  const levy = house.seatProvinceId === p.id ? Math.round(house.mobilizable * (house.rank === 'provincial' ? .6 : .35)) : 0
  return castle + levy
}
export const hopDays = (p: Province) => M.hopDays + (M.terrainHop[p.terrain] ?? 0)
/** Land route; every stop before the target must be in the player's realm or already explored. */
export function armyRoute(g: GameState, from: Id, to: Id, mover = false): Id[] {
  const queue = [from], prev = new Map<Id, Id>(), seen = new Set([from])
  for (let i = 0; i < queue.length; i++) {
    const id = queue[i]
    if (id === to) { const r = [id]; while (r[0] !== from) r.unshift(prev.get(r[0])!); return r }
    for (const n of byId(g, id).neighbors) {
      if (seen.has(n)) continue
      const passable = n === to ? knowledge(g, n) >= 2 : mover ? inPlayerRealm(g, n) : (inPlayerRealm(g, n) || knowledge(g, n) >= 2)
      if (passable) { seen.add(n); prev.set(n, id); queue.push(n) }
    }
  }
  return []
}
export const routeDays = (g: GameState, route: Id[]) => route.slice(1).reduce((s, id) => s + hopDays(byId(g, id)), 0)
const syncMobilizable = (g: GameState) => { playerHouse(g).mobilizable = menUnderArms(g) }

export function recruit(game: GameState, provinceId: Id): GameState {
  const p = byId(game, provinceId)
  requireRule(controlled(game).some(c => c.id === provinceId), 'Só é possível recrutar nas províncias que você governa.')
  const now = game.campaign.garrisons[provinceId] ?? 0
  requireRule(now + M.recruitBatch <= levyCap(p), `${p.name} sustenta no máximo ${levyCap(p)} homens em armas.`)
  const g = editGame(game)
  pay(g, { gold: M.recruitGold, renown: M.recruitRenown, iron: M.recruitIron })
  g.campaign.garrisons[provinceId] = now + M.recruitBatch
  syncMobilizable(g)
  notify(g, 'Recrutamento', `${M.recruitBatch} homens se alistaram em ${p.name}. Eles vieram pelo seu renome, e o ferro os armou.`, provinceId)
  return g
}
export function upgradeWalls(game: GameState, provinceId: Id): GameState {
  const p = byId(game, provinceId)
  requireRule(controlled(game).some(c => c.id === provinceId), 'Só é possível fortificar as províncias que você governa.')
  requireRule(wallLevel(game, p) < 5, 'As muralhas já estão no nível máximo.')
  const g = editGame(game)
  pay(g, { gold: M.wallUpgrade.gold, stone: M.wallUpgrade.stone })
  const castle = castleOf(g, byId(g, provinceId)); castle.defense += 15
  notify(g, 'Muralhas reforçadas', `${p.name} agora tem muralhas de nível ${wallLevel(g, byId(g, provinceId))}.`, provinceId)
  return g
}
function newArmy(g: GameState, houseId: Id, men: number, route: Id[], order: Army['order'], startDelay = 0): Army {
  const army: Army = { id: nextId(g, 'army'), houseId, men, route, step: 0, nextStepDay: g.day + startDelay + hopDays(byId(g, route[1] ?? route[0])), order, targetProvinceId: route.at(-1)!, status: 'marchando', startDay: g.day }
  g.campaign.armies.push(army)
  return army
}
/** War-style redeployment between provinces of your realm. */
export function moveTroops(game: GameState, from: Id, to: Id, men: number): GameState {
  requireRule(from !== to, 'Escolha outra província.')
  requireRule((game.campaign.garrisons[from] ?? 0) >= men && men > 0, 'Não há homens suficientes nessa guarnição.')
  requireRule(inPlayerRealm(game, to), 'Tropas só se deslocam livremente dentro do seu território.')
  const route = armyRoute(game, from, to, true)
  requireRule(route.length > 1, 'Não há caminho dentro do seu território.')
  const g = editGame(game)
  g.campaign.garrisons[from] -= men
  newArmy(g, g.playerHouseId, men, route, 'mover')
  notify(g, 'Tropas em marcha', `${men} homens partem de ${byId(g, from).name} para ${byId(g, to).name} (${routeDays(g, route)} dias).`, to)
  return g
}
export const hasClaim = (g: GameState, provinceId: Id) => g.campaign.claims.some(c => c.provinceId === provinceId)
/** Casus belli born from the world itself: Ardesh insulted Serraval at the last tourney. */
export const naturalGrievance = (g: GameState, provinceId: Id) => { const p = byId(g, provinceId); return g.world.houses.find(h => h.id === p.governingHouseId)?.name === 'Casa Ardesh' && p.id === g.world.houses.find(h => h.id === p.governingHouseId)!.seatProvinceId }
export function attackQuote(g: GameState, from: Id, target: Id) {
  const p = byId(g, target), route = armyRoute(g, from, target)
  const wall = wallLevel(g, p), def = defenders(g, p)
  const justified = hasClaim(g, target) || naturalGrievance(g, target)
  return { route, days: routeDays(g, route), siegeDays: M.siegeBaseDays + wall * M.siegeDaysPerWall, wall, defenders: def, justified, recommended: Math.ceil(def * (1 + wall * M.wallBonus) * 1.15 / 50) * 50 }
}
export function attack(game: GameState, from: Id, target: Id, men: number): GameState {
  const p = byId(game, target)
  requireRule(!inPlayerRealm(game, target), 'Essa terra já é sua.')
  requireRule(knowledge(game, target) >= 2, 'Explore a província antes de marchar contra ela.')
  requireRule((game.campaign.garrisons[from] ?? 0) >= men && men >= 50, 'Envie pelo menos 50 homens de uma guarnição sua.')
  requireRule(!game.campaign.armies.some(a => a.houseId === game.playerHouseId && a.targetProvinceId === target && a.status !== 'dissolvido' && a.order === 'atacar'), 'Já há um exército seu contra essa província.')
  const q = attackQuote(game, from, target)
  requireRule(q.route.length > 1, 'Não há caminho conhecido até lá.')
  const g = editGame(game), house = g.world.houses.find(h => h.id === p.governingHouseId)!
  g.campaign.garrisons[from] -= men
  if (!q.justified) {
    pay(g, { renown: Math.min(playerHouse(g).prestige, M.unjustRenown) })
    g.campaign.politics.liegeThreat = clamp(g.campaign.politics.liegeThreat + M.unjustThreat, 0, 100)
    for (const c of g.campaign.contacts) c.relation = clamp(c.relation - (c.houseId === house.id ? 30 : 5))
  }
  const liege = g.world.provinces.find(x => x.id === playerHouse(g).seatProvinceId)!.liegeHouseId
  if (house.id === liege || p.governingHouseId === liege) g.campaign.politics.liegeThreat = 100
  newArmy(g, g.playerHouseId, men, q.route, 'atacar')
  notify(g, 'Marcha de guerra', `${men} homens marcham contra ${p.name} (${house.name}). Chegada em ${q.days} dias, cerco de ${q.siegeDays} dias.${q.justified ? '' : ' Sem justificativa: seu renome caiu e as outras casas desconfiam de você.'}`, target, true)
  return g
}

/** Deterministic battle: numbers, walls and tactic decide; a hashed roll adds ±12%. */
export function resolveBattle(seedKey: string, attacker: number, defender: number, wall: number, tactic: Tactic, starved: boolean, terrain: Province['terrain']) {
  const t = M.tactics[tactic] as { power: number; attackerLoss: number; label: string }
  const roll = .88 + (hash(seedKey) % 1000) / 1000 * .24
  const A = attacker * t.power * roll
  const D = defender * (1 + wall * M.wallBonus) * (starved ? M.tactics.cerco.defenderFactor : 1) * (terrain === 'montanha' ? 1.15 : 1)
  const victory = A > D
  const attackerLeft = victory ? Math.max(1, Math.round(attacker * (1 - t.attackerLoss * Math.min(1, D / A)))) : Math.round(attacker * (1 - Math.min(.85, t.attackerLoss * 1.7)))
  const defenderLeft = victory ? 0 : Math.max(1, Math.round(defender * (1 - .3 * Math.min(1, A / D))))
  const mid = (a: number, b: number) => Math.round((a + b) / 2)
  const phases: BattlePhase[] = [
    { label: 'As linhas se formam', attacker, defender },
    { label: t.label, attacker: mid(attacker, attackerLeft), defender: mid(defender, defenderLeft) },
    { label: victory ? 'A muralha cede' : 'O ataque é repelido', attacker: attackerLeft, defender: defenderLeft },
  ]
  return { victory, attackerLeft, defenderLeft, phases, power: Math.round(A), resistance: Math.round(D) }
}
/** The player picks how to take the walls once the siege is ready. */
export function assault(game: GameState, armyId: Id, tactic: Tactic): GameState {
  const army = game.campaign.armies.find(a => a.id === armyId)
  requireRule(army && army.status === 'pronto', 'Esse exército não está pronto para o assalto.')
  const g = editGame(game), a = g.campaign.armies.find(x => x.id === armyId)!, p = byId(g, a.targetProvinceId)
  for (const d of g.campaign.decisions) if (d.armyId === armyId && d.kind === 'assalto') { d.resolved = true; d.choice = tactic }
  if (tactic === 'cerco' && !a.siegeEndDay) throw new Error('Cerco inválido.')
  if (tactic === 'cerco') {
    pay(g, { food: Math.ceil(a.men / 10) * M.tactics.cerco.foodPer10 })
    a.status = 'sitiando'; a.siegeEndDay = g.day + M.tactics.cerco.extraDays; a.starved = true
    notify(g, 'Cerco prolongado', `Seus homens fecham os caminhos de ${p.name}. Em ${M.tactics.cerco.extraDays} dias a guarnição estará faminta.`, p.id)
    return g
  }
  if (tactic === 'amanhecer') pay(g, { renown: M.tactics.amanhecer.renown })
  const house = g.world.houses.find(h => h.id === p.governingHouseId)!
  const def = defenders(g, p), wall = wallLevel(g, p), starved = Boolean(a.starved)
  const r = resolveBattle(`${g.world.seed}:${a.id}:${g.day}:${tactic}`, a.men, def, wall, tactic, starved, p.terrain)
  const battle: BattleRecord = { id: nextId(g, 'battle'), day: g.day, provinceId: p.id, attackerHouseId: g.playerHouseId, defenderHouseId: house.id, tactic, attackerStart: a.men, defenderStart: def, attackerLeft: r.attackerLeft, defenderLeft: r.defenderLeft, wall, victory: r.victory, phases: r.phases, summary: '' }
  a.men = r.attackerLeft
  if (r.victory) {
    battle.summary = `Vitória em ${p.name}. ${battle.attackerStart - r.attackerLeft} dos seus homens caíram; a guarnição de ${house.name} se rendeu.`
    playerHouse(g).prestige += M.victoryRenown
    rulerOf(g, house.id).memory.push({ day: g.day, text: `Foi derrotado pela ${playerHouse(g).name} em ${p.name}.` })
    reveal(g, p.id, 'investigada', 'Conquista')
    if (house.seatProvinceId === p.id && house.rank !== 'real') {
      a.status = 'dissolvido'
      g.campaign.decisions.push({ id: nextId(g, 'decision'), kind: 'submissão', day: g.day, provinceId: p.id, houseId: house.id, resolved: false })
      // The victorious army returns home; part stays as escort while the oath is taken.
      const home = controlled(g)[0]
      const route = armyRoute(g, p.id, home.id, false)
      if (route.length > 1) newArmy(g, g.playerHouseId, r.attackerLeft, route, 'mover'); else g.campaign.garrisons[home.id] = (g.campaign.garrisons[home.id] ?? 0) + r.attackerLeft
    } else {
      p.occupyingHouseId = g.playerHouseId
      g.campaign.garrisons[p.id] = r.attackerLeft; a.status = 'dissolvido'
      g.campaign.politics.liegeThreat = clamp(g.campaign.politics.liegeThreat + BALANCE.politics.threatOccupation, 0, 100)
      record(g, `A ${playerHouse(g).name} ocupou ${p.name}. A posse legal continua com a ${house.name}.`, [p.id, house.id])
    }
  } else {
    battle.summary = `Derrota em ${p.name}. ${battle.attackerStart - r.attackerLeft} homens perdidos; os sobreviventes recuam.`
    playerHouse(g).prestige = Math.max(0, playerHouse(g).prestige - M.defeatRenown)
    a.status = 'dissolvido'
    const home = controlled(g)[0], route = armyRoute(g, p.id, home.id, false)
    if (route.length > 1 && r.attackerLeft > 0) newArmy(g, g.playerHouseId, r.attackerLeft, route, 'mover'); else g.campaign.garrisons[home.id] = (g.campaign.garrisons[home.id] ?? 0) + r.attackerLeft
  }
  g.campaign.battles.push(battle)
  syncMobilizable(g)
  notify(g, r.victory ? 'Vitória' : 'Derrota', battle.summary, p.id, true)
  return g
}
/** AI armies (the liege at war) besiege a province of the player; the garrison defends with its walls. */
function resolveDefense(g: GameState, a: Army) {
  const p = byId(g, a.targetProvinceId), attackerHouse = g.world.houses.find(h => h.id === a.houseId)!
  const def = g.campaign.garrisons[p.id] ?? 0, wall = wallLevel(g, p)
  const r = resolveBattle(`${g.world.seed}:${a.id}:${g.day}:defesa`, a.men, def, wall, 'assalto', false, p.terrain)
  g.campaign.battles.push({ id: nextId(g, 'battle'), day: g.day, provinceId: p.id, attackerHouseId: a.houseId, defenderHouseId: g.playerHouseId, tactic: 'assalto', attackerStart: a.men, defenderStart: def, attackerLeft: r.attackerLeft, defenderLeft: r.defenderLeft, wall, victory: r.victory, phases: r.phases, summary: r.victory ? `${attackerHouse.name} tomou ${p.name}.` : `As muralhas de ${p.name} resistiram à ${attackerHouse.name}.` })
  a.status = 'dissolvido'
  if (r.victory) {
    g.campaign.garrisons[p.id] = 0; p.occupyingHouseId = a.houseId
    playerHouse(g).prestige = Math.max(0, playerHouse(g).prestige - 10)
    notify(g, 'Província perdida', `${attackerHouse.name} ocupou ${p.name}. Retome-a com um exército ou negocie a paz.`, p.id, true)
  } else {
    g.campaign.garrisons[p.id] = r.defenderLeft
    playerHouse(g).prestige += M.victoryRenown
    attackerHouse.mobilizable = Math.max(100, attackerHouse.mobilizable - (a.men - r.attackerLeft))
    g.campaign.politics.stage = 'advertido'; g.campaign.politics.liegeThreat = 55
    notify(g, 'Cerco rompido', `${p.name} resistiu. ${attackerHouse.name} perdeu ${a.men - r.attackerLeft} homens e recuou humilhada.`, p.id, true)
  }
  syncMobilizable(g)
}
export function processMilitary(g: GameState) {
  for (const a of g.campaign.armies) {
    if (a.status === 'dissolvido') continue
    const mine = a.houseId === g.playerHouseId
    if (mine && a.status === 'marchando' && a.step > 0) {
      // Armies on campaign eat from the granary; hunger makes men desert.
      const food = Math.ceil(a.men / 10) * M.marchFoodPer10PerDay, h = playerHouse(g)
      if (h.stock.food >= food) h.stock.food -= food; else a.men = Math.max(1, Math.floor(a.men * .97))
    }
    if (a.status === 'marchando' && g.day >= a.nextStepDay) {
      a.step++
      if (a.step >= a.route.length - 1) {
        const target = byId(g, a.targetProvinceId)
        if (a.order === 'mover') {
          if (mine) { g.campaign.garrisons[target.id] = (g.campaign.garrisons[target.id] ?? 0) + a.men; notify(g, 'Tropas chegaram', `${a.men} homens reforçam ${target.name}.`, target.id) }
          a.status = 'dissolvido'
        } else {
          a.status = 'sitiando'; a.siegeEndDay = g.day + M.siegeBaseDays + wallLevel(g, target) * M.siegeDaysPerWall
          notify(g, mine ? 'Cerco iniciado' : 'Inimigo às portas', mine ? `O cerco a ${target.name} começou. O assalto será possível em ${a.siegeEndDay - g.day} dias.` : `${g.world.houses.find(h => h.id === a.houseId)!.name} cercou ${target.name}. Reforce a guarnição antes do assalto (dia ${a.siegeEndDay}).`, target.id, !mine)
        }
      } else a.nextStepDay = g.day + hopDays(byId(g, a.route[a.step + 1]))
    }
    if (a.status === 'sitiando' && a.siegeEndDay !== undefined && g.day >= a.siegeEndDay) {
      if (mine) {
        a.status = 'pronto'
        g.campaign.decisions.push({ id: nextId(g, 'decision'), kind: 'assalto', day: g.day, provinceId: a.targetProvinceId, houseId: byId(g, a.targetProvinceId).governingHouseId, armyId: a.id, resolved: false })
        notify(g, 'Pronto para o assalto', `As muralhas de ${byId(g, a.targetProvinceId).name} estão cercadas. Escolha como atacar.`, a.targetProvinceId, true)
      } else resolveDefense(g, a)
    }
  }
  g.campaign.armies = g.campaign.armies.filter(a => a.status !== 'dissolvido')
}
/** Position of an army on the map for the renderer: interpolated between route stops. */
export function armyPosition(g: GameState, a: Army): [number, number] {
  const cur = byId(g, a.route[Math.min(a.step, a.route.length - 1)]).center
  if (a.status !== 'marchando' || a.step >= a.route.length - 1) return cur
  const next = byId(g, a.route[a.step + 1]).center, span = hopDays(byId(g, a.route[a.step + 1]))
  const t = Math.max(0, Math.min(1, 1 - (a.nextStepDay - g.day) / span))
  return [cur[0] + (next[0] - cur[0]) * t, cur[1] + (next[1] - cur[1]) * t]
}
export function enemyArmy(g: GameState, houseId: Id, men: number, from: Id, target: Id): Army | null {
  const route = (() => {
    const queue = [from], prev = new Map<Id, Id>(), seen = new Set([from])
    for (let i = 0; i < queue.length; i++) { const id = queue[i]; if (id === target) { const r = [id]; while (r[0] !== from) r.unshift(prev.get(r[0])!); return r } for (const n of byId(g, id).neighbors) if (!seen.has(n)) { seen.add(n); prev.set(n, id); queue.push(n) } }
    return [] as Id[]
  })()
  if (route.length < 2) return null
  return newArmy(g, houseId, men, route, 'atacar')
}
export { newArmy }
