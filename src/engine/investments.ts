import type { GameState, Id, Province } from './types'
import type { InvestmentKind } from './mvpTypes'
import { BALANCE } from './balance'
import { controlled, editGame, nextId, pay, playerSeat, requireRule } from './stateUtils'
import { notify } from './notifications'

/** Completed levels of a work in a province (0–3). */
export const workLevel = (g: GameState, provinceId: Id, kind: InvestmentKind) => g.campaign.investments.filter(i => i.completed && i.kind === kind && i.provinceId === provinceId).length
export const workInProgress = (g: GameState, provinceId: Id, kind: InvestmentKind) => g.campaign.investments.find(i => !i.completed && i.kind === kind && i.provinceId === provinceId)
/** Cost of the next level: each level costs 60% more than the one before. */
export function workQuote(g: GameState, provinceId: Id, kind: InvestmentKind) {
  const rule = BALANCE.investment[kind], level = workLevel(g, provinceId, kind), f = 1 + BALANCE.levelCost * level
  return { level, next: level + 1, gold: Math.round(rule.gold * f), wood: Math.round(rule.wood * f), days: rule.days + level * 5, max: level >= BALANCE.investmentLevels }
}
/** What a mine digs depends on the province: stone, silver or iron. */
export const mineYield = (p: Province): { key: 'stone' | 'silver' | 'iron'; label: string; amount: number } => p.resources.includes('prata') ? { key: 'silver', label: 'prata', amount: 15 } : p.resources.includes('pedra') ? { key: 'stone', label: 'pedra', amount: 30 } : { key: 'iron', label: 'ferro', amount: 30 }

export function startInvestment(game: GameState, kind: InvestmentKind, provinceId: Id = playerSeat(game).id): GameState {
  const rule = BALANCE.investment[kind]
  requireRule(rule, 'Investimento inválido.')
  requireRule(controlled(game).some(p => p.id === provinceId), 'Só é possível construir nas províncias que você governa.')
  requireRule(!workInProgress(game, provinceId, kind), 'Essa obra já está em andamento.')
  const q = workQuote(game, provinceId, kind)
  requireRule(!q.max, 'Essa obra já está no nível máximo.')
  const g = editGame(game), p = g.world.provinces.find(x => x.id === provinceId)!
  pay(g, { gold: q.gold, wood: q.wood })
  g.campaign.investments.push({ id: nextId(g, 'investment'), provinceId, kind, startDay: g.day, endDay: g.day + q.days, completed: false })
  notify(g, 'Obras iniciadas', `${rule.name} (nível ${q.next}) em ${p.name}: conclusão em ${q.days} dias.`, provinceId)
  return g
}
export function processInvestments(g: GameState) {
  for (const i of g.campaign.investments) if (!i.completed && i.endDay <= g.day) {
    i.completed = true
    const p = g.world.provinces.find(x => x.id === i.provinceId)!
    const benefit = i.kind === 'mine' ? `+${mineYield(p).amount} ${mineYield(p).label}/mês` : BALANCE.investment[i.kind].benefit
    notify(g, 'Obra concluída', `${BALANCE.investment[i.kind].name} em ${p.name} (nível ${workLevel(g, i.provinceId, i.kind)}). ${benefit}.`, i.provinceId)
  }
}
