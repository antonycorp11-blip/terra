import { create } from 'zustand'
import type { Id } from '../engine/types'
export type MapLevel = 'reinos' | 'feudos' | 'provincias' | 'assentamentos'
export type MapMode = 'politico' | 'casas' | 'terreno'
type Modal = 'save' | 'load' | 'new' | null
interface UIState {
  level: MapLevel; mode: MapMode; selectedRealmId: Id | null; selectedFiefId: Id | null; selectedProvinceId: Id | null; selectedSettlementId: Id | null; modal: Modal; search: string;
  setLevel: (level: MapLevel) => void; setMode: (mode: MapMode) => void; selectRealm: (id: Id) => void; selectFief: (id: Id, realmId: Id) => void; selectProvince: (id: Id, fiefId: Id, realmId: Id) => void; selectSettlement: (id: Id) => void; resetMap: () => void; setModal: (modal: Modal) => void; setSearch: (search: string) => void;
}
export const useUI = create<UIState>(set => ({
  level:'reinos', mode:'politico', selectedRealmId:null, selectedFiefId:null, selectedProvinceId:null, selectedSettlementId:null, modal:null, search:'',
  setLevel: level => set({ level }), setMode: mode => set({ mode }),
  selectRealm: selectedRealmId => set({ selectedRealmId, selectedFiefId:null, selectedProvinceId:null, selectedSettlementId:null, level:'feudos' }),
  selectFief: (selectedFiefId, selectedRealmId) => set({ selectedFiefId, selectedRealmId, selectedProvinceId:null, selectedSettlementId:null, level:'provincias' }),
  selectProvince: (selectedProvinceId, selectedFiefId, selectedRealmId) => set({ selectedProvinceId, selectedFiefId, selectedRealmId, selectedSettlementId:null, level:'assentamentos' }),
  selectSettlement: selectedSettlementId => set({ selectedSettlementId }),
  resetMap: () => set({ level:'reinos', selectedRealmId:null, selectedFiefId:null, selectedProvinceId:null, selectedSettlementId:null }),
  setModal: modal => set({ modal }), setSearch: search => set({ search })
}))
