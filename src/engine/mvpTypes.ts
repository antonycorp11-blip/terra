import type { Id } from './types'
export interface Heraldry { division: number; symbol: number; primary: string; secondary: string }
export interface PlayerHouseCustomization { name: string; heraldry: Heraldry }
export type KnowledgeLevel = 'desconhecida' | 'avistada' | 'explorada' | 'investigada'
export interface KnowledgeState { level: KnowledgeLevel; revealedDay: number; source: string }
export interface TimedAction { id: Id; provinceId: Id; startDay: number; endDay: number; completed: boolean }
export type ExpeditionFinding = 'castelo' | 'vila' | 'estrada' | 'recurso' | 'casa' | 'personagem' | 'ruínas' | 'rumor' | 'contato'
export interface Expedition extends TimedAction { route: Id[]; report?: string; findings?: ExpeditionFinding[] }
export type InvestmentKind = 'farms' | 'market' | 'mine'
export interface ProvinceInvestment extends TimedAction { kind: InvestmentKind }
export interface EconomicLedger { day: number; revenue: number; administration: number; upkeep: number; trade: number; foodProduction: number; consumption: number; gold: number; food: number; wood: number; iron: number }
export interface Relationship { trust: number; respect: number; friendship: number }
export interface Character { id: Id; name: string; houseId: Id; age: number; role: string; traits: string[]; diplomacy: number; charisma: number; intrigue: number; ambition: number; provinceId: Id; portrait: number; relationship: Relationship; memory: {day:number; text:string}[] }
export type DialogueTopic = 'greet' | 'house' | 'region' | 'politics' | 'compliment' | 'favor'
export interface ConversationRecord { id: Id; characterId: Id; day: number; topic: DialogueTopic; response: string; consequence: string }
export interface DiplomaticContact { houseId: Id; provinceId: Id; establishedDay: number | null; relation: number; reasons: string[]; lastGiftDay: number | null; audienceUntil: number; trade: boolean }
export interface DiplomaticMission extends TimedAction { kind: 'emissary' | 'rapprochement' | 'audience'; houseId: Id }
export interface SpyAgent { id: Id; characterId: Id; loyalty: number; hired: boolean; description: string }
export interface SpyMission extends TimedAction { agentId: Id; route: Id[]; outcome?: 'sucesso' | 'parcial' | 'nada' | 'identificado' }
export interface IntelligenceReport { id: Id; provinceId: Id; day: number; source: string; confidence: 'alta' | 'média' | 'baixa'; expiresDay: number; outcome: SpyMission['outcome']; text: string; treasury?: number; garrison?: number; loyalty?: number; rumor?: string }
export interface Notification { id: Id; day: number; title: string; text: string; provinceId: Id | null; read: boolean; important?: boolean }
export interface CampaignData { revision: 1; customization: PlayerHouseCustomization; knowledge: Record<Id,KnowledgeState>; expeditions: Expedition[]; investments: ProvinceInvestment[]; ledger: EconomicLedger[]; characters: Character[]; contacts: DiplomaticContact[]; diplomacy: DiplomaticMission[]; agents: SpyAgent[]; spyMissions: SpyMission[]; reports: IntelligenceReport[]; conversations: ConversationRecord[]; notifications: Notification[]; nextId: number }
