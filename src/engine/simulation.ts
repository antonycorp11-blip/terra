import {dateFromDay} from './calendar'
import type {GameState} from './types'
import {editGame} from './stateUtils'
import {processExploration} from './exploration'
import {processInvestments} from './investments'
import {processDiplomacy} from './diplomacy'
import {processEspionage} from './espionage'
import {processEconomy,processLocalEvents} from './economy'
export function advanceGame(game:GameState,days=1):GameState{
 if(days<0||!Number.isInteger(days))throw new Error('Avanço inválido')
 const g=editGame(game)
 for(let i=0;i<days;i++){
  g.day++
  processInvestments(g);processExploration(g);processDiplomacy(g);processEspionage(g);processEconomy(g);processLocalEvents(g)
  if(g.day%90===0){const date=dateFromDay(g.day);g.world.history.push({id:`history-calendar-${g.day}`,day:g.day,category:'calendário',description:`Começa ${date.season.toLowerCase()} do ano ${date.year} da Era do Pacto.`,entityIds:[]})}
 }
 // Wall-clock time belongs to the persistence envelope; simulation remains reproducible.
 return g
}
