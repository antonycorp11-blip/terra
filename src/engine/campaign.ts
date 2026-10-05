import type { GameState } from './types'
import {DEFAULT_HERALDRY} from './heraldry'
import {makeCharacters} from './characters'
import {sightNeighbors} from './knowledge'
export type LegacyGame=Omit<GameState,'campaign'|'version'> & {version:1|2;campaign?:GameState['campaign']}
export function initializeCampaign(old:LegacyGame):GameState{
 if(old.campaign)return {...old,version:2} as GameState
 const house=old.world.houses.find(h=>h.id===old.playerHouseId)!
 const characters=makeCharacters(old.world,old.playerHouseId)
 const g:GameState={...old,version:2,campaign:{revision:1,customization:{name:house.name.replace(/^Casa /,''),heraldry:{...DEFAULT_HERALDRY}},knowledge:Object.fromEntries(old.world.provinces.map(p=>[p.id,{level:p.id===house.seatProvinceId?'investigada':'desconhecida',revealedDay:old.day,source:'Carta inicial'}])),expeditions:[],investments:[],ledger:[],characters,contacts:[],diplomacy:[],agents:characters.filter(c=>c.id.startsWith('candidate-')).map((c,i)=>({id:`agent-${i}`,characterId:c.id,loyalty:[78,86,64,81][i],hired:false,description:['Conhece arquivos e disfarces de corte.','Lê trilhas e observa fortificações.','O comércio abre portas, mas sua ambição é alta.','Viaja discretamente entre estalagens.'][i]})),spyMissions:[],reports:[],conversations:[],notifications:[],nextId:1}}
 sightNeighbors(g,house.seatProvinceId)
 // Populate stable membership IDs without mutating the legacy save.
 g.world={...g.world,houses:g.world.houses.map(h=>({...h,memberIds:characters.filter(c=>c.houseId===h.id&&!c.id.startsWith('candidate')).map(c=>c.id)}))}
 return g
}
