import { initializeCampaign, type LegacyGame } from './campaign'
import type { GameState } from './types'
import { createWorld } from './world'
const DB_NAME = 'herdeiros-do-juramento'
const STORE = 'campaigns'
const CURRENT_VERSION = 1
export interface SaveSlot { slot: string; savedAt: number; game: GameState }

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, CURRENT_VERSION)
    request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE, { keyPath:'slot' }) }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}
async function transact<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, mode)
    const request = action(transaction.objectStore(STORE))
    let result: T
    request.onsuccess = () => { result = request.result }
    request.onerror = () => reject(request.error)
    transaction.oncomplete = () => { db.close(); resolve(result) }
    transaction.onerror = () => { db.close(); reject(transaction.error) }
  })
}
export async function saveGame(slot: string, game: GameState): Promise<void> { await transact('readwrite', store => store.put({ slot, savedAt:Date.now(), game:{ ...game, updatedAt:Date.now() } })) }
export async function loadGame(slot: string): Promise<GameState | null> {
  const entry = await transact<SaveSlot | undefined>('readonly', store => store.get(slot))
  if (!entry) return null
  const game = migrateGame(entry.game)
  if (game !== (entry.game as unknown)) await saveGame(slot,game)
  return game
}
export function migrateGame(game: LegacyGame): GameState {
  if (game.version !== 1 && game.version !== 2 && game.version !== 3) throw new Error('Versão de campanha não suportada.')
  if (game.version === 3 && game.campaign?.revision === 4 && (game.world as { geographyRevision: number }).geographyRevision === 4) return game as GameState
  return migrateGeography(game)
}
/**
 * Saves from the uniform map (geography 3) cannot keep their province ids: the continent was
 * redrawn. The house identity, treasury, stores, calendar and chronicle carry over; knowledge and
 * campaign actions restart on the new map.
 */
export function migrateGeography(game: LegacyGame): GameState {
  const oldWorld = game.world as unknown as { geographyRevision?: number; houses: { id: string; name: string; color: string; symbol: string; gold: number; prestige: number; stock: Record<string, number> }[]; history: GameState['world']['history']; seed: number }
  if (oldWorld.geographyRevision === 4 && game.version === 3) return initializeCampaign(game)
  const world = createWorld(oldWorld.seed)
  const old = oldWorld.houses.find(h => h.id === game.playerHouseId)
  const house = world.houses.find(h => h.id === game.playerHouseId)
  if (old && house) {
    house.name = old.name; house.color = old.color; house.symbol = old.symbol; house.gold = old.gold; house.prestige = old.prestige
    house.stock = { ...house.stock, food: old.stock.food ?? house.stock.food, wood: old.stock.wood ?? house.stock.wood, iron: old.stock.iron ?? house.stock.iron, stone: old.stock.stone ?? 0, salt: old.stock.salt ?? house.stock.salt, silver: old.stock.silver ?? house.stock.silver }
  }
  world.history = [...oldWorld.history]
  const fresh = initializeCampaign({ version: 1, world, day: game.day, playerHouseId: game.playerHouseId, speed: 0, updatedAt: game.updatedAt })
  if (game.campaign?.customization) fresh.campaign.customization = structuredClone(game.campaign.customization)
  return fresh
}
export async function listSaves(): Promise<SaveSlot[]> { return (await transact<SaveSlot[]>('readonly', store => store.getAll())).sort((a,b) => b.savedAt - a.savedAt) }
export async function deleteSave(slot: string): Promise<void> { await transact('readwrite', store => store.delete(slot)) }
