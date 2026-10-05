import { create } from 'zustand'
import type { Id } from '../engine/types'
export type GameMode = 'descobrir' | 'influenciar' | 'conquistar'
export type InfluenceTab = 'dominio' | 'personagens' | 'espioes' | 'relacoes'
type Modal = 'save' | 'load' | null
interface UIState {
  mode: GameMode; selectedProvinceId: Id | null; selectedSettlementId: Id | null; selectedCharacterId: Id | null; influenceTab: InfluenceTab
  panelCollapsed: boolean; modal: Modal; focus: { provinceId: Id; nonce: number } | null
  setMode: (mode: GameMode) => void; selectProvince: (id: Id | null) => void; selectSettlement: (id: Id | null) => void; selectCharacter: (id: Id | null) => void
  setInfluenceTab: (tab: InfluenceTab) => void; setPanelCollapsed: (collapsed: boolean) => void; setModal: (modal: Modal) => void
  focusProvince: (id: Id) => void; reset: () => void
}
const initial = { mode:'descobrir' as GameMode, selectedProvinceId:null, selectedSettlementId:null, selectedCharacterId:null, influenceTab:'dominio' as InfluenceTab, panelCollapsed:false, modal:null, focus:null }
// Transient presentation state only; every rule lives in src/engine.
export const useUI = create<UIState>(set => ({
  ...initial,
  setMode: mode => set({ mode, selectedCharacterId:null, panelCollapsed:false }),
  selectProvince: selectedProvinceId => set({ selectedProvinceId, selectedSettlementId:null, selectedCharacterId:null, panelCollapsed:false }),
  selectSettlement: selectedSettlementId => set({ selectedSettlementId }),
  selectCharacter: selectedCharacterId => set({ selectedCharacterId, panelCollapsed:false }),
  setInfluenceTab: influenceTab => set({ influenceTab, selectedCharacterId:null }),
  setPanelCollapsed: panelCollapsed => set({ panelCollapsed }),
  setModal: modal => set({ modal }),
  focusProvince: provinceId => set(state => ({ focus:{ provinceId, nonce:(state.focus?.nonce ?? 0) + 1 }, selectedProvinceId:provinceId, selectedSettlementId:null, selectedCharacterId:null, panelCollapsed:false })),
  reset: () => set(initial)
}))
