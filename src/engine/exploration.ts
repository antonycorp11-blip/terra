import type { GameState,Id,Province } from './types'
import type { ExpeditionFinding } from './mvpTypes'
import {BALANCE} from './balance'
import {editGame,nextId,requireRule,spend} from './stateUtils'
import {knowledge,knownRoute,reveal,sightNeighbors} from './knowledge'
import {notify} from './notifications'
import {rulerOf} from './characters'
export function expeditionQuote(g:GameState,id:Id){const p=g.world.provinces.find(p=>p.id===id);const route=p?knownRoute(g,id,true):[];return {gold:BALANCE.expedition.gold,food:BALANCE.expedition.food,route,days:BALANCE.expedition.days+Math.max(0,route.length-2)*2+(p?BALANCE.terrainDays[p.terrain]:0)}}
export const canExplore=(g:GameState,id:Id)=>knowledge(g,id)===1&&!g.campaign.expeditions.some(e=>!e.completed&&e.provinceId===id)&&expeditionQuote(g,id).route.length>1
export function sendExpedition(game:GameState,id:Id){const quote=expeditionQuote(game,id);requireRule(knowledge(game,id)===1&&quote.route.length>1,'Explore uma fronteira avistada ligada às terras conhecidas.');requireRule(!game.campaign.expeditions.some(e=>!e.completed&&e.provinceId===id),'Já existe uma expedição nesse território.');requireRule(game.campaign.expeditions.filter(e=>!e.completed).length<BALANCE.expedition.max,'No máximo duas expedições simultâneas.');const g=editGame(game);spend(g,quote.gold,quote.food);g.campaign.expeditions.push({id:nextId(g,'expedition'),provinceId:id,startDay:g.day,endDay:g.day+quote.days,completed:false,route:quote.route});notify(g,'Expedição enviada',`Exploradores partem com provisões para ${quote.days} dias.`,id);return g}
const RESOURCE:Record<string,string>={mina:'veios de ferro',serraria:'madeira de lei',fazenda:'campos férteis',porto:'pesca e cabotagem',entreposto:'mercadores de passagem'}
/** Findings are read from the province's real settlements, roads, house and loyalty — nothing is invented. */
export function expeditionFindings(g:GameState,p:Province){
 const sites=g.world.settlements.filter(s=>s.provinceId===p.id),house=g.world.houses.find(h=>h.id===p.governingHouseId)!,ruler=rulerOf(g,house.id)
 const met=house.id===g.playerHouseId||g.campaign.contacts.some(c=>c.houseId===house.id)
 const firstMeeting=!g.campaign.expeditions.some(e=>e.completed&&e.provinceId!==p.id&&g.world.provinces.find(x=>x.id===e.provinceId)?.governingHouseId===house.id)
 const findings:ExpeditionFinding[]=[],lines:string[]=[]
 const forts=sites.filter(s=>s.type==='castelo'||s.type==='cidade')
 if(forts.length){findings.push('castelo');lines.push(`Avistamos ${forts.map(s=>s.name).join(' e ')}.`)}
 const towns=sites.filter(s=>s.type==='vila'||s.type==='aldeia')
 if(towns.length){findings.push('vila');lines.push(`${towns.length===1?'Um povoado':'Povoados'}: ${towns.map(s=>s.name).join(', ')}.`)}
 const roads=g.world.roads.filter(r=>r.includes(p.id)).length
 if(roads){findings.push('estrada');lines.push(`${roads} ${roads===1?'estrada liga':'estradas ligam'} a região aos vizinhos.`)}
 const resources=[...new Set(sites.map(s=>RESOURCE[s.type]).filter(Boolean))]
 if(resources.length){findings.push('recurso');lines.push(`Recursos: ${resources.join(', ')}.`)}
 if(house.id!==g.playerHouseId&&firstMeeting){findings.push('casa');lines.push(`${house.name} administra estas terras sob o lema “${house.motto}”.`)}
 else lines.push(`${house.name} administra estas terras.`)
 if(house.id!==g.playerHouseId){findings.push('personagem');lines.push(`${ruler.role} ${ruler.name} é descrito como ${ruler.traits[0]}.`)}
 if(p.loyalty<60){findings.push('rumor');lines.push('Nas estalagens fala-se de descontentamento com o senhor local — um rumor, não um fato confirmado.')}
 if(house.id!==g.playerHouseId&&!met){findings.push('contato');lines.push('É possível enviar um emissário.')}
 return {findings,report:`${p.name}: terras de ${p.terrain}. ${lines.join(' ')}`}
}
export function processExploration(g:GameState){for(const e of g.campaign.expeditions)if(!e.completed&&e.endDay<=g.day){const p=g.world.provinces.find(p=>p.id===e.provinceId)!;const result=expeditionFindings(g,p);e.completed=true;e.findings=result.findings;e.report=result.report;reveal(g,e.provinceId,'explorada','Expedição');sightNeighbors(g,e.provinceId);notify(g,'Expedição concluída',e.report,p.id,true)}}
