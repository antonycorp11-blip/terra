import { create } from 'zustand'
import type { Id } from '../engine/types'
/** The four views of the same map. Each recolours the whole continent and changes the card's actions. */
export type Lens = 'territorio' | 'diplomacia' | 'militar' | 'influencia'
export type Sheet =
  | { kind: 'houses' }
  | { kind: 'conversation'; characterId: Id }
  | { kind: 'plan'; provinceId: Id; path: 0 | 1 | 2 }
  | { kind: 'negotiation'; negotiationId: Id }
  | { kind: 'battle'; battleId: Id }
  | { kind: 'menu' }
  | { kind: 'chronicle' }
  | null
interface UIState {
  lens: Lens; selectedProvinceId: Id | null; sheet: Sheet; resourceFilter: string | null
  focus: { provinceId: Id; nonce: number } | null; seenBattles: number
  setLens: (lens: Lens) => void; select: (id: Id | null) => void; openSheet: (sheet: Sheet) => void
  setResourceFilter: (r: string | null) => void; focusProvince: (id: Id) => void; markBattlesSeen: (n: number) => void; reset: () => void
}
const initial = { lens: 'territorio' as Lens, selectedProvinceId: null, sheet: null as Sheet, resourceFilter: null, focus: null, seenBattles: 0 }
// Transient presentation state only; every rule lives in src/engine.
export const useUI = create<UIState>(set => ({
  ...initial,
  setLens: lens => set({ lens, resourceFilter: null }),
  select: selectedProvinceId => set({ selectedProvinceId }),
  openSheet: sheet => set({ sheet }),
  setResourceFilter: resourceFilter => set({ resourceFilter }),
  focusProvince: provinceId => set(s => ({ focus: { provinceId, nonce: (s.focus?.nonce ?? 0) + 1 }, selectedProvinceId: provinceId })),
  markBattlesSeen: seenBattles => set({ seenBattles }),
  reset: () => set(initial),
}))
