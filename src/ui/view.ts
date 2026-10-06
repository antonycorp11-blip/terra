import type { GameState, House, Id, Province } from '../engine/types'
import type { Heraldry } from '../engine/mvpTypes'
import { COLORS } from '../engine/heraldry'
import { hash } from '../engine/random'
import { knowledge } from '../engine/knowledge'
import { controlled, isVassal } from '../engine/stateUtils'
import { dateFromDay } from '../engine/calendar'
import { routeDays } from '../engine/military'

/** Heraldry for every house: the player's chosen arms, authored arms for Três Pontes, derived arms elsewhere. */
const AUTHORED: Record<string, Heraldry> = {
  'Casa Hadrin': { division: 2, symbol: 1, primary: '#a83540', secondary: '#ca9c39' },
  'Casa Morvane': { division: 4, symbol: 10, primary: '#254b82', secondary: '#ece0b8' },
  'Casa Quellan': { division: 1, symbol: 15, primary: '#598047', secondary: '#ece0b8' },
  'Casa Ardesh': { division: 5, symbol: 2, primary: '#7f8795', secondary: '#1d2937' },
  'Casa Vasterre': { division: 3, symbol: 14, primary: '#704080', secondary: '#ca9c39' },
}
export function heraldryOf(g: GameState, house: House): Heraldry {
  if (house.id === g.playerHouseId) return g.campaign.customization.heraldry
  if (AUTHORED[house.name]) return AUTHORED[house.name]
  const n = hash(house.id), primary = COLORS.includes(house.color) ? house.color : house.color
  let secondary = COLORS[(n >>> 5) % COLORS.length]
  if (secondary === primary) secondary = COLORS[((n >>> 5) + 5) % COLORS.length]
  return { division: n % 8, symbol: (n >>> 9) % 16, primary, secondary }
}
/** Map colour of a house: the player and the player's vassals share the player's colour. */
export function mapColor(g: GameState, houseId: Id): string {
  if (houseId === g.playerHouseId || isVassal(g, houseId)) return g.campaign.customization.heraldry.primary
  const h = g.world.houses.find(x => x.id === houseId)!
  return heraldryOf(g, h).primary
}
export type Level = 'hidden' | 'sighted' | 'known'
export const levelOf = (g: GameState, id: Id): Level => { const k = knowledge(g, id); return k >= 2 ? 'known' : k === 1 ? 'sighted' : 'hidden' }
export const isMine = (g: GameState, p: Province) => controlled(g).some(c => c.id === p.id)
export const houseOf = (g: GameState, id: Id) => g.world.houses.find(h => h.id === id)!
export const provinceOf = (g: GameState, id: Id) => g.world.provinces.find(p => p.id === id)!
export const rulerFigure = (g: GameState, houseId: Id) => g.campaign.characters.find(c => c.id === `ruler-${houseId}`)
export const assetUrl = (file: string) => `${import.meta.env.BASE_URL}${file}`

/** What is coming: every scheduled arrival in the campaign, for the timeline. */
export interface Pin { day: number; kind: string; text: string; tone: 'gold' | 'teal' | 'green' | 'red' | 'grey'; provinceId: Id | null }
export function upcoming(g: GameState): Pin[] {
  const pins: Pin[] = []
  const name = (id: Id) => knowledge(g, id) >= 2 ? provinceOf(g, id).name : 'terra avistada'
  for (const e of g.campaign.expeditions) if (!e.completed) pins.push({ day: e.endDay, kind: 'batedores', text: `voltam de ${name(e.provinceId)}`, tone: 'teal', provinceId: e.provinceId })
  for (const i of g.campaign.investments) if (!i.completed) pins.push({ day: i.endDay, kind: 'obra', text: 'conclusão em Pontevela', tone: 'green', provinceId: i.provinceId })
  for (const d of g.campaign.diplomacy) if (!d.completed) pins.push({ day: d.endDay, kind: 'emissário', text: `chega a ${name(d.provinceId)}`, tone: 'gold', provinceId: d.provinceId })
  for (const n of g.campaign.negotiations) if (n.status === 'aguardando') pins.push({ day: n.replyDay, kind: 'resposta', text: houseOf(g, n.houseId).name, tone: 'gold', provinceId: houseOf(g, n.houseId).seatProvinceId })
  for (const m of g.campaign.spyMissions) if (!m.completed) pins.push({ day: m.endDay, kind: 'espião', text: `volta de ${name(m.provinceId)}`, tone: 'grey', provinceId: m.provinceId })
  const t = g.campaign.travel
  if (t) pins.push(t.arrived ? { day: t.returnDay, kind: 'Irian', text: 'volta para casa', tone: 'gold', provinceId: null } : { day: t.arriveDay, kind: 'Irian', text: `chega a ${name(t.provinceId)}`, tone: 'gold', provinceId: t.provinceId })
  for (const a of g.campaign.armies) {
    const mine = a.houseId === g.playerHouseId, target = provinceOf(g, a.targetProvinceId)
    if (a.status === 'marchando') pins.push({ day: a.nextStepDay + routeDays(g, a.route.slice(a.step + 1)), kind: mine ? 'tropas' : 'inimigo', text: `${a.order === 'atacar' ? 'cercam' : 'chegam a'} ${target.name}`, tone: mine ? 'gold' : 'red', provinceId: target.id })
    if (a.status === 'sitiando' && a.siegeEndDay) pins.push({ day: a.siegeEndDay, kind: mine ? 'assalto' : 'ataque', text: `às muralhas de ${target.name}`, tone: 'red', provinceId: target.id })
  }
  const nextMonth = Math.ceil((g.day + 1) / 30) * 30
  pins.push({ day: nextMonth, kind: 'balanço', text: 'renda do mês', tone: 'green', provinceId: null })
  const liege = g.world.provinces.find(p => p.id === houseOf(g, g.playerHouseId).seatProvinceId)!.liegeHouseId
  if (liege !== g.world.realms.find(r => r.id === houseOf(g, g.playerHouseId).realmId)?.royalHouseId) pins.push({ day: Math.ceil((g.day + 1) / 90) * 90, kind: 'tributo', text: `a ${houseOf(g, liege).name.replace('Casa ', '')}`, tone: 'grey', provinceId: null })
  const winter = (() => { const d = dateFromDay(g.day); const y = Math.floor(g.day / 360); const w = y * 360 + 270; return d.season === 'Inverno' ? w + 360 : w })()
  pins.push({ day: winter, kind: 'inverno', text: 'celeiros precisam de sal', tone: 'grey', provinceId: null })
  return pins.filter(p => p.day > g.day).sort((a, b) => a.day - b.day)
}
