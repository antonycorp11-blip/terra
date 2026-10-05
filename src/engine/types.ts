import type { CampaignData } from './mvpTypes'
export type Id = string
export type Point = [number, number]
export type Season = 'Primavera' | 'Verão' | 'Outono' | 'Inverno'
export type Terrain = 'planície' | 'floresta' | 'colina' | 'montanha' | 'litoral' | 'várzea'
export type SettlementType = 'castelo' | 'fortaleza' | 'cidade' | 'vila' | 'aldeia' | 'fazenda' | 'mina' | 'porto' | 'entreposto' | 'serraria' | 'mosteiro' | 'torre'
export interface Realm { id: Id; name: string; royalHouseId: Id; capital: string; color: string; accent: string; culture: string; specialty: string; motto: string; fiefIds: Id[]; anchor: Point }
export interface Fief { id: Id; name: string; realmId: Id; grandHouseId: Id; provinceIds: Id[]; capitalProvinceId: Id }
export interface Province { id: Id; name: string; realmId: Id; fiefId: Id; legalHouseId: Id; governingHouseId: Id; occupyingHouseId: Id | null; liegeHouseId: Id; polygon: Point[]; polygons: Point[][]; landmass: number; center: Point; neighbors: Id[]; elevation: number; terrain: Terrain; population: number; loyalty: number; settlementIds: Id[]; color: string }
export interface Settlement { id: Id; name: string; provinceId: Id; type: SettlementType; position: Point; population: number; garrison: number; ownerHouseId: Id; defense: number; production: { gold: number; food: number; wood: number; iron: number } }
export interface House { id: Id; name: string; rank: 'real' | 'grão-senhorial' | 'provincial'; realmId: Id; seatProvinceId: Id; motto: string; symbol: string; color: string; gold: number; stock: { food:number; wood:number; iron:number; horses:number }; mobilizable: number; prestige: number; influence: number; titleIds: Id[]; memberIds: Id[]; memory: string[] }
export interface HistoricalRecord { id: Id; day: number; category: 'fundação' | 'calendário' | 'território'; description: string; entityIds: Id[] }
export interface World { geographyRevision: 3; seed: number; landPolygon: Point[]; landPolygons: Point[][]; maritimeLinks: [Id,Id][]; seaRoutes: Point[][]; realms: Realm[]; fiefs: Fief[]; provinces: Province[]; settlements: Settlement[]; houses: House[]; rivers: Point[][]; roads: [Id,Id][]; history: HistoricalRecord[] }
export interface GameState { version: 2; campaign: CampaignData; world: World; day: number; playerHouseId: Id; speed: 0 | 1 | 2 | 3; updatedAt: number }
