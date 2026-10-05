import type { GameState } from './types'
import type { PlayerHouseCustomization } from './mvpTypes'
import {validHeraldry,SYMBOLS} from './heraldry'
import {editGame,playerHouse,requireRule} from './stateUtils'
export const normalizeHouseName=(name:string)=>name.trim().replace(/^Casa\s+/i,'').replace(/\s+/g,' ')
export function houseNameError(game:GameState,input:string):string|null{
 const name=normalizeHouseName(input)
 if(name.length<2||name.length>24)return 'Use entre 2 e 24 caracteres.'
 if(!/^[\p{L}][\p{L} '-]*[\p{L}]$/u.test(name))return 'Use letras, espaços, apóstrofo ou hífen.'
 const key=(s:string)=>s.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase()
 if(game.world.houses.some(h=>h.id!==game.playerHouseId&&key(h.name)===key(`Casa ${name}`)))return 'Esta casa já existe em Varedor.'
 return null
}
export function customizeHouse(game:GameState,custom:PlayerHouseCustomization):GameState{
 requireRule(game.day===0,'A identidade da casa é definida na fundação.')
 const error=houseNameError(game,custom.name);requireRule(!error,error??'Nome inválido.');requireRule(validHeraldry(custom.heraldry),'Selecione um brasão válido e duas cores diferentes.')
 const g=editGame(game),house=playerHouse(g),oldName=house.name
 g.campaign.customization={name:normalizeHouseName(custom.name),heraldry:{...custom.heraldry}}
 house.name=`Casa ${g.campaign.customization.name}`;house.color=custom.heraldry.primary;house.symbol=SYMBOLS[custom.heraldry.symbol]
 house.memory=house.memory.map(m=>m.replaceAll(oldName,house.name))
 g.world.history=g.world.history.map(r=>({...r,description:r.description.replaceAll(oldName,house.name)}))
 return g
}
