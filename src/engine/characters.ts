import type { World,Id,GameState } from './types'
import type { Character } from './mvpTypes'
import {hash} from './random'
import {knowledge} from './knowledge'
import {FIRST_NAMES} from './worldData'
const FEMININE=['Maera','Yselle','Alena','Seris','Elara','Neris','Lívia','Ilsa','Corina','Amaris','Delia','Renna','Talia','Vessa']
export const TEMPERAMENTS=['acolhedor','desconfiado','ambicioso','pragmático','orgulhoso','generoso'] as const
export const INTERESTS=['zeloso','mercantil','tradicional','erudito','belicoso'] as const
const pick=<T,>(list:readonly T[],n:number)=>list[n%list.length]
/** Deterministic, persistent characters. Rulers use the stable id `ruler-<houseId>` so systems never search by name. */
export function makeCharacters(world:World,playerId:Id):Character[]{
 const names=[...FIRST_NAMES.filter(n=>n!=='Irian'),...FEMININE]
 const characters:Character[]=[]
 world.houses.forEach(house=>{
  const n=hash(`${world.seed}:${house.id}`),m=hash(`${house.id}:conselho`)
  const isPlayer=house.id===playerId
  const role=house.rank==='real'?'Soberano':house.rank==='grão-senhorial'?'Grão-lorde':'Lorde provincial'
  characters.push({id:`ruler-${house.id}`,name:isPlayer?'Irian':pick(names,n),houseId:house.id,age:isPlayer?29:25+n%37,role,traits:isPlayer?['pragmático','zeloso']:[pick(TEMPERAMENTS,n>>>4),pick(INTERESTS,n>>>11)],diplomacy:30+n%61,charisma:25+(n>>>3)%66,intrigue:20+(n>>>6)%71,ambition:20+(n>>>9)%71,provinceId:house.seatProvinceId,portrait:n,relationship:{trust:0,respect:0,friendship:0},memory:[]})
  if(isPlayer)return
  // One counsellor per foreign house gives every court a second voice without building full genealogies yet.
  characters.push({id:`counsel-${house.id}`,name:pick(names,m+7),houseId:house.id,age:22+m%40,role:pick(['Castelão','Conselheira','Intendente','Herdeiro','Capitã da guarda'],m>>>5),traits:[pick(TEMPERAMENTS,m>>>8),pick(INTERESTS,m>>>13)],diplomacy:25+m%60,charisma:25+(m>>>3)%60,intrigue:20+(m>>>6)%70,ambition:20+(m>>>9)%70,provinceId:house.seatProvinceId,portrait:m,relationship:{trust:0,respect:0,friendship:0},memory:[]})
 })
 const player=world.houses.find(h=>h.id===playerId)!
 const court=[['Maelis','Mãe de Irian'],['Teren','Irmão e herdeiro provisório'],['Lívia','Irmã de Irian'],['Edric','Intendente'],['Sabela','Conselheira']]
 for(const [index,[name,role]] of court.entries())characters.push({id:`court-${index}`,name,role,houseId:playerId,age:[56,23,31,48,37][index],traits:[TEMPERAMENTS[index],index===3?'mercantil':'zeloso'],diplomacy:55+index*5,charisma:65-index*3,intrigue:25+index*10,ambition:35+index*7,provinceId:player.seatProvinceId,portrait:hash(name),relationship:{trust:20,respect:15,friendship:20},memory:[]})
 const spies=[['Nara','Escriba viajante'],['Odran','Antigo batedor'],['Velis','Mercadora de tecidos'],['Miriel','Mensageira']]
 spies.forEach(([name,role],i)=>characters.push({id:`candidate-${i}`,name,role,houseId:playerId,age:26+i*7,traits:[TEMPERAMENTS[i]],diplomacy:40+i*4,charisma:38+i*7,intrigue:[72,58,84,65][i],ambition:30+i*10,provinceId:player.seatProvinceId,portrait:hash(name),relationship:{trust:5,respect:0,friendship:0},memory:[]}))
 return characters
}
export const isAgentCandidate=(c:Character)=>c.id.startsWith('candidate-')
export function characterName(g:GameState,c:Character){return `${c.name} ${g.world.houses.find(h=>h.id===c.houseId)!.name.replace(/^Casa /,'')}`}
export function knownCharacter(g:GameState,c:Character){
 if(isAgentCandidate(c))return false
 if(c.houseId===g.playerHouseId)return true
 const contact=g.campaign.contacts.some(d=>d.houseId===c.houseId&&d.establishedDay!==null)
 // Expeditions reveal who rules a province; counsellors are only met through investigation or contact.
 return contact||knowledge(g,c.provinceId)>=3||(c.id.startsWith('ruler-')&&knowledge(g,c.provinceId)>=2)
}
export function canConverse(g:GameState,c:Character){return knownCharacter(g,c)&&(c.houseId===g.playerHouseId||g.campaign.contacts.some(d=>d.houseId===c.houseId&&(d.establishedDay!==null||d.audienceUntil>=g.day)))}
export const rulerOf=(g:GameState,houseId:Id)=>g.campaign.characters.find(c=>c.id===`ruler-${houseId}`)!
