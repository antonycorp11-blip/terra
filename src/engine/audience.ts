import type { GameState } from './types'

export type PontevelaChoice = 'distribuir' | 'vender'
export const PONTEVELA_AUDIENCE_ID = 'audience-pontevela-celeiros'

export function resolvePontevelaAudience(game:GameState, choice:PontevelaChoice):GameState {
  if(game.world.history.some(record => record.id === PONTEVELA_AUDIENCE_ID)) return game
  const house=game.world.houses.find(item => item.id === game.playerHouseId)
  const province=game.world.provinces.find(item => item.id === house?.seatProvinceId)
  if(!house || !province || house.stock.food < 120) return game
  const distribute=choice === 'distribuir'
  const houses=game.world.houses.map(item => item.id === house.id ? {...item,gold:item.gold+(distribute ? 0 : 90),stock:{...item.stock,food:item.stock.food-120},prestige:item.prestige+(distribute ? 2 : 0)} : item)
  const provinces=game.world.provinces.map(item => item.id === province.id ? {...item,loyalty:Math.max(0,Math.min(100,item.loyalty+(distribute ? 4 : -2)))} : item)
  const description=distribute ? `${house.name} distribuiu cento e vinte sacas dos celeiros de Pontevela aos barqueiros antes da cheia.` : `${house.name} vendeu cento e vinte sacas dos celeiros de Pontevela aos mercadores por noventa moedas de ouro.`
  const history=[...game.world.history,{id:PONTEVELA_AUDIENCE_ID,day:game.day,category:'território' as const,description,entityIds:[house.id,province.id]}]
  return {...game,world:{...game.world,houses,provinces,history},updatedAt:Date.now()}
}
