import type { GameState, House, Id, Province } from '../engine/types'
import type { Heraldry } from '../engine/mvpTypes'
import { COLORS } from '../engine/heraldry'
import { hash } from '../engine/random'
import { knowledge } from '../engine/knowledge'
import { controlled, isVassal } from '../engine/stateUtils'

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

/** A figure standing on the map: Irian with his retinue, or a lord at his seat or on the road. */
export interface LordToken { houseId: Id; characterId: Id; provinceId: Id; men: number | null; riding: boolean; me: boolean }
export function lordTokens(g: GameState): LordToken[] {
  const tokens: LordToken[] = []
  const me = g.campaign.parties.find(p => p.id === 'party-player')
  if (me) tokens.push({ houseId: g.playerHouseId, characterId: `ruler-${g.playerHouseId}`, provinceId: me.provinceId, men: me.men, riding: me.provinceId !== houseOf(g, g.playerHouseId).seatProvinceId, me: true })
  for (const h of g.world.houses) {
    if (h.id === g.playerHouseId || isVassal(g, h.id) || g.campaign.prisoners.some(p => p.houseId === h.id)) continue
    const party = g.campaign.parties.find(p => p.kind === 'lorde' && p.houseId === h.id)
    const at = party?.provinceId ?? (provinceOf(g, h.seatProvinceId).governingHouseId === h.id ? h.seatProvinceId : null)
    if (at && knowledge(g, at) >= 2) tokens.push({ houseId: h.id, characterId: `ruler-${h.id}`, provinceId: at, men: party ? party.men : null, riding: Boolean(party) && party!.provinceId !== h.seatProvinceId, me: false })
  }
  return tokens
}
/** Large figure for cards, conversations and scenes (the map uses the light version). */
export const cardUrl = (file: string) => assetUrl(file.replace('assets/lords/', 'assets/lords/card/'))

/** The journal: what deserves Irian's attention now, most urgent first. Read-only view of the state. */
export interface Goal { text: string; detail: string; provinceId: Id | null; tone: 'red' | 'gold' | 'teal' | 'green' }
export function goals(g: GameState): Goal[] {
  const out: Goal[] = [], mine = controlled(g), me = g.campaign.parties.find(p => p.id === 'party-player')
  const name = (id: Id) => knowledge(g, id) >= 2 ? provinceOf(g, id).name : 'terras avistadas'
  const band = (n: string) => n.replace(/^O/, 'o')
  for (const b of g.campaign.parties) if (b.kind === 'bandidos' && mine.some(p => p.id === b.provinceId)) out.push({ text: `Expulse ${band(b.name)}`, detail: `${b.men} salteadores saqueiam ${name(b.provinceId)}`, provinceId: b.provinceId, tone: 'red' })
  for (const a of g.campaign.armies) if (a.houseId !== g.playerHouseId && mine.some(p => p.id === a.targetProvinceId)) out.push({ text: `Defenda ${name(a.targetProvinceId)}`, detail: `${houseOf(g, a.houseId).name} marcha com ${a.men} homens`, provinceId: a.targetProvinceId, tone: 'red' })
  for (const q of g.campaign.quests) if (!q.done) { const b = g.campaign.parties.find(p => p.id === q.partyId); if (b) out.push({ text: `Destrua ${band(b.name)}`, detail: `pedido da ${houseOf(g, q.houseId).name}: +${q.gold} ouro, +${q.influence} influência`, provinceId: b.provinceId, tone: 'gold' }) }
  if (me && me.men < 30 && mine.some(p => (g.campaign.garrisons[p.id] ?? 0) > 50)) out.push({ text: 'Reforce a comitiva', detail: `Irian tem só ${me.men} homens: leve-o a uma província sua e traga homens da guarnição`, provinceId: me.provinceId, tone: 'teal' })
  const unmet = g.world.houses.filter(h => h.id !== g.playerHouseId && !isVassal(g, h.id) && provinceOf(g, h.seatProvinceId).fiefId === provinceOf(g, houseOf(g, g.playerHouseId).seatProvinceId).fiefId && !g.campaign.contacts.some(c => c.houseId === h.id && c.establishedDay !== null))
  for (const h of unmet.slice(0, 1)) out.push({ text: `Visite a ${h.name}`, detail: 'Leve a comitiva até o lorde para abrir contato', provinceId: h.seatProvinceId, tone: 'teal' })
  // The road to grand lord: the house closest to swearing.
  const fief = provinceOf(g, houseOf(g, g.playerHouseId).seatProvinceId).fiefId
  const courted = g.world.houses.filter(h => h.id !== g.playerHouseId && !isVassal(g, h.id) && provinceOf(g, h.seatProvinceId).fiefId === fief && g.campaign.contacts.some(c => c.houseId === h.id && c.establishedDay !== null))
    .sort((a, b) => (g.campaign.influence[b.id] ?? 0) - (g.campaign.influence[a.id] ?? 0))[0]
  if (courted) out.push({ text: `Conquiste a ${courted.name}`, detail: `influência ${g.campaign.influence[courted.id] ?? 0}% · pela espada, por tratado ou pela corte`, provinceId: courted.seatProvinceId, tone: 'green' })
  return out
}
