import type { GameState,Id } from './types'
import {editGame,nextId,record} from './stateUtils'
/** `important` marks results that open new decisions; the UI pauses time only for these. */
export function notify(g:GameState,title:string,text:string,provinceId:Id|null=null,important=false){g.campaign.notifications.push({id:nextId(g,'notice'),day:g.day,title,text,provinceId,read:false,important});record(g,`${title}: ${text}`,provinceId?[provinceId,g.playerHouseId]:[g.playerHouseId])}
export function readNotification(game:GameState,id:string){const g=editGame(game);const n=g.campaign.notifications.find(n=>n.id===id);if(n)n.read=true;return g}
export function readAllNotifications(game:GameState){if(!game.campaign.notifications.some(n=>!n.read))return game;const g=editGame(game);for(const n of g.campaign.notifications)n.read=true;return g}
