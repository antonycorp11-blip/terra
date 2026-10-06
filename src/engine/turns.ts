import type { GameState } from './types'
import { BALANCE } from './balance'
import { requireRule } from './stateUtils'
import { advanceGame } from './simulation'
import { playerParty, processParties } from './party'

/**
 * Ends the player's turn: a week passes for every system (economy, armies, diplomacy, events),
 * then lords and outlaws ride, and a new turn begins with fresh orders and moves.
 */
export function endTurn(game: GameState): GameState {
  requireRule(!game.campaign.decisions.some(d => !d.resolved), 'Resolva as decisões pendentes antes de encerrar o turno.')
  const g = advanceGame(game, BALANCE.turn.days)
  processParties(g)
  g.campaign.turn++
  g.campaign.orders = BALANCE.turn.orders
  playerParty(g).moves = BALANCE.party.moves
  return g
}
