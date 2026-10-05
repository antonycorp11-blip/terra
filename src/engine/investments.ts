import type { GameState } from './types'
import type { InvestmentKind } from './mvpTypes'
import {BALANCE} from './balance'
import {editGame,nextId,playerSeat,requireRule,spend} from './stateUtils'
import {notify} from './notifications'
export function startInvestment(game:GameState,kind:InvestmentKind){const rule=BALANCE.investment[kind];requireRule(rule,'Investimento inválido.');const seat=playerSeat(game);requireRule(!game.campaign.investments.some(i=>i.provinceId===seat.id&&i.kind===kind),'Este investimento já foi iniciado ou concluído.');const g=editGame(game);spend(g,rule.gold,0,rule.wood);g.campaign.investments.push({id:nextId(g,'investment'),provinceId:seat.id,kind,startDay:g.day,endDay:g.day+rule.days,completed:false});notify(g,'Obras iniciadas',`${rule.name}: conclusão em ${rule.days} dias.`,seat.id);return g}
export function processInvestments(g:GameState){for(const i of g.campaign.investments)if(!i.completed&&i.endDay<=g.day){i.completed=true;notify(g,'Investimento concluído',`${BALANCE.investment[i.kind].name}. ${BALANCE.investment[i.kind].benefit}.`,i.provinceId)}}
