import { useEffect, useMemo, useState } from 'react'
import { dateFromDay } from '../engine/calendar'
import { createGame } from '../engine/world'
import { advanceGame } from '../engine/simulation'
import { PONTEVELA_AUDIENCE_ID, resolvePontevelaAudience, type PontevelaChoice } from '../engine/audience'
import { deleteSave, listSaves, loadGame, saveGame, type SaveSlot } from '../engine/persistence'
import type { GameState, Province } from '../engine/types'
import MapView from './MapView'
import { useUI } from './store'
import styles from './App.module.css'

type Screen = 'mapa' | 'territorio' | 'casa' | 'cronica'
const money = (value:number) => new Intl.NumberFormat('pt-BR').format(value)

function Crest({ symbol, color }: { symbol:string; color:string }) {
  return <span className={styles.crest} style={{'--crest':color} as React.CSSProperties}>{symbol}</span>
}
function Row({ label, value }: {label:string;value:React.ReactNode}) {
  return <div className={styles.row}><span>{label}</span><strong>{value}</strong></div>
}
function LocalAudience({game,onChoose}:{game:GameState;onChoose:(choice:PontevelaChoice)=>void}) {
  const outcome=game.world.history.find(record => record.id === PONTEVELA_AUDIENCE_ID)
  return <div className={styles.audience}><span className={styles.eyebrow}>AUDIÊNCIA NO CASTELO</span><h2>Intendente dos Celeiros</h2>{outcome ? <p>{outcome.description}</p> : <><p>“Os barqueiros pedem ajuda antes da cheia. Temos cento e vinte sacas disponíveis. Que destino lhes damos?”</p><div className={styles.audienceChoices}><button onClick={() => onChoose('distribuir')}>Distribuir mantimentos <small>−120 alimentos · +4 lealdade · +2 prestígio</small></button><button onClick={() => onChoose('vender')}>Vender aos mercadores <small>−120 alimentos · +90 ouro · −2 lealdade</small></button></div></>}</div>
}

export default function App() {
  const [game,setGame] = useState<GameState>(() => createGame())
  const [drawerOpen,setDrawerOpen] = useState(false)
  const [screen,setScreen] = useState<Screen>('mapa')
  const [notice,setNotice] = useState<string|null>(null)
  const [saves,setSaves] = useState<SaveSlot[]>([])
  const [slotName,setSlotName] = useState('Campanha de Serraval')
  const ui = useUI()
  const world = game.world
  const player = world.houses.find(house => house.id === game.playerHouseId)!
  const seat = world.provinces.find(province => province.id === player.seatProvinceId)!
  const date = dateFromDay(game.day)
  const realm = world.realms.find(item => item.id === ui.selectedRealmId)
  const fief = world.fiefs.find(item => item.id === ui.selectedFiefId)
  const province = world.provinces.find(item => item.id === ui.selectedProvinceId)
  const selectedSettlement = world.settlements.find(item => item.id === ui.selectedSettlementId)
  const contextOpen = screen === 'mapa' && ui.level !== 'reinos'
  const localHistory = useMemo(() => world.history.filter(record => record.entityIds.includes(player.id) || record.entityIds.includes(seat.id)), [world,player.id,seat.id])

  useEffect(() => { loadGame('autosave').then(saved => { if(saved) { setGame({...saved,speed:0}); setNotice('Campanha recuperada.') } }).catch(() => {}) },[])
  useEffect(() => {
    if(game.speed === 0) return
    const delays = {1:3000,2:1000,3:300}
    const interval = window.setInterval(() => setGame(previous => advanceGame(previous)),delays[game.speed])
    return () => window.clearInterval(interval)
  },[game.speed])
  useEffect(() => { if(game.day > 0 && game.day % 30 === 0) saveGame('autosave',game).catch(() => setNotice('Falha no salvamento automático.')) },[game.day])
  useEffect(() => { if(!notice) return; const timer=window.setTimeout(() => setNotice(null),4200); return () => window.clearTimeout(timer) },[notice])

  function resetMap() { ui.resetMap(); setScreen('mapa'); setDrawerOpen(false) }
  function enterProvince(target:Province) { ui.selectProvince(target.id,target.fiefId,target.realmId); setScreen('mapa'); setDrawerOpen(false) }
  function openScreen(next:Screen) { setScreen(next); setDrawerOpen(false) }
  async function openModal(modal:'save'|'load'|'new') { if(modal !== 'new') setSaves(await listSaves().catch(() => [])); ui.setModal(modal); setDrawerOpen(false) }
  async function doSave() { const slot=slotName.trim(); if(!slot) return; try { await saveGame(slot,game); setSaves(await listSaves()); ui.setModal(null); setNotice(`Campanha salva em “${slot}”.`) } catch { setNotice('Não foi possível salvar a campanha.') } }
  async function doLoad(slot:string) { try { const loaded=await loadGame(slot); if(loaded) { setGame({...loaded,speed:0}); resetMap(); ui.setModal(null); setNotice(`Campanha “${slot}” carregada.`) } } catch { setNotice('Não foi possível carregar este salvamento.') } }
  async function doDelete(slot:string) { await deleteSave(slot); setSaves(await listSaves()) }
  function newGame() { setGame(createGame()); resetMap(); ui.setModal(null); setNotice('Nova campanha iniciada.') }

  return <div className={styles.app}>
    <MapView world={world}/>
    <button className={styles.menuToggle} aria-label="Abrir menu" title="Abrir menu" onClick={() => setDrawerOpen(true)}><Crest symbol={player.symbol} color={player.color}/></button>
    {contextOpen && <aside className={styles.context} aria-label="Detalhes do território">
      <div className={styles.contextHeader}><span>HERDEIROS DO JURAMENTO</span><button onClick={resetMap} aria-label="Fechar detalhes">×</button></div>
      {ui.level === 'feudos' && realm && <>
        <div className={styles.identity}><Crest symbol={world.houses.find(house => house.id === realm.royalHouseId)?.symbol || '♜'} color={realm.color}/><div><small>REINO</small><h1>{realm.name}</h1><p>{realm.motto}</p></div></div>
        <div className={styles.panelBody}><Row label="Casa real" value={world.houses.find(house => house.id === realm.royalHouseId)?.name}/><Row label="Capital" value={realm.capital}/><Row label="Feudos" value={realm.fiefIds.length}/><p className={styles.description}>{realm.culture}. {realm.specialty}.</p><h2>Feudos do reino</h2><div className={styles.territoryList}>{world.fiefs.filter(item => item.realmId === realm.id).map(item => <button key={item.id} onClick={() => ui.selectFief(item.id,item.realmId)}><span>♜</span><strong>{item.name}</strong><small>{item.provinceIds.length} províncias ›</small></button>)}</div></div>
      </>}
      {ui.level === 'provincias' && fief && <>
        <button className={styles.back} onClick={() => ui.selectRealm(fief.realmId)}>‹ Reino de {realm?.name}</button>
        <div className={styles.identity}><Crest symbol="♜" color={realm?.color || '#9a7650'}/><div><small>FEUDO</small><h1>{fief.name}</h1><p>{realm?.name}</p></div></div>
        <div className={styles.panelBody}><Row label="Casa governante" value={world.houses.find(house => house.id === fief.grandHouseId)?.name}/><Row label="Capital" value={world.provinces.find(item => item.id === fief.capitalProvinceId)?.name}/><Row label="Províncias" value={fief.provinceIds.length}/><h2>Territórios</h2><div className={styles.territoryList}>{fief.provinceIds.map(id => world.provinces.find(item => item.id === id)!).map(item => <button key={item.id} onClick={() => enterProvince(item)}><span>◆</span><strong>{item.name}</strong><small>{item.terrain} ›</small></button>)}</div></div>
      </>}
      {ui.level === 'assentamentos' && province && <>
        <button className={styles.back} onClick={() => ui.selectFief(province.fiefId,province.realmId)}>‹ {fief?.name}</button>
        <div className={styles.identity}><Crest symbol={world.houses.find(house => house.id === province.legalHouseId)?.symbol || '◆'} color={realm?.color || '#9a7650'}/><div><small>PROVÍNCIA</small><h1>{province.name}</h1><p>{fief?.name} · {realm?.name}</p></div></div>
        <div className={styles.panelBody}><Row label="Casa titular" value={world.houses.find(house => house.id === province.legalHouseId)?.name}/><Row label="Administração" value={world.houses.find(house => house.id === province.governingHouseId)?.name}/><Row label="Ocupação" value={province.occupyingHouseId ? world.houses.find(house => house.id === province.occupyingHouseId)?.name : 'Nenhuma'}/><Row label="Suserano" value={world.houses.find(house => house.id === province.liegeHouseId)?.name}/><Row label="População" value={money(province.population)}/><Row label="Lealdade" value={`${province.loyalty}%`}/><Row label="Terreno" value={province.terrain}/>
          {province.id === seat.id && <button className={styles.primary} onClick={() => openScreen('territorio')}>Entrar em Pontevela ›</button>}
          <h2>Assentamentos</h2><div className={styles.territoryList}>{province.settlementIds.map(id => world.settlements.find(item => item.id === id)!).map(item => <button className={selectedSettlement?.id === item.id ? styles.selected : ''} key={item.id} onClick={() => ui.selectSettlement(item.id)}><span>{item.type === 'castelo' ? '♜' : item.type === 'porto' ? '⚓' : '⌂'}</span><strong>{item.name}</strong><small>{item.type} ›</small></button>)}</div>
          {selectedSettlement && <div className={styles.settlementInfo}><h2>{selectedSettlement.name}</h2><Row label="Tipo" value={selectedSettlement.type}/><Row label="Habitantes" value={money(selectedSettlement.population)}/><Row label="Guarnição" value={money(selectedSettlement.garrison)}/><Row label="Defesa" value={selectedSettlement.defense}/></div>}
        </div>
      </>}
    </aside>}
    {drawerOpen && <><button className={styles.scrim} aria-label="Fechar menu" onClick={() => setDrawerOpen(false)}/><aside className={styles.drawer} aria-label="Menu da campanha"><div className={styles.drawerHeader}><Crest symbol={player.symbol} color={player.color}/><div><small>CASA</small><h1>{player.name}</h1><span>{date.season} · Dia {date.dayOfSeason} · {date.year} AP</span></div><button onClick={() => setDrawerOpen(false)} aria-label="Fechar menu">×</button></div><div className={styles.drawerBody}><h2>Campanha</h2><Row label="Ouro" value={money(player.gold)}/><Row label="Alimentos" value={money(player.stock.food)}/><Row label="Madeira" value={money(player.stock.wood)}/><Row label="Ferro" value={money(player.stock.iron)}/><Row label="Mobilizáveis" value={money(player.mobilizable)}/><h2>Tempo</h2><div className={styles.timeControls}>{([['Pausar',0,'Ⅱ'],['Velocidade normal',1,'▶'],['Rápido',2,'▶▶'],['Muito rápido',3,'▶▶▶']] as const).map(([title,speed,glyph]) => <button key={speed} title={title} className={game.speed === speed ? styles.active : ''} onClick={() => setGame(previous => ({...previous,speed}))}>{glyph}</button>)}</div><h2>Explorar</h2><button className={styles.menuItem} onClick={resetMap}>Mapa de Varedor</button><button className={styles.menuItem} onClick={() => enterProvince(seat)}>Pontevela</button><button className={styles.menuItem} onClick={() => openScreen('casa')}>Casa Serraval</button><button className={styles.menuItem} onClick={() => openScreen('cronica')}>Crônica</button><h2>Camada do mapa</h2><button className={styles.menuItem} onClick={() => {ui.setMode('politico');setDrawerOpen(false)}}>Reinos</button><button className={styles.menuItem} onClick={() => {ui.setMode('casas');setDrawerOpen(false)}}>Casas</button><button className={styles.menuItem} onClick={() => {ui.setMode('terreno');setDrawerOpen(false)}}>Terreno</button><h2>Campanha</h2><button className={styles.menuItem} onClick={() => openModal('save')}>Salvar</button><button className={styles.menuItem} onClick={() => openModal('load')}>Carregar</button><button className={styles.menuItem} onClick={() => openModal('new')}>Nova campanha</button></div></aside></>}
    {screen !== 'mapa' && <div className={styles.sceneBackdrop}><section className={styles.scene}><button className={styles.sceneClose} onClick={() => setScreen('mapa')} aria-label="Voltar ao mapa">×</button>{screen === 'territorio' ? <><span className={styles.eyebrow}>CASA SERRAVAL · PONTEVELA</span><h1>Castelo da Ponte Alta</h1><div className={styles.castleScene}><img src="/assets/pontevela-audience.png" alt="Intendente no salão de Pontevela, diante da lareira e do vale do rio"/></div><LocalAudience game={game} onChoose={choice => setGame(previous => resolvePontevelaAudience(previous,choice))}/><div className={styles.sceneGrid}><div><h2>Domínio</h2><Row label="Casa" value={player.name}/><Row label="População" value={money(seat.population)}/><Row label="Lealdade" value={`${seat.loyalty}%`}/><Row label="Assentamentos" value={seat.settlementIds.length}/></div><div><h2>Crônica local</h2>{localHistory.slice(-4).reverse().map(record => <p key={record.id} className={styles.record}><small>{dateFromDay(record.day).season}, {dateFromDay(record.day).year} AP</small>{record.description}</p>)}</div></div><button className={styles.primary} onClick={() => enterProvince(seat)}>Ver província no mapa</button></> : screen === 'casa' ? <><span className={styles.eyebrow}>LINHAGEM E PODER</span><h1>{player.name}</h1><p>{player.motto}</p><div className={styles.sceneGrid}><div><h2>Título e juramento</h2><Row label="Sede" value={seat.name}/><Row label="Suserano" value={world.houses.find(house => house.id === seat.liegeHouseId)?.name}/><Row label="Prestígio" value={player.prestige}/><Row label="Influência" value={player.influence}/></div><div><h2>Recursos</h2><Row label="Ouro" value={money(player.gold)}/><Row label="Alimentos" value={money(player.stock.food)}/><Row label="Mobilizáveis" value={money(player.mobilizable)}/></div></div></> : <><span className={styles.eyebrow}>MEMÓRIA DE VAREDOR</span><h1>Crônica</h1><div className={styles.history}>{[...world.history].reverse().map(record => <p key={record.id} className={styles.record}><small>{dateFromDay(record.day).season}, {dateFromDay(record.day).year} AP</small>{record.description}</p>)}</div></>}</section></div>}
    {notice && <div className={styles.toast}>{notice}</div>}
    {ui.modal && <div className={styles.modalBackdrop} onMouseDown={event => { if(event.target === event.currentTarget) ui.setModal(null) }}><div className={styles.modal}><button className={styles.modalClose} onClick={() => ui.setModal(null)} aria-label="Fechar janela">×</button><span className={styles.eyebrow}>CAMPANHAS DE VAREDOR</span><h1>{ui.modal === 'new' ? 'Nova campanha' : ui.modal === 'save' ? 'Salvar campanha' : 'Carregar campanha'}</h1>{ui.modal === 'new' ? <><p>Uma nova campanha começará com a Casa Serraval na Primavera do ano 128 AP.</p><button className={styles.primary} onClick={newGame}>Iniciar como Casa Serraval</button></> : ui.modal === 'save' ? <><label>Nome do salvamento<input value={slotName} onChange={event => setSlotName(event.target.value)} aria-label="Nome do salvamento"/></label><button className={styles.primary} onClick={doSave}>Salvar campanha</button></> : <div className={styles.saveList}>{saves.length ? saves.map(save => <div key={save.slot}><button onClick={() => doLoad(save.slot)}><strong>{save.slot}</strong><small>{dateFromDay(save.game.day).season}, {dateFromDay(save.game.day).year} AP</small></button><button onClick={() => doDelete(save.slot)} aria-label={`Excluir ${save.slot}`}>×</button></div>) : <p>Não há campanhas salvas neste navegador.</p>}</div>}</div></div>}
  </div>
}
