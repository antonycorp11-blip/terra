import { useEffect, useRef, useState } from 'react'
import { createGame } from '../engine/world'
import { advanceGame } from '../engine/simulation'
import { customizeHouse } from '../engine/houseCustomization'
import { economicBalance } from '../engine/economy'
import { readAllNotifications, readNotification } from '../engine/notifications'
import { PONTEVELA_AUDIENCE_ID, resolvePontevelaAudience, type PontevelaChoice } from '../engine/audience'
import { deleteSave, listSaves, loadGame, saveGame, type SaveSlot } from '../engine/persistence'
import type { Heraldry, Notification } from '../engine/mvpTypes'
import type { GameState } from '../engine/types'
import MapView, { type MapInset } from './MapView'
import HouseCreation from './HouseCreation'
import DiscoverPanel from './DiscoverPanel'
import InfluencePanel from './InfluencePanel'
import ConquerPanel from './ConquerPanel'
import Crest from './Heraldry'
import Icon, { type IconName } from './Icons'
import { useUI, type GameMode } from './store'
import { fmt, longDate, shortDate, signed, type Act } from './parts'
import styles from './App.module.css'

type Screen = 'title' | 'creation' | 'game'
type Scene = 'castelo' | 'cronica' | null
const SPEED_DELAY = { 1:1200, 2:450, 3:140 } as const
const MODES: [GameMode, string, IconName][] = [['descobrir', 'Descobrir', 'discover'], ['influenciar', 'Influenciar', 'influenceMode'], ['conquistar', 'Conquistar', 'conquer']]

function useViewport() {
  const [size, setSize] = useState(() => ({ width:window.innerWidth, height:window.innerHeight }))
  useEffect(() => { const update = () => setSize({ width:window.innerWidth, height:window.innerHeight }); window.addEventListener('resize', update); return () => window.removeEventListener('resize', update) }, [])
  const landscapePhone = size.height <= 520 && size.width > size.height
  const portraitPhone = !landscapePhone && size.width <= 760
  return { ...size, landscapePhone, portraitPhone, compact:landscapePhone || portraitPhone }
}

function LocalAudience({ game, onChoose }: { game: GameState; onChoose: (choice: PontevelaChoice) => void }) {
  const outcome = game.world.history.find(record => record.id === PONTEVELA_AUDIENCE_ID)
  return <div className={styles.audience}><span className={styles.eyebrow}>AUDIÊNCIA NO CASTELO</span><h2>Intendente dos Celeiros</h2>{outcome ? <p>{outcome.description}</p> : <><p>“Os barqueiros pedem ajuda antes da cheia. Temos cento e vinte sacas disponíveis. Que destino lhes damos?”</p><div className={styles.audienceChoices}><button onClick={() => onChoose('distribuir')}>Distribuir mantimentos <small>−120 alimentos · +4 lealdade · +2 prestígio</small></button><button onClick={() => onChoose('vender')}>Vender aos mercadores <small>−120 alimentos · +90 ouro · −2 lealdade</small></button></div></>}</div>
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('title')
  const [game, setGameState] = useState<GameState | null>(null)
  const [base, setBase] = useState<GameState | null>(null)
  const [preparing, setPreparing] = useState(false)
  const [hasAutosave, setHasAutosave] = useState(false)
  const [scene, setScene] = useState<Scene>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [feedOpen, setFeedOpen] = useState(false)
  const [notice, setNotice] = useState<{ text:string; provinceId?:string | null } | null>(null)
  const [saves, setSaves] = useState<SaveSlot[]>([])
  const [slotName, setSlotName] = useState('')
  const ui = useUI()
  const viewport = useViewport()
  // Single source of truth for sequencing player actions and time ticks without losing either.
  const gameRef = useRef<GameState | null>(null)
  const setGame = (next: GameState) => { gameRef.current = next; setGameState(next) }

  useEffect(() => { listSaves().then(list => setHasAutosave(list.some(s => s.slot === 'autosave'))).catch(() => {}) }, [])
  useEffect(() => {
    if (!game || game.speed === 0 || scene || ui.modal) return
    const interval = window.setInterval(() => {
      const previous = gameRef.current!
      let next = advanceGame(previous)
      const fresh = next.campaign.notifications.slice(previous.campaign.notifications.length)
      // Pause only for results that open new decisions; routine events stay in the feed.
      if (fresh.some(n => n.important)) next = { ...next, speed:0 }
      if (fresh.length) { const latest = fresh.find(n => n.important) ?? fresh.at(-1)!; setNotice({ text:`${latest.title}: ${latest.text}`, provinceId:latest.provinceId }) }
      setGame(next)
    }, SPEED_DELAY[game.speed])
    return () => window.clearInterval(interval)
  }, [game?.speed, scene, ui.modal, screen])
  useEffect(() => { if (game && game.day > 0 && game.day % 30 === 0) saveGame('autosave', game).catch(() => setNotice({ text:'Falha no salvamento automático.' })) }, [game?.day])
  useEffect(() => { if (!notice) return; const timer = window.setTimeout(() => setNotice(null), 5200); return () => window.clearTimeout(timer) }, [notice])

  const act: Act = (action, success) => {
    if (!gameRef.current) return
    try { const next = action(gameRef.current); setGame(next); const fresh = next.campaign.notifications.at(-1); if (success) setNotice({ text:success, provinceId:fresh?.provinceId }) }
    catch (error) { setNotice({ text:error instanceof Error ? error.message : 'Ação indisponível.' }) }
  }
  function startCreation() {
    setPreparing(true); setMenuOpen(false); ui.setModal(null)
    // Defer the heavy world generation so the button state paints first.
    window.setTimeout(() => { setBase(createGame()); setScreen('creation'); setPreparing(false) }, 30)
  }
  function found(name: string, heraldry: Heraldry) {
    try {
      const founded = customizeHouse(base!, { name, heraldry })
      ui.reset(); setScene(null); setGame(founded); setScreen('game'); setBase(null)
      setSlotName(`Campanha da ${founded.world.houses.find(h => h.id === founded.playerHouseId)!.name}`)
      saveGame('autosave', founded).then(() => setHasAutosave(true)).catch(() => {})
      setNotice({ text:`${founded.world.houses.find(h => h.id === founded.playerHouseId)!.name} foi fundada em Pontevela.` })
    } catch (error) { setNotice({ text:error instanceof Error ? error.message : 'Não foi possível fundar a casa.' }) }
  }
  async function openModal(modal: 'save' | 'load') { setSaves(await listSaves().catch(() => [])); ui.setModal(modal); setMenuOpen(false) }
  async function doSave() { const slot = slotName.trim(); if (!slot || !gameRef.current) return; try { await saveGame(slot, gameRef.current); setSaves(await listSaves()); ui.setModal(null); setNotice({ text:`Campanha salva em “${slot}”.` }) } catch { setNotice({ text:'Não foi possível salvar a campanha.' }) } }
  async function doLoad(slot: string) {
    try {
      const loaded = await loadGame(slot)
      if (!loaded) return
      ui.reset(); setScene(null); setGame({ ...loaded, speed:0 }); setScreen('game'); ui.setModal(null)
      setSlotName(slot === 'autosave' ? `Campanha da ${loaded.world.houses.find(h => h.id === loaded.playerHouseId)!.name}` : slot)
      setNotice({ text:`Campanha “${slot === 'autosave' ? 'salvamento automático' : slot}” carregada.` })
    } catch (error) { setNotice({ text:error instanceof Error ? error.message : 'Não foi possível carregar este salvamento.' }) }
  }
  async function doDelete(slot: string) { await deleteSave(slot); setSaves(await listSaves()) }

  const modal = ui.modal && <div className={styles.modalBackdrop} onMouseDown={event => { if (event.target === event.currentTarget) ui.setModal(null) }}><div className={styles.modal} role="dialog" aria-label={ui.modal === 'save' ? 'Salvar campanha' : 'Carregar campanha'}>
    <button className={styles.modalClose} onClick={() => ui.setModal(null)} aria-label="Fechar janela">×</button>
    <span className={styles.eyebrow}>CAMPANHAS DE VAREDOR</span><h1>{ui.modal === 'save' ? 'Salvar campanha' : 'Carregar campanha'}</h1>
    {ui.modal === 'save' ? <><label>Nome do salvamento<input value={slotName} onChange={event => setSlotName(event.target.value)} aria-label="Nome do salvamento"/></label><button className={styles.primary} onClick={doSave}>Salvar campanha</button></>
      : <div className={styles.saveList}>{saves.length ? saves.map(save => <div key={save.slot}><button onClick={() => doLoad(save.slot)}><strong>{save.slot === 'autosave' ? 'Salvamento automático' : save.slot}</strong><small>{save.game.world.houses.find(h => h.id === save.game.playerHouseId)?.name} · {longDate(save.game.day)}</small></button><button onClick={() => doDelete(save.slot)} aria-label={`Excluir ${save.slot}`}>×</button></div>) : <p>Não há campanhas salvas neste navegador.</p>}</div>}
  </div></div>
  const toast = notice && <button className={styles.toast} onClick={() => { if (notice.provinceId) ui.focusProvince(notice.provinceId); setNotice(null) }} aria-live="polite">{notice.text}</button>

  if (screen !== 'game' || !game) return <div className={styles.app}>
    {screen === 'creation' && base ? <HouseCreation base={base} onFound={found} onCancel={() => { setScreen(gameRef.current ? 'game' : 'title'); setBase(null) }}/>
      : <div className={styles.title}>
        <div className={styles.titleCard}>
          <span className={styles.eyebrow}>TERRA</span>
          <h1>Herdeiros do Juramento</h1>
          <p>Um mundo gigante. Três formas de jogar. Uma interface simples.</p>
          <div className={styles.titleModes}><span>Descobrir o mundo</span><span>Influenciar as pessoas</span><span>Conquistar o poder</span></div>
          {hasAutosave && <button className={styles.primary} onClick={() => doLoad('autosave')}>Continuar campanha</button>}
          <button className={hasAutosave ? styles.secondary : styles.primary} onClick={startCreation} disabled={preparing}>{preparing ? 'Preparando Varedor…' : 'Nova Campanha'}</button>
          <button className={styles.secondary} onClick={() => openModal('load')}>Carregar campanha</button>
        </div>
      </div>}
    {modal}{toast}
  </div>

  const world = game.world
  const player = world.houses.find(h => h.id === game.playerHouseId)!
  const seat = world.provinces.find(p => p.id === player.seatProvinceId)!
  const balance = economicBalance(game)
  const unread = game.campaign.notifications.filter(n => !n.read).length
  const panelVisible = !ui.panelCollapsed && (!viewport.compact || !!ui.selectedProvinceId || !!ui.selectedCharacterId || ui.mode !== 'descobrir')
  const inset: MapInset = !panelVisible ? { right:0, bottom:0 } : viewport.portraitPhone ? { right:0, bottom:viewport.height * .46 } : { right:viewport.landscapePhone ? Math.min(340, viewport.width * .44) : 392, bottom:0 }
  const openNotification = (n: Notification) => { setGame(readNotification(game, n.id)); if (n.provinceId) ui.focusProvince(n.provinceId); setFeedOpen(false) }
  const resources: [IconName, string, number, number][] = [['gold', 'Ouro', player.gold, balance.gold], ['food', 'Alimentos', player.stock.food, balance.food], ['wood', 'Madeira', player.stock.wood, balance.wood], ['iron', 'Ferro', player.stock.iron, balance.iron], ['influence', 'Influência', player.influence, 0]]

  return <div className={styles.app} data-mode={ui.mode}>
    <MapView game={game} inset={inset}/>

    <header className={styles.hud}>
      <button className={styles.houseButton} onClick={() => setMenuOpen(true)} aria-label="Abrir menu"><Crest heraldry={game.campaign.customization.heraldry} size={viewport.compact ? 28 : 34}/><span><strong>{player.name}</strong><small>{seat.name}</small></span></button>
      <div className={styles.resources}>{resources.map(([icon, label, value, delta]) => <span key={label} className={styles.resource} title={`${label}: ${fmt(value)}${delta ? ` (${signed(delta)}/mês)` : ''}`} data-resource={icon}><Icon name={icon} size={15}/><strong>{fmt(value)}</strong>{delta !== 0 && !viewport.compact && <small className={delta > 0 ? styles.up : styles.down}>{signed(delta)}</small>}<em>{label}</em></span>)}</div>
      <div className={styles.clock}>
        <span className={styles.date} title={longDate(game.day)}>{viewport.compact ? shortDate(game.day) : longDate(game.day)}</span>
        <div className={styles.speeds}>{([['Pausar', 0, 'Ⅱ'], ['Velocidade normal', 1, '▶'], ['Rápido', 2, '▶▶'], ['Muito rápido', 3, '▶▶▶']] as const).map(([title, speed, glyph]) => <button key={speed} title={title} aria-label={title} aria-pressed={game.speed === speed} className={game.speed === speed ? styles.active : ''} onClick={() => setGame({ ...gameRef.current!, speed })}>{glyph}</button>)}</div>
        <button className={styles.bell} onClick={() => setFeedOpen(!feedOpen)} aria-label={`Notificações (${unread} não lidas)`}><Icon name="bell" size={18}/>{unread > 0 && <b>{unread > 99 ? '99+' : unread}</b>}</button>
      </div>
    </header>

    {feedOpen && <aside className={styles.feed} aria-label="Notificações">
      <div className={styles.feedHeader}><strong>Acontecimentos</strong><button onClick={() => setGame(readAllNotifications(game))}>Marcar como lidas</button><button onClick={() => setFeedOpen(false)} aria-label="Fechar notificações">×</button></div>
      <div className={styles.feedList}>{game.campaign.notifications.length ? game.campaign.notifications.slice(-40).reverse().map(n => <button key={n.id} className={`${n.read ? '' : styles.unread} ${n.important ? styles.importantNote : ''}`} onClick={() => openNotification(n)}><small>{longDate(n.day)}</small><strong>{n.title}</strong><span>{n.text}</span></button>) : <p>Nada a relatar por enquanto.</p>}</div>
    </aside>}

    {panelVisible ? <aside className={`${styles.panel} ${viewport.portraitPhone ? styles.sheet : ''}`} aria-label="Painel contextual" data-panel={ui.mode}>
      <div className={styles.panelHeader}><span>{ui.mode.toUpperCase()}</span>{ui.selectedProvinceId && <button onClick={() => ui.selectProvince(null)} aria-label="Limpar seleção">Limpar</button>}<button onClick={() => ui.setPanelCollapsed(true)} aria-label="Recolher painel">{viewport.portraitPhone ? '▾' : '›'}</button></div>
      <div className={styles.panelContent} key={`${ui.mode}-${ui.selectedProvinceId}-${ui.selectedCharacterId}`}>
        {ui.mode === 'descobrir' && <DiscoverPanel game={game} act={act}/>}
        {ui.mode === 'influenciar' && <InfluencePanel game={game} act={act} onVisitCastle={() => setScene('castelo')}/>}
        {ui.mode === 'conquistar' && <ConquerPanel game={game}/>}
      </div>
    </aside> : <button className={styles.panelTab} onClick={() => ui.setPanelCollapsed(false)} title="Abrir painel">{ui.mode === 'descobrir' ? `Expedições ${game.campaign.expeditions.filter(e => !e.completed).length}/2` : 'Painel'} ‹</button>}

    <nav className={styles.modeBar} aria-label="Modos de jogo">{MODES.map(([mode, label, icon]) => <button key={mode} className={ui.mode === mode ? styles.modeActive : ''} aria-pressed={ui.mode === mode} onClick={() => ui.setMode(mode)}><Icon name={icon} size={viewport.compact ? 18 : 22}/><span>{label}</span></button>)}</nav>

    {menuOpen && <><button className={styles.scrim} aria-label="Fechar menu" onClick={() => setMenuOpen(false)}/><aside className={styles.drawer} aria-label="Menu da campanha">
      <div className={styles.drawerHeader}><Crest heraldry={game.campaign.customization.heraldry} size={44}/><div><small>CASA</small><h1>{player.name}</h1><span>{longDate(game.day)}</span></div><button onClick={() => setMenuOpen(false)} aria-label="Fechar menu">×</button></div>
      <div className={styles.drawerBody}>
        <p className={styles.motto}>“{player.motto}”</p>
        <button className={styles.menuItem} onClick={() => { ui.setMode('influenciar'); ui.selectProvince(seat.id); ui.focusProvince(seat.id); setMenuOpen(false) }}>Pontevela</button>
        <button className={styles.menuItem} onClick={() => { setScene('castelo'); setMenuOpen(false) }}>Castelo da Ponte Alta</button>
        <button className={styles.menuItem} onClick={() => { setScene('cronica'); setMenuOpen(false) }}>Crônica</button>
        <h2>Campanha</h2>
        <button className={styles.menuItem} onClick={() => openModal('save')}>Salvar</button>
        <button className={styles.menuItem} onClick={() => openModal('load')}>Carregar</button>
        <button className={styles.menuItem} onClick={startCreation}>{preparing ? 'Preparando…' : 'Nova campanha'}</button>
        <h2>Como jogar</h2>
        <p className={styles.help}><b>Descobrir</b>: envie expedições às fronteiras destacadas e emissários às casas encontradas. <b>Influenciar</b>: administre Pontevela, converse com nobres e contrate espiões. <b>Conquistar</b>: consulte forças e guarnições (batalhas em desenvolvimento). O tempo avança pelos controles no topo e pausa sozinho quando algo importante acontece.</p>
      </div>
    </aside></>}

    {scene && <div className={styles.sceneBackdrop}><section className={styles.scene}><button className={styles.sceneClose} onClick={() => setScene(null)} aria-label="Voltar ao mapa">×</button>
      {scene === 'castelo' ? <><span className={styles.eyebrow}>{player.name.toUpperCase()} · PONTEVELA</span><h1>Castelo da Ponte Alta</h1><div className={styles.castleScene}><img src="/assets/pontevela-audience.png" alt="Intendente no salão de Pontevela, diante da lareira e do vale do rio"/></div>
        <LocalAudience game={game} onChoose={choice => act(g => resolvePontevelaAudience(g, choice))}/>
        <div className={styles.sceneGrid}><div><h2>Domínio</h2><div className={styles.sceneRow}><span>Casa</span><strong>{player.name}</strong></div><div className={styles.sceneRow}><span>População</span><strong>{fmt(seat.population)}</strong></div><div className={styles.sceneRow}><span>Lealdade</span><strong>{seat.loyalty}%</strong></div><div className={styles.sceneRow}><span>Assentamentos</span><strong>{seat.settlementIds.length}</strong></div></div>
          <div><h2>Crônica local</h2>{world.history.filter(r => r.entityIds.includes(seat.id)).slice(-4).reverse().map(record => <p key={record.id} className={styles.record}><small>{longDate(record.day)}</small>{record.description}</p>)}</div></div></>
        : <><span className={styles.eyebrow}>MEMÓRIA DE VAREDOR</span><h1>Crônica</h1><div className={styles.history}>{[...world.history].reverse().slice(0, 200).map(record => <p key={record.id} className={styles.record}><small>{longDate(record.day)}</small>{record.description}</p>)}</div></>}
    </section></div>}
    {modal}{toast}
  </div>
}
