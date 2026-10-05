import type { World, Id, GameState } from './types'
import type { Character, Race } from './mvpTypes'
import { hash } from './random'
import { knowledge } from './knowledge'
import { FEMALE_NAMES, MALE_NAMES } from './names'
import { AUTHORED_PORTRAITS, PORTRAITS } from './portraits'
export const TEMPERAMENTS = ['acolhedor', 'desconfiado', 'ambicioso', 'pragmático', 'orgulhoso', 'generoso'] as const
export const INTERESTS = ['zeloso', 'mercantil', 'tradicional', 'erudito', 'belicoso'] as const
export const RACE_LABEL: Record<Race, string> = { humano: 'Humano', 'náveo': 'Náveo', 'vitrânio': 'Vitrânio', 'salmário': 'Salmário', 'duário': 'Duário', aureno: 'Aureno' }
const pick = <T,>(list: readonly T[], n: number) => list[n % list.length]
const RACES: Race[] = ['humano', 'humano', 'humano', 'humano', 'humano', 'náveo', 'vitrânio', 'salmário', 'duário', 'aureno']
/** Lifespans differ by people (docs/RACES.md): Vitrânios can pass two centuries. */
const ageFor = (race: Race, n: number) => race === 'vitrânio' ? 90 + n % 170 : race === 'náveo' ? 28 + n % 50 : 25 + n % 40

/** Authored rulers of Três Pontes and the crown of Velária, keyed by house name. */
const AUTHORED: Record<string, { key: string; name: string; sex: 'f' | 'm'; race: Race; age: number; traits: string[]; note: string; second?: Character['second']; stats: [number, number, number, number] }> = {
  'Casa Hadrin': { key: 'hadrin', name: 'Aldric', sex: 'm', race: 'humano', age: 67, traits: ['orgulhoso', 'tradicional'], stats: [52, 48, 40, 70], note: 'Velho e orgulhoso. Não tem herdeiro claro, e todo o feudo sabe disso.' },
  'Casa Morvane': { key: 'morvane', name: 'Isolde', sex: 'f', race: 'salmário', age: 41, traits: ['pragmático', 'mercantil'], stats: [64, 58, 62, 55], note: 'Vende sal a quem pagar mais, inclusive aos inimigos de Hadrin. Os homens dela marcham mal longe de rios e costas.' },
  'Casa Quellan': { key: 'quellan', name: 'Bertram', sex: 'm', race: 'duário', age: 46, traits: ['generoso', 'zeloso'], stats: [60, 55, 30, 35], note: 'Devoto, gentil e afogado em dívidas com a Casa Mercol.', second: { name: 'Bram', traits: ['desconfiado', 'mercantil'], relationship: { trust: -10, respect: 5, friendship: -5 } } },
  'Casa Ardesh': { key: 'ardesh', name: 'Varo', sex: 'm', race: 'vitrânio', age: 212, traits: ['orgulhoso', 'belicoso'], stats: [35, 40, 45, 72], note: 'Pedreiro e soldado. Lutou pessoalmente na Guerra do Vau e lembra do avô de Hadrin.' },
  'Casa Vasterre': { key: 'vasterre', name: 'Mirela', sex: 'f', race: 'aureno', age: 34, traits: ['ambicioso', 'belicoso'], stats: [50, 66, 48, 84], note: 'Cavaleira ambiciosa. Quer uma aliança contra Ardesh e sente a mudança do vento antes de todos.' },
  'Casa Trevis': { key: 'trevis', name: 'Odette', sex: 'f', race: 'humano', age: 52, traits: ['pragmático', 'erudito'], stats: [78, 70, 74, 60], note: 'Paciente e calculista. Desconfia de grão-lordes fortes demais.' },
}

/** Deterministic, persistent characters. Rulers use the stable id `ruler-<houseId>` so systems never search by name. */
export function makeCharacters(world: World, playerId: Id): Character[] {
  const characters: Character[] = []
  const seat = (houseId: Id) => world.provinces.find(p => p.id === world.houses.find(h => h.id === houseId)!.seatProvinceId)!
  const player = world.houses.find(h => h.id === playerId)!
  const origin = seat(playerId).center
  const usedPortraits = new Set(Object.values(AUTHORED_PORTRAITS))
  // Remaining figures go to the rulers closest to the player's seat, so the first lords met have a body on the map.
  const free = PORTRAITS.map((_, i) => i).filter(i => !usedPortraits.has(i))
  const byDistance = world.houses.filter(h => h.id !== playerId && !AUTHORED[h.name]).sort((a, b) => {
    const pa = seat(a.id).center, pb = seat(b.id).center
    return Math.hypot(pa[0] - origin[0], pa[1] - origin[1]) - Math.hypot(pb[0] - origin[0], pb[1] - origin[1]) || a.id.localeCompare(b.id)
  })
  const portraitOf = new Map<Id, number>()
  byDistance.slice(0, free.length).forEach((h, k) => portraitOf.set(h.id, free[k]))
  const usedNames = new Set<string>()
  const uniqueName = (list: string[], n: number) => { for (let k = 0; k < list.length; k++) { const name = list[(n + k) % list.length]; if (!usedNames.has(name)) { usedNames.add(name); return name } } return list[n % list.length] }
  world.houses.forEach(house => {
    const n = hash(`${world.seed}:${house.id}`), m = hash(`${house.id}:conselho`)
    const isPlayer = house.id === playerId
    const role = house.rank === 'real' ? 'Soberano' : house.rank === 'grão-senhorial' ? 'Grão-lorde' : 'Lorde provincial'
    const authored = AUTHORED[house.name]
    if (isPlayer) {
      characters.push({ id: `ruler-${house.id}`, name: 'Irian', houseId: house.id, age: 29, role, race: 'humano', traits: ['pragmático', 'zeloso'], diplomacy: 55, charisma: 58, intrigue: 40, ambition: 62, provinceId: house.seatProvinceId, portrait: n, portraitAsset: PORTRAITS[AUTHORED_PORTRAITS.irian].file, relationship: { trust: 0, respect: 0, friendship: 0 }, memory: [] })
      return
    }
    if (authored) {
      usedNames.add(authored.name)
      characters.push({ id: `ruler-${house.id}`, name: authored.name, houseId: house.id, age: authored.age, role: house.rank === 'real' ? 'Rainha' : role, race: authored.race, traits: authored.traits, diplomacy: authored.stats[0], charisma: authored.stats[1], intrigue: authored.stats[2], ambition: authored.stats[3], provinceId: house.seatProvinceId, portrait: n, portraitAsset: PORTRAITS[AUTHORED_PORTRAITS[authored.key]].file, relationship: { trust: 0, respect: 0, friendship: 0 }, memory: [], ...(authored.second ? { second: structuredClone(authored.second) } : {}), note: authored.note })
    } else {
      const figure = portraitOf.has(house.id) ? PORTRAITS[portraitOf.get(house.id)!] : null
      const race = figure?.race ?? pick(RACES, n >>> 7)
      const sex = figure?.sex ?? (n % 2 ? 'f' : 'm')
      const name = uniqueName(sex === 'f' ? FEMALE_NAMES : MALE_NAMES, n)
      const traits = [pick(TEMPERAMENTS, n >>> 4), pick(INTERESTS, n >>> 11)]
      const second = race === 'duário' ? { name: uniqueName(sex === 'f' ? FEMALE_NAMES : MALE_NAMES, n >>> 3), traits: [pick(TEMPERAMENTS, n >>> 13), pick(INTERESTS, n >>> 17)], relationship: { trust: 0, respect: 0, friendship: 0 } } : undefined
      characters.push({ id: `ruler-${house.id}`, name, houseId: house.id, age: ageFor(race, n), role: house.rank === 'real' ? (sex === 'f' ? 'Rainha' : 'Rei') : role, race, traits, diplomacy: 30 + n % 61, charisma: 25 + (n >>> 3) % 66, intrigue: 20 + (n >>> 6) % 71, ambition: 20 + (n >>> 9) % 71, provinceId: house.seatProvinceId, portrait: n, portraitAsset: figure?.file ?? null, relationship: { trust: 0, respect: 0, friendship: 0 }, memory: [], ...(second ? { second } : {}) })
    }
    // One counsellor per foreign house gives every court a second voice without building full genealogies yet.
    const cRace = pick(RACES, m >>> 2), cSex = m % 2 ? 'f' : 'm'
    characters.push({ id: `counsel-${house.id}`, name: uniqueName(cSex === 'f' ? FEMALE_NAMES : MALE_NAMES, m + 7), houseId: house.id, age: ageFor(cRace, m), role: pick(['Castelão', 'Conselheira', 'Intendente', 'Herdeiro', 'Capitã da guarda'], m >>> 5), race: cRace, traits: [pick(TEMPERAMENTS, m >>> 8), pick(INTERESTS, m >>> 13)], diplomacy: 25 + m % 60, charisma: 25 + (m >>> 3) % 60, intrigue: 20 + (m >>> 6) % 70, ambition: 20 + (m >>> 9) % 70, provinceId: house.seatProvinceId, portrait: m, portraitAsset: null, relationship: { trust: 0, respect: 0, friendship: 0 }, memory: [] })
  })
  const court = [['Maelis', 'Mãe de Irian'], ['Teren', 'Irmão e herdeiro provisório'], ['Lívia', 'Irmã de Irian'], ['Edric', 'Intendente'], ['Sabela', 'Conselheira']]
  for (const [index, [name, role]] of court.entries()) characters.push({ id: `court-${index}`, name, role, houseId: playerId, age: [56, 23, 31, 48, 37][index], race: 'humano', traits: [TEMPERAMENTS[index], index === 3 ? 'mercantil' : 'zeloso'], diplomacy: 55 + index * 5, charisma: 65 - index * 3, intrigue: 25 + index * 10, ambition: 35 + index * 7, provinceId: player.seatProvinceId, portrait: hash(name), portraitAsset: null, relationship: { trust: 20, respect: 15, friendship: 20 }, memory: [] })
  const spies: [string, string, Race][] = [['Nara', 'Escriba viajante', 'humano'], ['Odran', 'Antigo batedor', 'aureno'], ['Velis', 'Mercadora de tecidos', 'salmário'], ['Miriel', 'Mensageira', 'náveo']]
  spies.forEach(([name, role, race], i) => characters.push({ id: `candidate-${i}`, name, role, houseId: playerId, age: 26 + i * 7, race, traits: [TEMPERAMENTS[i]], diplomacy: 40 + i * 4, charisma: 38 + i * 7, intrigue: [72, 58, 84, 65][i], ambition: 30 + i * 10, provinceId: player.seatProvinceId, portrait: hash(name), portraitAsset: null, relationship: { trust: 5, respect: 0, friendship: 0 }, memory: [] }))
  return characters
}
export const isAgentCandidate = (c: Character) => c.id.startsWith('candidate-')
export function characterName(g: GameState, c: Character) { return `${c.name} ${g.world.houses.find(h => h.id === c.houseId)!.name.replace(/^Casa /, '')}` }
export function knownCharacter(g: GameState, c: Character) {
  if (isAgentCandidate(c)) return false
  if (c.houseId === g.playerHouseId) return true
  const contact = g.campaign.contacts.some(d => d.houseId === c.houseId && d.establishedDay !== null)
  // Exploring a province reveals who rules it; counsellors are only met through investigation or contact.
  return contact || knowledge(g, c.provinceId) >= 3 || (c.id.startsWith('ruler-') && knowledge(g, c.provinceId) >= 2)
}
/** Rulers of explored provinces can be addressed directly; their court needs contact or an audience. */
export function canConverse(g: GameState, c: Character) {
  if (!knownCharacter(g, c)) return false
  if (c.houseId === g.playerHouseId) return true
  if (c.id.startsWith('ruler-') && knowledge(g, c.provinceId) >= 2) return true
  return g.campaign.contacts.some(d => d.houseId === c.houseId && (d.establishedDay !== null || d.audienceUntil >= g.day))
}
export const rulerOf = (g: GameState, houseId: Id) => g.campaign.characters.find(c => c.id === `ruler-${houseId}`)!
