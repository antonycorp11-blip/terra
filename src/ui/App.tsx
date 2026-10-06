import { useEffect, useRef, useState } from 'react'
import { createGame } from '../engine/world'
import { customizeHouse } from '../engine/houseCustomization'
import { deleteSave, listSaves, loadGame, saveGame, type SaveSlot } from '../engine/persistence'
import type { Heraldry } from '../engine/mvpTypes'
import type { GameState } from '../engine/types'
import HouseCreation from './HouseCreation'
import GameScreen, { type Notice } from './game/GameScreen'
import { useUI } from './store'
import { longDate, type Act } from './parts'
import styles from './App.module.css'

type Screen = 'title' | 'creation' | 'game'

export default function App() {
  const [screen, setScreen] = useState<Screen>('title')
  const [game, setGameState] = useState<GameState | null>(null)
  const [base, setBase] = useState<GameState | null>(null)
  const [preparing, setPreparing] = useState(false)
  const [hasAutosave, setHasAutosave] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [saves, setSaves] = useState<SaveSlot[] | null>(null)
  const ui = useUI()
  // Single source of truth for sequencing player actions and time ticks without losing either.
  const gameRef = useRef<GameState | null>(null)
  const setGame = (next: GameState) => { gameRef.current = next; setGameState(next) }

  useEffect(() => { listSaves().then(list => setHasAutosave(list.some(s => s.slot === 'autosave'))).catch(() => {}) }, [])
  // The game is played in turns: every new turn is saved.
  useEffect(() => { if (game && game.campaign.turn > 1) saveGame('autosave', game).catch(() => setNotice({ title: 'Salvamento', text: 'Falha no salvamento automático.' })) }, [game?.campaign.turn]) // eslint-disable-line react-hooks/exhaustive-deps

  const act: Act = (action, success) => {
    if (!gameRef.current) return
    try { const next = action(gameRef.current); setGame(next); const fresh = next.campaign.notifications.at(-1); if (success) setNotice({ title: success, text: fresh && fresh !== gameRef.current?.campaign.notifications.at(-1) ? fresh.text : '', provinceId: fresh?.provinceId }) }
    catch (error) { setNotice({ title: 'Não foi possível', text: error instanceof Error ? error.message : 'Ação indisponível.', error: true }) }
  }
  function startCreation() {
    setPreparing(true)
    // World generation runs in a worker; if workers fail, fall back to the main thread.
    const done = (g: GameState) => { setBase(g); setScreen('creation'); setPreparing(false) }
    try {
      const worker = new Worker(new URL('./worldWorker.ts', import.meta.url), { type: 'module' })
      worker.onmessage = (e: MessageEvent<GameState>) => { worker.terminate(); done(e.data) }
      worker.onerror = () => { worker.terminate(); window.setTimeout(() => done(createGame()), 30) }
      worker.postMessage(null)
    } catch { window.setTimeout(() => done(createGame()), 30) }
  }
  function found(name: string, heraldry: Heraldry) {
    try {
      const founded = customizeHouse(base!, { name, heraldry })
      ui.reset(); setGame(founded); setScreen('game'); setBase(null)
      saveGame('autosave', founded).then(() => setHasAutosave(true)).catch(() => {})
      setNotice({ title: `${founded.world.houses.find(h => h.id === founded.playerHouseId)!.name} foi fundada`, text: 'Toque em Irian para mover a comitiva. Quando terminar, encerre o turno.', important: true })
    } catch (error) { setNotice({ title: 'Não foi possível', text: error instanceof Error ? error.message : 'Não foi possível fundar a casa.', error: true }) }
  }
  async function doLoad(slot: string) {
    try {
      const loaded = await loadGame(slot)
      if (!loaded) return
      ui.reset(); setGame({ ...loaded, speed: 0 }); setScreen('game'); setSaves(null)
      setNotice({ title: 'Campanha carregada', text: slot === 'autosave' ? 'Salvamento automático.' : slot })
    } catch (error) { setNotice({ title: 'Não foi possível', text: error instanceof Error ? error.message : 'Não foi possível carregar este salvamento.', error: true }) }
  }
  const io = {
    save: async (slot: string) => { if (!gameRef.current) return; await saveGame(slot, gameRef.current); setNotice({ title: 'Campanha salva', text: `“${slot}”` }) },
    list: () => listSaves(), load: doLoad, remove: (slot: string) => deleteSave(slot), newCampaign: startCreation,
  }

  if (screen === 'game' && game) return <GameScreen game={game} setGame={setGame} act={act} notice={notice} setNotice={setNotice} io={io}/>
  return <div className={styles.app}>
    {screen === 'creation' && base ? <HouseCreation base={base} onFound={found} onCancel={() => { setScreen(gameRef.current ? 'game' : 'title'); setBase(null) }}/>
      : <div className={styles.title}>
        <div className={styles.titleCard}>
          <span className={styles.eyebrow}>TERRA</span>
          <h1>Herdeiros do Juramento</h1>
          <p>Um mundo gigante. Três formas de conquistar. Uma interface simples.</p>
          {hasAutosave && <button className={styles.primary} onClick={() => doLoad('autosave')}>Continuar campanha</button>}
          <button className={hasAutosave ? styles.secondary : styles.primary} onClick={startCreation} disabled={preparing}>{preparing ? 'Desenhando Varedor…' : 'Nova Campanha'}</button>
          <button className={styles.secondary} onClick={async () => setSaves(await listSaves().catch(() => []))}>Carregar campanha</button>
        </div>
      </div>}
    {saves && <div className={styles.modalBackdrop} onMouseDown={e => { if (e.target === e.currentTarget) setSaves(null) }}><div className={styles.modal} role="dialog" aria-label="Carregar campanha">
      <button className={styles.modalClose} onClick={() => setSaves(null)} aria-label="Fechar janela">×</button>
      <span className={styles.eyebrow}>CAMPANHAS DE VAREDOR</span><h1>Carregar campanha</h1>
      <div className={styles.saveList}>{saves.length ? saves.map(s => <div key={s.slot}><button onClick={() => doLoad(s.slot)}><strong>{s.slot === 'autosave' ? 'Salvamento automático' : s.slot}</strong><small>{s.game.world.houses.find(h => h.id === s.game.playerHouseId)?.name} · {longDate(s.game.day)}</small></button><button onClick={async () => { await deleteSave(s.slot); setSaves(await listSaves()) }} aria-label={`Excluir ${s.slot}`}>×</button></div>) : <p>Não há campanhas salvas neste navegador.</p>}</div>
    </div></div>}
    {notice && <button className={styles.toast} onClick={() => setNotice(null)} aria-live="polite">{notice.title}{notice.text ? `: ${notice.text}` : ''}</button>}
  </div>
}
