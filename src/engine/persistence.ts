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
  if (game !== entry.game) await saveGame(slot,game)
  return game
}
export function migrateGame(game: LegacyGame): GameState {
  if (game.version !== 1 && game.version !== 2) throw new Error('Versão de campanha não suportada.')
  return initializeCampaign(migrateGeography(game as GameState))
}
export function migrateGeography(game: GameState): GameState {
  if (game.world.geographyRevision === 3) return game
  const world = createWorld(game.world.seed)
  const oldHouses = new Map(game.world.houses.map(house => [house.id,house]))
  for (const house of world.houses) {
    const old = oldHouses.get(house.id)
    if (!old) continue
    house.name=old.name;house.symbol=old.symbol;house.color=old.color;house.memberIds=[...old.memberIds];house.gold=old.gold;house.stock={...old.stock};house.mobilizable=old.mobilizable
    house.prestige=old.prestige;house.influence=old.influence;house.memory=[...old.memory]
  }
  const oldPlayer=game.world.houses.find(h=>h.id===game.playerHouseId)
  const newPlayer=world.houses.find(h=>h.id===game.playerHouseId)
  const oldSeat=game.world.provinces.find(p=>p.id===oldPlayer?.seatProvinceId)
  const newSeat=world.provinces.find(p=>p.id===newPlayer?.seatProvinceId)
  if(oldSeat && newSeat){newSeat.loyalty=oldSeat.loyalty;newSeat.population=oldSeat.population}
  world.history=[...game.world.history]
  return {...game,world}
}
export async function listSaves(): Promise<SaveSlot[]> { return (await transact<SaveSlot[]>('readonly', store => store.getAll())).sort((a,b) => b.savedAt - a.savedAt) }
export async function deleteSave(slot: string): Promise<void> { await transact('readwrite', store => store.delete(slot)) }
