import { dateFromDay } from './calendar'
import type { GameState } from './types'
export function advanceGame(game: GameState, days = 1): GameState {
  if (days < 0 || !Number.isInteger(days)) throw new Error('Avanço inválido')
  const day = game.day + days
  const records = []
  for (let current = game.day + 1; current <= day; current++) {
    if (current % 90 === 0) {
      const date = dateFromDay(current)
      records.push({ id:`history-calendar-${current}`, day:current, category:'calendário' as const, description:`Começa ${date.season.toLowerCase()} do ano ${date.year} da Era do Pacto.`, entityIds:[] })
    }
  }
  return { ...game, day, world:{ ...game.world, history:[...game.world.history, ...records] }, updatedAt:Date.now() }
}
