import type { GameState, Id } from './types'
import type { CampaignData } from './mvpTypes'
import { DEFAULT_HERALDRY } from './heraldry'
import { makeCharacters } from './characters'
import { sightNeighbors } from './knowledge'
import { initialRelation } from './relationships'
import { initialParties } from './party'

export type LegacyGame = Omit<GameState, 'campaign' | 'version'> & { version: 1 | 2 | 3; campaign?: Partial<CampaignData> & { revision?: number } }

/** Starting influence of Serraval over the houses of Três Pontes (others start at zero). */
const START_INFLUENCE: Record<string, number> = { 'Casa Hadrin': 18, 'Casa Morvane': 9, 'Casa Quellan': 41, 'Casa Ardesh': 3, 'Casa Vasterre': 22 }
/** Relations with the houses of Três Pontes, known since before the campaign. */
const START_RELATION: Record<string, number> = { 'Casa Hadrin': 22, 'Casa Morvane': -4, 'Casa Quellan': 31, 'Casa Ardesh': -28, 'Casa Vasterre': 9 }

/** Layers added in revision 3: province rule, world events, wars between houses. */
const EMPTY_LAYERS = () => ({ admin: {}, nextEventDay: 8, eventLog: {}, wars: [], conditions: [], turn: 1, orders: 3, parties: [], prisoners: [], quests: [] })

/** Builds the campaign layer for a fresh world. The player's own fief is known; its borders are sighted. */
export function initializeCampaign(old: LegacyGame): GameState {
  if (old.campaign?.revision === 4 && old.version === 3) return old as GameState
  // Older saves keep everything; the new layers start empty and the parties take the field.
  if (((old.campaign?.revision as number) === 2 || (old.campaign?.revision as number) === 3) && old.version === 3) {
    const g = { ...old, campaign: { ...EMPTY_LAYERS(), turn: Math.floor(old.day / 7), ...old.campaign, revision: 4 } } as GameState
    if (!g.campaign.parties.length) g.campaign.parties = initialParties(g)
    return g
  }
  const house = old.world.houses.find(h => h.id === old.playerHouseId)!
  const seat = old.world.provinces.find(p => p.id === house.seatProvinceId)!
  const characters = makeCharacters(old.world, old.playerHouseId)
  const knowledge: CampaignData['knowledge'] = Object.fromEntries(old.world.provinces.map(p => [p.id, { level: p.id === seat.id ? 'investigada' : p.fiefId === seat.fiefId ? 'explorada' : 'desconhecida', revealedDay: old.day, source: p.fiefId === seat.fiefId ? 'Terras do seu feudo' : 'Carta inicial' }]))
  const influence: Record<Id, number> = {}
  for (const h of old.world.houses) if (START_INFLUENCE[h.name] !== undefined) influence[h.id] = START_INFLUENCE[h.name]
  const g: GameState = {
    ...old, version: 3,
    campaign: {
      ...EMPTY_LAYERS(), revision: 4, customization: { name: house.name.replace(/^Casa /, ''), heraldry: { ...DEFAULT_HERALDRY } }, knowledge,
      expeditions: [], investments: [], ledger: [], characters, contacts: [], diplomacy: [],
      agents: characters.filter(c => c.id.startsWith('candidate-')).map((c, i) => ({ id: `agent-${i}`, characterId: c.id, loyalty: [78, 86, 64, 81][i], hired: false, description: ['Conhece arquivos e disfarces de corte.', 'Lê trilhas e observa fortificações.', 'O comércio abre portas, mas sua ambição é alta.', 'Viaja discretamente entre estalagens.'][i] })),
      spyMissions: [], reports: [], conversations: [], notifications: [], nextId: 1,
      garrisons: { [seat.id]: house.mobilizable }, armies: [], battles: [], claims: [], bonds: [], vassals: [], influence, influenceCooldowns: {},
      negotiations: [], decisions: [], politics: { liegeThreat: 15, stage: 'calmo', kingFavor: 0, kingPact: false, lastTributeDay: 0 }, travel: null, purchases: [],
    },
  }
  for (const p of old.world.provinces) if (p.fiefId === seat.fiefId) sightNeighbors(g, p.id)
  g.campaign.parties = initialParties(g)
  // Neighbours in the same fief already know Serraval: contact is established from day 0.
  for (const h of old.world.houses) {
    if (h.id === house.id || old.world.provinces.find(p => p.id === h.seatProvinceId)!.fiefId !== seat.fiefId) continue
    const base = initialRelation(g, h.id, h.seatProvinceId)
    g.campaign.contacts.push({ houseId: h.id, provinceId: h.seatProvinceId, establishedDay: 0, relation: START_RELATION[h.name] ?? base.relation, reasons: START_RELATION[h.name] !== undefined ? ['Vizinhos de feudo há gerações', ...base.reasons.slice(1)] : base.reasons, lastGiftDay: null, audienceUntil: -1, trade: false })
  }
  // Stable membership ids without mutating the source world.
  g.world = { ...g.world, houses: g.world.houses.map(h => ({ ...h, memberIds: characters.filter(c => c.houseId === h.id && !c.id.startsWith('candidate')).map(c => c.id) })) }
  return g
}
