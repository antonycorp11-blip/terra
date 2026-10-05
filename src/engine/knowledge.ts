import type { GameState,Id } from './types'
import type { KnowledgeLevel } from './mvpTypes'
import {playerSeat} from './stateUtils'
export const KNOWLEDGE:KnowledgeLevel[]=['desconhecida','avistada','explorada','investigada']
export const knowledge=(g:GameState,id:Id)=>KNOWLEDGE.indexOf(g.campaign.knowledge[id]?.level??'desconhecida')
export function reveal(g:GameState,id:Id,level:KnowledgeLevel,source:string){if(KNOWLEDGE.indexOf(level)>knowledge(g,id))g.campaign.knowledge[id]={level,revealedDay:g.day,source}}
export function sightNeighbors(g:GameState,id:Id){for(const neighbor of g.world.provinces.find(p=>p.id===id)!.neighbors)reveal(g,neighbor,'avistada','Observação da fronteira')}
// Physical land adjacency only: administrative maritime links never grant travel.
export function knownRoute(g:GameState,target:Id,allowSighted=false):Id[]{
 const start=playerSeat(g).id,queue=[start],previous=new Map<Id,Id>(),seen=new Set([start])
 for(let i=0;i<queue.length;i++){const id=queue[i];if(id===target){const route=[id];while(route[0]!==start)route.unshift(previous.get(route[0])!);return route}
 for(const n of g.world.provinces.find(p=>p.id===id)!.neighbors)if(!seen.has(n)&&(knowledge(g,n)>=2||(allowSighted&&n===target&&knowledge(g,n)===1))){seen.add(n);previous.set(n,id);queue.push(n)}}return []
}
export function visibleProvinceName(g:GameState,id:Id){return knowledge(g,id)>=2?g.world.provinces.find(p=>p.id===id)!.name:knowledge(g,id)===1?'Terras avistadas':'Terras desconhecidas'}
