import type { Id, Resource } from './types'
export interface Heraldry { division: number; symbol: number; primary: string; secondary: string }
export interface PlayerHouseCustomization { name: string; heraldry: Heraldry }
export type KnowledgeLevel = 'desconhecida' | 'avistada' | 'explorada' | 'investigada'
export interface KnowledgeState { level: KnowledgeLevel; revealedDay: number; source: string }
export interface TimedAction { id: Id; provinceId: Id; startDay: number; endDay: number; completed: boolean }
export type ExpeditionFinding = 'castelo' | 'vila' | 'estrada' | 'recurso' | 'casa' | 'personagem' | 'ruínas' | 'rumor' | 'contato'
export interface Expedition extends TimedAction { route: Id[]; report?: string; findings?: ExpeditionFinding[] }
export type InvestmentKind = 'farms' | 'market' | 'mine' | 'barracks'
export interface ProvinceInvestment extends TimedAction { kind: InvestmentKind }
export interface EconomicLedger { day: number; revenue: number; administration: number; upkeep: number; trade: number; tribute: number; foodProduction: number; consumption: number; gold: number; food: number; wood: number; stone: number; iron: number; salt: number; silver: number; renown: number }
export interface Relationship { trust: number; respect: number; friendship: number }
/** The six peoples of Terra (docs/RACES.md). Race shapes needs and perspective, never fixed bonuses. */
export type Race = 'humano' | 'náveo' | 'vitrânio' | 'salmário' | 'duário' | 'aureno'
/** A Duário carries a second consciousness with its own name and view of the player. */
export interface SecondConsciousness { name: string; relationship: Relationship; traits: string[] }
export interface Character { id: Id; name: string; houseId: Id; age: number; role: string; race: Race; traits: string[]; diplomacy: number; charisma: number; intrigue: number; ambition: number; provinceId: Id; portrait: number; portraitAsset: string | null; relationship: Relationship; memory: { day: number; text: string }[]; second?: SecondConsciousness; note?: string }
export type DialogueTopic = 'greet' | 'house' | 'region' | 'politics' | 'needs' | 'rumors' | 'compliment' | 'favor' | 'threaten'
export interface ConversationRecord { id: Id; characterId: Id; day: number; topic: DialogueTopic; prompt?: string; response: string; consequence: string }
export interface DiplomaticContact { houseId: Id; provinceId: Id; establishedDay: number | null; relation: number; reasons: string[]; lastGiftDay: number | null; audienceUntil: number; trade: boolean; alliance?: boolean }
export interface DiplomaticMission extends TimedAction { kind: 'emissary' | 'rapprochement' | 'audience'; houseId: Id }
export interface SpyAgent { id: Id; characterId: Id; loyalty: number; hired: boolean; description: string }
export type SpyMissionKind = 'investigar' | 'reivindicação' | 'segredo'
export interface SpyMission extends TimedAction { agentId: Id; route: Id[]; kind?: SpyMissionKind; outcome?: 'sucesso' | 'parcial' | 'nada' | 'identificado' }
export interface IntelligenceReport { id: Id; provinceId: Id; day: number; source: string; confidence: 'alta' | 'média' | 'baixa'; expiresDay: number; outcome: SpyMission['outcome']; text: string; treasury?: number; garrison?: number; loyalty?: number; rumor?: string }
export interface Notification { id: Id; day: number; title: string; text: string; provinceId: Id | null; read: boolean; important?: boolean }

/* ---------- Conquest and politics ---------- */
export type Tactic = 'assalto' | 'amanhecer' | 'cerco'
/** A body of troops on the map. `route[step]` is the province it currently stands in. */
export interface Army {
  id: Id; houseId: Id; men: number; route: Id[]; step: number; nextStepDay: number
  order: 'mover' | 'atacar' | 'socorrer'; targetProvinceId: Id; status: 'marchando' | 'sitiando' | 'pronto' | 'dissolvido'
  siegeEndDay?: number; startDay: number; starved?: boolean
}
export interface BattlePhase { label: string; attacker: number; defender: number }
export interface BattleRecord { id: Id; day: number; provinceId: Id; attackerHouseId: Id; defenderHouseId: Id; tactic: Tactic; attackerStart: number; defenderStart: number; attackerLeft: number; defenderLeft: number; wall: number; victory: boolean; phases: BattlePhase[]; summary: string }
export interface Claim { provinceId: Id; day: number; source: string }
export type BondKind = 'dívida' | 'segredo' | 'casamento'
export interface Bond { houseId: Id; kind: BondKind; day: number; text: string }
/** Houses sworn to the player. Their lands are now governed by the player; the family serves at court or as governor. */
export interface Vassal { houseId: Id; since: number; loyalty: number; tribute: number; path: 'militar' | 'diplomacia' | 'influência'; terms?: 'generosos' | 'firmes'; provinceIds?: Id[] }
/** How the player runs each province: taxes and who governs it in the lord's absence. */
export type TaxLevel = 'baixo' | 'normal' | 'alto'
export interface ProvinceAdmin { tax: TaxLevel; governor: Id | null }
export interface EventChoice { id: string; label: string; detail: string; cost?: string }
/** A world event that asks the player to decide; `data` keeps the parameters the outcome needs. */
export interface WorldEvent { key: string; title: string; text: string; choices: EventChoice[]; data: Record<string, string | number> }
export interface War { id: Id; attackerId: Id; defenderId: Id; startDay: number; reason: string; active: boolean }
export type OfferKind = 'ouro' | 'prata' | 'comércio' | 'proteção' | 'casamento' | 'perdão'
export interface Negotiation { id: Id; houseId: Id; kind: 'comércio' | 'aliança' | 'vassalagem'; round: number; status: 'aberta' | 'aguardando' | 'aceita' | 'recusada'; offers: OfferKind[]; replyDay: number; lastScore: number; needed: number; startDay: number; log: string[] }
export type DecisionKind = 'assalto' | 'submissão' | 'ultimato' | 'rei' | 'convocação' | 'juramento' | 'evento'
export interface Decision { id: Id; kind: DecisionKind; day: number; provinceId: Id | null; houseId: Id | null; armyId?: Id; resolved: boolean; choice?: string; event?: WorldEvent }
export interface Politics {
  /** How threatening the liege (grand lord) finds the player, 0–100. */
  liegeThreat: number
  stage: 'calmo' | 'advertido' | 'ultimato' | 'guerra' | 'reconhecido'
  /** The sovereign's interest in the player, −100…100. */
  kingFavor: number
  kingPact: boolean
  lastTributeDay: number
}
export interface LordTravel { provinceId: Id; route: Id[]; startDay: number; arriveDay: number; returnDay: number; arrived: boolean; ambushed: boolean }
export interface CampaignData {
  revision: 3; customization: PlayerHouseCustomization; knowledge: Record<Id, KnowledgeState>
  expeditions: Expedition[]; investments: ProvinceInvestment[]; ledger: EconomicLedger[]
  characters: Character[]; contacts: DiplomaticContact[]; diplomacy: DiplomaticMission[]
  agents: SpyAgent[]; spyMissions: SpyMission[]; reports: IntelligenceReport[]; conversations: ConversationRecord[]
  notifications: Notification[]; nextId: number
  /** Soldiers stationed in provinces the player governs or occupies. */
  garrisons: Record<Id, number>
  armies: Army[]; battles: BattleRecord[]; claims: Claim[]; bonds: Bond[]; vassals: Vassal[]
  /** Player influence over each house, 0–100. */
  influence: Record<Id, number>
  influenceCooldowns: Record<string, number>
  negotiations: Negotiation[]; decisions: Decision[]; politics: Politics; travel: LordTravel | null
  purchases: { houseId: Id; resource: Resource; amount: number; day: number }[]
  admin: Record<Id, ProvinceAdmin>
  nextEventDay: number
  eventLog: Record<string, number>
  wars: War[]
  /** Temporary modifiers on provinces, e.g. drought or plague, until a given day. */
  conditions: { provinceId: Id; kind: 'seca' | 'peste' | 'bandidos' | 'revolta'; until: number }[]
}
