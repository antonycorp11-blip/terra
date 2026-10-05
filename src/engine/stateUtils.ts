import type { GameState, Id } from './types'
export const playerHouse=(g:GameState)=>g.world.houses.find(h=>h.id===g.playerHouseId)!
export const playerSeat=(g:GameState)=>g.world.provinces.find(p=>p.id===playerHouse(g).seatProvinceId)!
export const clamp=(n:number,min=-100,max=100)=>Math.min(max,Math.max(min,n))
export function requireRule(ok:unknown,message:string):asserts ok {if(!ok)throw new Error(message)}
// Geometry is immutable and shared. Only campaign and mutable domain records are copied.
export function editGame(g:GameState):GameState {return {...g,world:{...g.world,houses:g.world.houses.map(h=>({...h,stock:{...h.stock},memory:[...h.memory]})),provinces:g.world.provinces.map(p=>({...p})),history:[...g.world.history]},campaign:structuredClone(g.campaign)}}
export function nextId(g:GameState,prefix:string){return `${prefix}-${g.campaign.nextId++}`}
export function spend(g:GameState,gold=0,food=0,wood=0){const h=playerHouse(g);requireRule(h.gold>=gold&&h.stock.food>=food&&h.stock.wood>=wood,'Recursos insuficientes.');h.gold-=gold;h.stock.food-=food;h.stock.wood-=wood}
export function record(g:GameState,description:string,entityIds:Id[]){g.world.history.push({id:nextId(g,'history'),day:g.day,category:'território',description,entityIds})}
