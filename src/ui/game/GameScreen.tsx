import { useEffect, useMemo, useRef, useState } from 'react'
import type { GameState, Id } from '../../engine/types'
import { RESOURCES, STOCK_KEY } from '../../engine/types'
import type { SaveSlot } from '../../engine/persistence'
import { economicBalance } from '../../engine/economy'
import { ascension, isGrandLord, liegeHouse } from '../../engine/politics'
import { openDecisions } from '../../engine/decisions'
import { dateFromDay } from '../../engine/calendar'
import { knowledge } from '../../engine/knowledge'
import { endTurn } from '../../engine/turns'
import { moveParty, partyReach, playerParty } from '../../engine/party'
import MapView, { mapZoom } from '../MapView'
import Crest from '../Heraldry'
import Icon, { ResourceIcon, type IconName } from '../Icons'
import { useUI, type Lens } from '../store'
import { fmt, signed, type Act } from '../parts'
import { goals, houseOf } from '../view'
import { sfx } from '../sfx'
import ProvinceCard from './ProvinceCard'
import PartyCard from './PartyCard'
import LensSummary from './LensSummary'
import { HousesSheet, PlanSheet, MenuSheet, ChronicleSheet } from './Sheets'
import { ConversationScene, NegotiationScene } from './Audience'
import { DecisionScene, BattleScene, IntroScene } from './Scenes'
import styles from './Game.module.css'

export interface Notice { title: string; text: string; provinceId?: Id | null; important?: boolean; error?: boolean }
export interface SaveIO { save: (slot: string) => Promise<void>; list: () => Promise<SaveSlot[]>; load: (slot: string) => Promise<void>; remove: (slot: string) => Promise<void>; newCampaign: () => void }
const LENSES: [Lens, string, IconName][] = [['territorio', 'Território', 'territorio'], ['diplomacia', 'Diplomacia', 'diplomacia'], ['militar', 'Militar', 'militar'], ['influencia', 'Influência', 'influencia']]
const TONE: Record<string, string> = { gold: '#d4ab52', teal: '#5fb3bd', green: '#86ad6f', red: '#e0644d', grey: '#a89d85' }

/** Remembers each counter and briefly shows how much it just changed. */
function useDeltas(values: Record<string, number>) {
  const prev = useRef(values), [shown, setShown] = useState<Record<string, { n: number; id: number }>>({})
  useEffect(() => {
    const next: Record<string, { n: number; id: number }> = {}
    for (const [k, v] of Object.entries(values)) if (prev.current[k] !== undefined && v !== prev.current[k]) next[k] = { n: v - prev.current[k], id: Date.now() + Math.random() }
    prev.current = values
    if (!Object.keys(next).length) return
    if ((next.gold?.n ?? 0) > 0) sfx.coins()
    setShown(s => ({ ...s, ...next }))
    const t = window.setTimeout(() => setShown(s => { const c = { ...s }; for (const k of Object.keys(next)) if (c[k]?.id === next[k].id) delete c[k]; return c }), 2700)
    return () => window.clearTimeout(t)
  }, [JSON.stringify(values)]) // eslint-disable-line react-hooks/exhaustive-deps
  return (k: string) => shown[k] ? <i key={shown[k].id} className={`${styles.delta} ${shown[k].n > 0 ? styles.plus : styles.minus}`}>{shown[k].n > 0 ? '+' : '−'}{fmt(Math.abs(shown[k].n))}</i> : null
}
export default function GameScreen({ game, setGame, act, notice, setNotice, io }: { game: GameState; setGame: (g: GameState) => void; act: Act; notice: Notice | null; setNotice: (n: Notice | null) => void; io: SaveIO }) {
  const ui = useUI()
  // Development-only handle for automated UI checks; stripped from production builds.
  if (import.meta.env.DEV) (window as unknown as { __terra: unknown }).__terra = { game, setGame }
  const player = houseOf(game, game.playerHouseId)
  const balance = economicBalance(game)
  const decisions = openDecisions(game)
  const asc = ascension(game)
  const party = playerParty(game)
  const reach = useMemo(() => ui.partyMode && !decisions.length ? partyReach(game) : null, [game, ui.partyMode, decisions.length])
  const [journal, setJournal] = useState(false)
  const delta = useDeltas({ gold: player.gold, renown: player.prestige, ...Object.fromEntries(RESOURCES.map(r => [r, player.stock[STOCK_KEY[r]]])) })
  const list = goals(game)
  // A fresh battle plays its scene once.
  useEffect(() => { if (game.campaign.battles.length > ui.seenBattles) { ui.markBattlesSeen(game.campaign.battles.length); ui.openSheet({ kind: 'battle', battleId: game.campaign.battles.at(-1)!.id }) } }, [game.campaign.battles.length]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!notice) return; const t = window.setTimeout(() => setNotice(null), notice.important ? 9000 : 5200); return () => window.clearTimeout(t) }, [notice]) // eslint-disable-line react-hooks/exhaustive-deps
  const date = dateFromDay(game.day)
  const rank = isGrandLord(game) ? 'grão-lorde' : 'lorde'
  const select = (id: Id | null) => { ui.setPartyMode(false); ui.select(id) }
  const selected = ui.selectedProvinceId
  const finish = () => {
    const from = game.campaign.notifications.length, turn = game.campaign.turn
    ui.select(null); ui.setPartyMode(false); sfx.horn()
    act(g => endTurn(g))
    ui.setReport({ turn, from })
  }
  // With moves left the markers stay; otherwise the card of where Irian stopped opens.
  const move = (id: Id) => act(g => { sfx.step(); const next = moveParty(g, id); if (playerParty(next).moves === 0) { ui.setPartyMode(false); ui.select(id) } return next })
  const report = ui.report ? game.campaign.notifications.slice(ui.report.from) : []

  return <div className={styles.screen} data-lens={ui.lens}>
    <MapView game={game} lens={ui.lens} selectedId={selected} resourceFilter={ui.resourceFilter} focus={ui.focus} onSelect={select}
      reach={reach} onMove={move} onParty={() => { ui.select(null); ui.setPartyMode(!ui.partyMode) }} onBand={(_, provinceId) => select(provinceId)}/>

    <header className={styles.top}>
      <button className={styles.house} onClick={() => ui.openSheet({ kind: 'menu' })} aria-label="Abrir menu">
        <Crest heraldry={game.campaign.customization.heraldry} size={30}/>
        <span><strong>{player.name}</strong><small>{rank} irian</small></span>
      </button>
      <div className={styles.mid}>
        <button className={styles.goal} onClick={() => ui.openSheet({ kind: 'houses' })} title="Ambição">
          <span className={styles.rank}>{rank}</span>
          <span className={styles.steps}>{[0, 1, 2, 3].map(i => <i key={i} className={i < (isGrandLord(game) ? 2 : 1) ? styles.on : ''}/>)}</span>
          <span className={styles.next}>{isGrandLord(game) ? `Próximo: o trono de ${game.world.realms.find(r => r.id === player.realmId)!.name}` : `Grão-lorde: ${asc.support} de ${asc.needed} casas${asc.recognised ? ' · reconhecido' : ''}`}</span>
        </button>
        <button className={styles.housesBtn} onClick={() => ui.openSheet({ kind: 'houses' })}><Icon name="houses" size={15}/>Casas{game.campaign.vassals.length > 0 && <b>{game.campaign.vassals.length}</b>}</button>
      </div>
      <div className={styles.res} aria-label="Recursos">
        <span title={`Ouro (${signed(balance.gold)}/mês)`}><Icon name="gold" size={15}/>{fmt(player.gold)}{delta('gold')}</span>
        <span title="Renome: a moeda política. Recrutar, casar e ousar custam renome." className={styles.renown}><Icon name="renown" size={15}/>{fmt(player.prestige)}{delta('renown')}</span>
        {RESOURCES.map(r => { const v = player.stock[STOCK_KEY[r]]; return <span key={r} title={r} className={v === 0 ? styles.zero : ''}><ResourceIcon resource={r} size={15}/>{fmt(v)}{delta(r)}</span> })}
      </div>
      <div className={styles.turnBox} aria-label="Turno">
        <span className={styles.date}>Turno {game.campaign.turn}<small>{date.dayOfSeason} de {date.season}</small></span>
        <span className={styles.seals} title="Ordens: ações à distância neste turno. O que Irian faz em pessoa é de graça.">{Array.from({ length: 3 }, (_, i) => <i key={i} className={i < game.campaign.orders ? styles.on : ''}/>)}</span>
      </div>
    </header>

    {game.campaign.politics.stage === 'guerra' && <div className={styles.warBanner}>Guerra com a {liegeHouse(game).name}</div>}
    {ui.report && report.length > 0 && !selected && !ui.partyMode ? <aside className={styles.report} data-ui aria-label="Relatório do turno">
      <header><span className={styles.k}>turno {ui.report.turn} · o que aconteceu</span><button onClick={() => ui.setReport(null)} aria-label="Fechar relatório"><Icon name="close" size={14}/></button></header>
      <div>{report.slice(-12).map(n => <button key={n.id} className={n.important ? styles.important : ''} onClick={() => { if (n.provinceId && knowledge(game, n.provinceId) >= 1) ui.focusProvince(n.provinceId) }}><b>{n.title}</b><span>{n.text}</span></button>)}</div>
    </aside> : !ui.partyMode && <LensSummary game={game} lens={ui.lens} filter={ui.resourceFilter} setFilter={ui.setResourceFilter}/>}
    {selected && <ProvinceCard key={`${selected}-${ui.lens}`} game={game} provinceId={selected} lens={ui.lens} act={act} onClose={() => select(null)}/>}
    {!selected && ui.partyMode && <PartyCard game={game} act={act} onClose={() => ui.setPartyMode(false)}/>}

    <footer className={styles.bottom}>
      <div className={`${styles.journal} ${journal ? styles.open : ''}`} aria-label="Diário">
        <button className={styles.journalHead} onClick={() => setJournal(!journal)}><Icon name="book" size={14}/>Diário<small>{list.length}</small></button>
        <div className={styles.goals}>{(journal ? list : list.slice(0, 2)).map((g, i) => <button key={i} style={{ ['--c' as string]: TONE[g.tone] }} onClick={() => { if (g.provinceId && knowledge(game, g.provinceId) >= 1) ui.focusProvince(g.provinceId) }}><b>{g.text}</b><span>{g.detail}</span></button>)}
          {!list.length && <span className={styles.calm}>Tudo calmo. Leve Irian pelo mapa.</span>}</div>
      </div>
      <button className={`${styles.partyBtn} ${ui.partyMode ? styles.on : ''}`} onClick={() => { ui.select(null); ui.setPartyMode(!ui.partyMode) }} aria-label="Comitiva de Irian"><Icon name="militar" size={17}/><span>Comitiva<small>{party.men} homens · {party.moves} mov.</small></span></button>
      <div className={styles.lenses} role="tablist" aria-label="Visões do mapa">
        {LENSES.map(([id, label, icon]) => <button key={id} role="tab" aria-selected={ui.lens === id} onClick={() => ui.setLens(id)}><Icon name={icon} size={19}/>{label}</button>)}
      </div>
      <button className={styles.endTurn} onClick={finish} disabled={decisions.length > 0} aria-label="Encerrar turno"><span>Encerrar turno</span><small>{decisions.length ? 'decida antes' : '+7 dias'}</small></button>
    </footer>
    <div className={styles.zoom}><button onClick={() => mapZoom('in')} aria-label="Aproximar"><Icon name="plus" size={16}/></button><button onClick={() => mapZoom('out')} aria-label="Afastar"><Icon name="minus" size={16}/></button></div>

    <div className={styles.rotate} data-ui><Icon name="territorio" size={34}/><b>Gire o celular</b><span>Varedor foi feito para a tela deitada.</span></div>
    {notice && <button className={`${styles.toast} ${notice.error ? styles.toastError : notice.important ? styles.toastImportant : ''}`} onClick={() => { if (notice.provinceId) ui.focusProvince(notice.provinceId); setNotice(null) }} aria-live="polite"><b>{notice.title}</b>{notice.text && <span>{notice.text}</span>}</button>}

    {ui.sheet?.kind === 'houses' && <HousesSheet game={game} onClose={() => ui.openSheet(null)} onPick={id => { ui.openSheet(null); ui.focusProvince(id) }}/>}
    {ui.sheet?.kind === 'conversation' && <ConversationScene game={game} characterId={ui.sheet.characterId} act={act} onClose={() => ui.openSheet(null)}/>}
    {ui.sheet?.kind === 'plan' && <PlanSheet game={game} provinceId={ui.sheet.provinceId} path={ui.sheet.path} onClose={() => ui.openSheet(null)} onLens={l => { ui.setLens(l); ui.openSheet(null) }}/>}
    {ui.sheet?.kind === 'negotiation' && <NegotiationScene game={game} negotiationId={ui.sheet.negotiationId} act={act} onClose={() => ui.openSheet(null)}/>}
    {ui.sheet?.kind === 'menu' && <MenuSheet game={game} io={io} onClose={() => ui.openSheet(null)} onChronicle={() => ui.openSheet({ kind: 'chronicle' })}/>}
    {ui.sheet?.kind === 'chronicle' && <ChronicleSheet game={game} onClose={() => ui.openSheet(null)} onPick={id => { ui.openSheet(null); ui.focusProvince(id) }}/>}
    {ui.sheet?.kind === 'battle' && <BattleScene game={game} battleId={ui.sheet.battleId} onClose={() => ui.openSheet(null)}/>}
    {!ui.introSeen && game.day === 0 && <IntroScene game={game} onStart={ui.seeIntro}/>}
    {!ui.sheet && decisions[0] && <DecisionScene key={decisions[0].id} game={game} decision={decisions[0]} act={act}/>}
  </div>
}
