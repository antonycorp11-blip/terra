import { useEffect, useRef, useState } from 'react'
import type { GameState, Id } from '../../engine/types'
import { RESOURCES, STOCK_KEY } from '../../engine/types'
import type { SaveSlot } from '../../engine/persistence'
import { economicBalance } from '../../engine/economy'
import { ascension, isGrandLord, liegeHouse } from '../../engine/politics'
import { openDecisions } from '../../engine/decisions'
import { dateFromDay } from '../../engine/calendar'
import { knowledge } from '../../engine/knowledge'
import MapView, { mapZoom } from '../MapView'
import Crest from '../Heraldry'
import Icon, { ResourceIcon, type IconName } from '../Icons'
import { useUI, type Lens } from '../store'
import { fmt, signed, daysLabel, type Act } from '../parts'
import { houseOf, upcoming } from '../view'
import ProvinceCard from './ProvinceCard'
import LensSummary from './LensSummary'
import { HousesSheet, PlanSheet, MenuSheet, ChronicleSheet } from './Sheets'
import { ConversationScene, NegotiationScene } from './Audience'
import { DecisionScene, BattleScene } from './Scenes'
import styles from './Game.module.css'

export interface Notice { title: string; text: string; provinceId?: Id | null; important?: boolean; error?: boolean }
export interface SaveIO { save: (slot: string) => Promise<void>; list: () => Promise<SaveSlot[]>; load: (slot: string) => Promise<void>; remove: (slot: string) => Promise<void>; newCampaign: () => void }
const LENSES: [Lens, string, IconName][] = [['territorio', 'Território', 'territorio'], ['diplomacia', 'Diplomacia', 'diplomacia'], ['militar', 'Militar', 'militar'], ['influencia', 'Influência', 'influencia']]
const TONE: Record<string, string> = { gold: '#d4ab52', teal: '#5fb3bd', green: '#86ad6f', red: '#e0644d', grey: '#a89d85' }

export default function GameScreen({ game, setGame, act, notice, setNotice, io }: { game: GameState; setGame: (g: GameState) => void; act: Act; notice: Notice | null; setNotice: (n: Notice | null) => void; io: SaveIO }) {
  const ui = useUI()
  // Development-only handle for automated UI checks; stripped from production builds.
  if (import.meta.env.DEV) (window as unknown as { __terra: unknown }).__terra = { game, setGame }
  const player = houseOf(game, game.playerHouseId)
  const balance = economicBalance(game)
  const decisions = openDecisions(game)
  const asc = ascension(game)
  const [tlWidth, setTlWidth] = useState(600)
  const tl = useRef<HTMLDivElement>(null)
  useEffect(() => { const el = tl.current; if (!el) return; const ro = new ResizeObserver(() => setTlWidth(el.clientWidth)); ro.observe(el); return () => ro.disconnect() }, [])
  // A fresh battle plays its scene once.
  useEffect(() => { if (game.campaign.battles.length > ui.seenBattles) { ui.markBattlesSeen(game.campaign.battles.length); ui.openSheet({ kind: 'battle', battleId: game.campaign.battles.at(-1)!.id }) } }, [game.campaign.battles.length]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!notice) return; const t = window.setTimeout(() => setNotice(null), notice.important ? 9000 : 5200); return () => window.clearTimeout(t) }, [notice]) // eslint-disable-line react-hooks/exhaustive-deps
  const setSpeed = (speed: 0 | 1 | 2 | 3) => setGame({ ...game, speed })
  const date = dateFromDay(game.day)
  const pins = upcoming(game).filter(p => p.day - game.day <= 30).slice(0, tlWidth < 560 ? 3 : 6)
  const span = 36
  const rank = isGrandLord(game) ? 'grão-lorde' : 'lorde'
  const select = (id: Id | null) => ui.select(id)
  const selected = ui.selectedProvinceId

  return <div className={styles.screen} data-lens={ui.lens}>
    <MapView game={game} lens={ui.lens} selectedId={selected} resourceFilter={ui.resourceFilter} focus={ui.focus} onSelect={select}/>

    <header className={styles.top}>
      <button className={styles.house} onClick={() => ui.openSheet({ kind: 'menu' })} aria-label="Abrir menu">
        <Crest heraldry={game.campaign.customization.heraldry} size={30}/>
        <span><strong>{player.name}</strong><small>{rank} irian · {houseOf(game, player.id) && game.world.provinces.find(p => p.id === player.seatProvinceId)!.name.toLowerCase()}</small></span>
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
        <span title={`Ouro (${signed(balance.gold)}/mês)`}><Icon name="gold" size={15}/>{fmt(player.gold)}</span>
        <span title="Renome: a moeda política. Recrutar, casar e ousar custam renome." className={styles.renown}><Icon name="renown" size={15}/>{fmt(player.prestige)}</span>
        {RESOURCES.map(r => { const v = player.stock[STOCK_KEY[r]]; return <span key={r} title={r} className={v === 0 ? styles.zero : ''}><ResourceIcon resource={r} size={15}/>{fmt(v)}</span> })}
      </div>
      <div className={styles.clock}>
        <span className={styles.date}>{date.dayOfSeason} de {date.season}<small>ano {date.year} do pacto</small></span>
        <div className={styles.speeds} role="group" aria-label="Velocidade do tempo">
          <button aria-label={game.speed ? 'Pausar' : 'Continuar'} aria-pressed={game.speed === 0} onClick={() => setSpeed(game.speed ? 0 : 1)}><Icon name={game.speed ? 'pause' : 'play'} size={14}/></button>
          {([1, 2, 3] as const).map(s => <button key={s} aria-label={`Velocidade ${s}`} aria-pressed={game.speed === s} className={game.speed === s ? styles.on : ''} onClick={() => setSpeed(s)}>{'›'.repeat(s)}</button>)}
        </div>
      </div>
    </header>

    {game.campaign.politics.stage === 'guerra' && <div className={styles.warBanner}>Guerra com a {liegeHouse(game).name}</div>}
    <LensSummary game={game} lens={ui.lens} filter={ui.resourceFilter} setFilter={ui.setResourceFilter}/>
    {selected && <ProvinceCard key={`${selected}-${ui.lens}`} game={game} provinceId={selected} lens={ui.lens} act={act} onClose={() => select(null)}/>}

    <footer className={styles.bottom}>
      <div className={styles.timeline} ref={tl} aria-label="O que está chegando">
        <span className={styles.now}>hoje</span><div className={styles.axis}/>
        {pins.map((p, i) => <button key={`${p.kind}-${p.day}-${i}`} className={`${styles.pin} ${i % 2 ? styles.alt : ''}`} style={{ left: 36 + (p.day - game.day) / span * (tlWidth - 60), ['--c' as string]: TONE[p.tone] }} onClick={() => { if (p.provinceId && knowledge(game, p.provinceId) >= 1) ui.focusProvince(p.provinceId) }}>
          <span className={styles.lbl}><b>{p.kind}</b><i>{daysLabel(p.day - game.day)}</i>{p.text}</span><span className={styles.dot}/>
        </button>)}
      </div>
      <div className={styles.lenses} role="tablist" aria-label="Visões do mapa">
        {LENSES.map(([id, label, icon]) => <button key={id} role="tab" aria-selected={ui.lens === id} onClick={() => ui.setLens(id)}><Icon name={icon} size={19}/>{label}</button>)}
      </div>
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
    {!ui.sheet && decisions[0] && <DecisionScene key={decisions[0].id} game={game} decision={decisions[0]} act={act}/>}
  </div>
}
