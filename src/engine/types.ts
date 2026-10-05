import type { CampaignData } from './mvpTypes'
export type Id = string
export type Point = [number, number]
export type Season = 'Primavera' | 'Verão' | 'Outono' | 'Inverno'
export type Terrain = 'planície' | 'floresta' | 'colina' | 'montanha' | 'litoral' | 'várzea'
export type SettlementType = 'castelo' | 'fortaleza' | 'cidade' | 'vila' | 'aldeia' | 'fazenda' | 'mina' | 'porto' | 'entreposto' | 'serraria' | 'mosteiro' | 'torre'
/** The six goods of Varedor. Gold is currency; renown (House.prestige) is the political currency. */
export type Resource = 'grãos' | 'madeira' | 'pedra' | 'ferro' | 'sal' | 'prata'
export const RESOURCES: Resource[] = ['grãos', 'madeira', 'pedra', 'ferro', 'sal', 'prata']
/** Stock keys mirror Resource; `food` is grain. */
export interface Stock { food: number; wood: number; stone: number; iron: number; salt: number; silver: number }
export const STOCK_KEY: Record<Resource, keyof Stock> = { 'grãos': 'food', madeira: 'wood', pedra: 'stone', ferro: 'iron', sal: 'salt', prata: 'silver' }
export interface Production { gold: number; food: number; wood: number; stone: number; iron: number; salt: number; silver: number }
export interface Realm { id: Id; name: string; royalHouseId: Id; capital: string; color: string; accent: string; culture: string; specialty: string; motto: string; fiefIds: Id[]; anchor: Point }
export interface Fief { id: Id; name: string; realmId: Id; grandHouseId: Id; provinceIds: Id[]; capitalProvinceId: Id }
/** `polygon` is the outer outline; `polygons` holds every ring (holes included) for even-odd rendering. `center` is the visual pole, always on land. */
export interface Province { id: Id; name: string; realmId: Id; fiefId: Id; legalHouseId: Id; governingHouseId: Id; occupyingHouseId: Id | null; liegeHouseId: Id; polygon: Point[]; polygons: Point[][]; landmass: number; center: Point; neighbors: Id[]; elevation: number; terrain: Terrain; resources: Resource[]; area: number; labelAngle: number; population: number; loyalty: number; settlementIds: Id[]; color: string }
export interface Settlement { id: Id; name: string; provinceId: Id; type: SettlementType; position: Point; population: number; garrison: number; ownerHouseId: Id; defense: number; production: Production }
export interface House { id: Id; name: string; rank: 'real' | 'grão-senhorial' | 'provincial'; realmId: Id; seatProvinceId: Id; motto: string; symbol: string; color: string; gold: number; stock: Stock; mobilizable: number; prestige: number; influence: number; titleIds: Id[]; memberIds: Id[]; memory: string[]; heraldry?: { division: number; symbol: number; primary: string; secondary: string } }
export interface HistoricalRecord { id: Id; day: number; category: 'fundação' | 'calendário' | 'território'; description: string; entityIds: Id[] }
export interface World { geographyRevision: 4; seed: number; landPolygon: Point[]; landPolygons: Point[][]; maritimeLinks: [Id,Id][]; seaRoutes: Point[][]; realms: Realm[]; fiefs: Fief[]; provinces: Province[]; settlements: Settlement[]; houses: House[]; rivers: Point[][]; roads: [Id,Id][]; history: HistoricalRecord[] }
export interface GameState { version: 3; campaign: CampaignData; world: World; day: number; playerHouseId: Id; speed: 0 | 1 | 2 | 3; updatedAt: number }
