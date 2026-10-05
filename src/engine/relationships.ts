import type { GameState,Id } from './types'
import {hash} from './random'
import {playerHouse,playerSeat,clamp} from './stateUtils'
import {rulerOf} from './characters'
const TEMPERAMENT:Record<string,number>={acolhedor:18,generoso:12,pragmático:4,ambicioso:-4,orgulhoso:-12,desconfiado:-24}
const INTEREST:Record<string,number>={mercantil:8,erudito:4,zeloso:0,tradicional:-3,belicoso:-7}
/** Initial house relation (−100…100): every term is derived from world state and listed as a reason for the player. */
export function initialRelation(g:GameState,houseId:Id,provinceId:Id){
 const h=g.world.houses.find(h=>h.id===houseId)!,p=g.world.provinces.find(p=>p.id===provinceId)!,player=playerHouse(g),seat=playerSeat(g),c=rulerOf(g,houseId)
 const distance=Math.floor(Math.hypot(p.center[0]-seat.center[0],p.center[1]-seat.center[1])/80)
 const temperament=TEMPERAMENT[c.traits[0]]??0
 const rivalry=hash([g.playerHouseId,houseId].sort().join(':'))%5===0?-22:0
 const sovereign=h.realmId===player.realmId?10:-8
 const interest=(INTEREST[c.traits[1]]??0)+(c.ambition>75?-6:0)
 const prestige=Math.floor((player.prestige-25)/3)
 const exposed=g.campaign.spyMissions.some(m=>m.outcome==='identificado'&&g.world.provinces.find(x=>x.id===m.provinceId)?.governingHouseId===houseId)?-15:0
 const reasons=[`Temperamento ${c.traits[0]} (${signed(temperament)})`,rivalry?'Rivalidade tradicional (−22)':'Sem rivalidade tradicional',sovereign>0?'Juramento à mesma coroa (+10)':'Coroas distintas (−8)',`Interesses ${c.traits[1]}${c.ambition>75?' e ambição elevada':''} (${signed(interest)})`,`Reputação (${signed(prestige)})`,`Distância (−${distance})`]
 if(exposed)reasons.push('Agente identificado anteriormente (−15)')
 return {relation:clamp(temperament+rivalry+sovereign+interest+prestige+exposed-distance),reasons}
}
const signed=(n:number)=>n>=0?`+${n}`:`−${-n}`
export const disposition=(relation:number)=>relation>=20?'Amigável':relation>=0?'Neutra':relation>=-25?'Desconfiada':'Hostil'
