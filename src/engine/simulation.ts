import { dateFromDay } from './calendar'
import type { GameState } from './types'
import { editGame } from './stateUtils'
import { processExploration } from './exploration'
import { processInvestments } from './investments'
import { processDiplomacy } from './diplomacy'
import { processEspionage } from './espionage'
import { processEconomy, processLocalEvents, processSeasons } from './economy'
import { processMilitary } from './military'
import { processPolitics } from './politics'
import { processNegotiations } from './negotiation'
import { processInfluence } from './influence'
import { processTravel } from './travel'
import { processVassals } from './vassals'
/** Advances the world day by day. Advancing N days at once equals N single steps. */
export function advanceGame(game: GameState, days = 1): GameState {
  if (days < 0 || !Number.isInteger(days)) throw new Error('Avanço inválido')
  const g = editGame(game)
  for (let i = 0; i < days; i++) {
    g.day++
    processInvestments(g); processExploration(g); processTravel(g); processDiplomacy(g); processNegotiations(g); processEspionage(g)
    processMilitary(g); processPolitics(g); processVassals(g); processInfluence(g); processEconomy(g); processSeasons(g); processLocalEvents(g)
    if (g.day % 90 === 0) { const date = dateFromDay(g.day); g.world.history.push({ id: `history-calendar-${g.day}`, day: g.day, category: 'calendário', description: `Começa ${date.season.toLowerCase()} do ano ${date.year} da Era do Pacto.`, entityIds: [] }) }
  }
  return g
}
