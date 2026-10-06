import { useEffect, useState, type ReactNode } from 'react'
import type { GameState, Id } from '../../engine/types'
import type { SaveSlot } from '../../engine/persistence'
import { ascension, fiefHouses, liegeHouse, sovereign } from '../../engine/politics'
import { menUnderArms } from '../../engine/economy'
import { RACE_LABEL } from '../../engine/characters'
import { conquestPlan, PATH_LABEL } from '../../engine/plans'
import { isVassal } from '../../engine/stateUtils'
import Crest from '../Heraldry'
import Icon from '../Icons'
import type { Lens } from '../store'
import { fmt, longDate } from '../parts'
import { isMuted, setMuted } from '../sfx'
import { assetUrl, heraldryOf, houseOf, mapColor } from '../view'
import type { SaveIO } from './GameScreen'
import styles from './Game.module.css'

function Sheet({ title, sub, onClose, children, wide, tabs }: { title: string; sub?: string; onClose: () => void; children: ReactNode; wide?: boolean; tabs?: ReactNode }) {
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k) }, [onClose])
  return <div className={styles.backdrop} data-ui onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
    <section className={`${styles.sheet} ${wide ? styles.wide : ''}`} role="dialog" aria-label={title}>
      <header className={styles.sheetHead}><div><h3>{title}</h3>{sub && <span>{sub}</span>}</div>{tabs}<button className={styles.x} onClick={onClose} aria-label="Fechar"><Icon name="close" size={18}/></button></header>
      <div className={styles.sheetBody}>{children}</div>
    </section>
  </div>
}

/* ---------- Houses: your network, threats and rankings ---------- */
export function HousesSheet({ game, onClose, onPick }: { game: GameState; onClose: () => void; onPick: (provinceId: Id) => void }) {
  const [tab, setTab] = useState<'rede' | 'ranking'>('rede')
  const [metric, setMetric] = useState<'militar' | 'riqueza' | 'influência' | 'território'>('militar')
  const pol = game.campaign.politics, asc = ascension(game), liege = liegeHouse(game), crown = sovereign(game)
  const fief = fiefHouses(game)
  const known = game.world.houses.filter(h => h.rank === 'grão-senhorial' && game.campaign.contacts.some(c => c.houseId === h.id && c.establishedDay !== null))
  const pool = [...new Map([...fief, crown, ...known].map(h => [h.id, h])).values()]
  const value = (id: string) => { const h = houseOf(game, id); return metric === 'militar' ? (id === game.playerHouseId ? menUnderArms(game) : h.mobilizable) : metric === 'riqueza' ? h.gold : metric === 'influência' ? (id === game.playerHouseId ? h.prestige + game.campaign.vassals.length * 15 : h.prestige) : game.world.provinces.filter(p => p.governingHouseId === id || (id === game.playerHouseId && isVassal(game, p.governingHouseId))).length }
  const rows = pool.map(h => ({ h, v: value(h.id) })).sort((a, b) => b.v - a.v), max = Math.max(1, ...rows.map(r => r.v))
  const unit = { militar: 'homens', riqueza: 'ouro', 'influência': 'pontos', 'território': 'províncias' }[metric]
  return <Sheet title="Casas" sub="Seu feudo, seus vassalos e quem observa você" onClose={onClose} wide tabs={<div className={styles.tabs}><button aria-pressed={tab === 'rede'} onClick={() => setTab('rede')}>Rede e ameaças</button><button aria-pressed={tab === 'ranking'} onClick={() => setTab('ranking')}>Ranking</button></div>}>
    {tab === 'rede' ? <>
      <div className={styles.watch}>
        <div><span className={styles.k}>ameaça aos olhos de {liege.name.replace('Casa ', '')}</span><div className={styles.threat}><i style={{ left: `${pol.liegeThreat}%` }}/></div><p>{pol.stage === 'reconhecido' ? 'Você agora está acima dele.' : pol.stage === 'guerra' ? 'Guerra aberta.' : pol.liegeThreat < 30 ? 'Ele vê você como um vassalo útil.' : pol.liegeThreat < 60 ? 'Ele desconfia. Tributo em dia e presentes acalmam.' : 'Ele vê você como rival. A guerra é uma possibilidade real.'}</p></div>
        <div><span className={styles.k}>a coroa · {crown.name}</span><div className={styles.crownRow}><Crest heraldry={heraldryOf(game, crown)} size={26}/><b>{pol.kingPact ? 'Protege sua casa' : pol.kingFavor >= 30 ? 'Interessada em você' : pol.kingFavor > 0 ? 'Atenta' : 'Distante'}</b></div><p>{pol.kingPact ? 'A coroa impede a guerra entre vassalos e reconhecerá sua ascensão.' : 'Quanto mais casas você reúne, mais a coroa considera apoiar você contra o grão-lorde.'}</p></div>
        <div><span className={styles.k}>ascensão</span><b className={styles.big}>{asc.support} / {asc.needed}</b><p>Casas de {game.world.fiefs.find(f => f.id === game.world.provinces.find(p => p.id === houseOf(game, game.playerHouseId).seatProvinceId)!.fiefId)!.name} do seu lado. {asc.recognised ? 'Reconhecimento garantido.' : 'Falta o reconhecimento da coroa ou a queda do grão-lorde.'}</p></div>
      </div>
      <span className={styles.cardH}>casas do feudo</span>
      <div className={styles.houseGrid}>{fief.map(h => { const v = game.campaign.vassals.find(x => x.houseId === h.id), ruler = game.campaign.characters.find(c => c.id === `ruler-${h.id}`)!, contact = game.campaign.contacts.find(c => c.houseId === h.id)
        return <button key={h.id} className={`${styles.houseTile} ${h.id === game.playerHouseId ? styles.me : ''}`} onClick={() => onPick(h.seatProvinceId)} style={{ ['--hc' as string]: mapColor(game, h.id) }}>
          {ruler.portraitAsset ? <img src={assetUrl(ruler.portraitAsset)} alt=""/> : <span className={styles.tileCrest}><Crest heraldry={heraldryOf(game, h)} size={40}/></span>}
          <span className={styles.tileText}><b>{h.name}</b><small>{h.id === game.playerHouseId ? 'sua casa' : v ? `jurada a você · lealdade ${v.loyalty}` : h.id === liege.id ? 'seu suserano' : `${ruler.name} · ${RACE_LABEL[ruler.race].toLowerCase()} · relação ${contact ? contact.relation : '?'}`}</small></span>
          <Crest heraldry={heraldryOf(game, h)} size={22}/>
        </button> })}</div>
    </> : <>
      <div className={styles.tabs}>{(['militar', 'riqueza', 'influência', 'território'] as const).map(m => <button key={m} aria-pressed={metric === m} onClick={() => setMetric(m)}>{m}</button>)}</div>
      <div className={styles.rank}>{rows.map((r, i) => <button key={r.h.id} className={`${styles.rrow} ${r.h.id === game.playerHouseId ? styles.me : ''}`} onClick={() => onPick(r.h.seatProvinceId)}>
        <span className={styles.pos}>{i + 1}º</span><Crest heraldry={heraldryOf(game, r.h)} size={22}/>
        <span>{r.h.name}{isVassal(game, r.h.id) && <span className={styles.vassalTag}>sua vassala</span>}<small>{r.h.rank === 'real' ? 'coroa' : r.h.rank === 'grão-senhorial' ? 'grão-lorde' : r.h.id === game.playerHouseId ? 'você' : 'casa provincial'}</small></span>
        <span className={styles.track}><i style={{ width: `${r.v / max * 100}%`, background: mapColor(game, r.h.id) }}/></span><b>{fmt(r.v)}<small> {unit}</small></b>
      </button>)}</div>
    </>}
  </Sheet>
}

/* ---------- Conquest plan: the stages of a path ---------- */
export function PlanSheet({ game, provinceId, path, onClose, onLens }: { game: GameState; provinceId: Id; path: 0 | 1 | 2; onClose: () => void; onLens: (lens: Lens) => void }) {
  const [current, setCurrent] = useState(path)
  const p = game.world.provinces.find(x => x.id === provinceId)!, house = houseOf(game, p.governingHouseId)
  const plan = conquestPlan(game, provinceId, current)
  const lensFor: Lens[] = ['militar', 'diplomacia', 'influencia']
  const reaction = ['Vencer pela força deixa rancor: a lealdade começa baixa, e o grão-lorde vê você como ameaça.', 'Um tratado traz lealdade alta e comércio. O grão-lorde reclama, mas não tem pretexto para a guerra.', 'Nenhum soldado morre. As outras casas passam a ver você como alguém que compra lealdades.'][current]
  return <Sheet title={`Tomar ${p.name}`} sub={`${house.name} · nível ${plan.level} de ${plan.stages.length}`} onClose={onClose} wide tabs={<div className={styles.tabs}>{PATH_LABEL.map((l, i) => <button key={l} aria-pressed={current === i} onClick={() => setCurrent(i as 0 | 1 | 2)}>{l}</button>)}</div>}>
    <div className={styles.chain}>{plan.stages.map((s, k) => <div key={s.name} className={`${styles.stage} ${s.done ? styles.done : k === plan.level ? styles.cur : ''}`}>
      <span className={styles.k}>etapa {k + 1}{s.done ? ' · cumprida' : k === plan.level ? ' · agora' : ''}</span><h6>{s.name}</h6>
      {s.requirements.map(r => <div key={r.text} className={styles.req}><span className={r.ok ? styles.ok : styles.no}>{r.ok ? '✓' : '✗'}</span><span>{r.text}<small>{r.detail}</small></span></div>)}
    </div>)}</div>
    <div className={styles.outcome}><div><b>como o mundo reage</b>{reaction}</div><div><b>próximo passo</b>{plan.level < plan.stages.length ? `${plan.next}: abra a visão ${PATH_LABEL[current]} e toque em ${p.name}.` : 'Esta casa já é sua.'}</div></div>
    <div className={styles.foot}><button className={styles.btn} onClick={() => onLens(lensFor[current])}>Ir para a visão {PATH_LABEL[current]}</button></div>
  </Sheet>
}

/* ---------- Menu, saves, chronicle ---------- */
export function MenuSheet({ game, io, onClose, onChronicle }: { game: GameState; io: SaveIO; onClose: () => void; onChronicle: () => void }) {
  const player = houseOf(game, game.playerHouseId)
  const [slot, setSlot] = useState(`Campanha da ${player.name}`), [saves, setSaves] = useState<SaveSlot[]>([])
  useEffect(() => { io.list().then(setSaves).catch(() => {}) }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return <Sheet title={player.name} sub={`“${player.motto}” · ${longDate(game.day)}`} onClose={onClose}>
    <div className={styles.menuGrid}>
      <div><span className={styles.cardH}>salvar</span><div className={styles.moveRow}><input value={slot} onChange={e => setSlot(e.target.value)} aria-label="Nome do salvamento"/><button className={styles.btn} onClick={async () => { await io.save(slot.trim() || 'Campanha'); setSaves(await io.list()) }}>Salvar</button></div>
        <span className={styles.cardH}>carregar</span>{saves.length ? saves.map(s => <div key={s.slot} className={styles.saveRow}><button onClick={() => io.load(s.slot)}><b>{s.slot === 'autosave' ? 'Salvamento automático' : s.slot}</b><small>{longDate(s.game.day)}</small></button><button onClick={async () => { await io.remove(s.slot); setSaves(await io.list()) }} aria-label={`Excluir ${s.slot}`}>×</button></div>) : <p className={styles.small}>Nenhum salvamento neste navegador.</p>}</div>
      <div><span className={styles.cardH}>campanha</span><button className={styles.btnSec} onClick={onChronicle}>Crônica e notícias</button><button className={styles.btnSec} onClick={io.newCampaign}>Nova campanha</button>
        <SoundToggle/>
        <span className={styles.cardH}>como jogar</span><p className={styles.small}>Cada turno é uma semana. Toque em Irian e leve a comitiva pelo mapa (2 movimentos por turno): cace bandos, encontre lordes em pessoa, cerque castelos. Ações à distância gastam uma das 3 ordens do turno. Quando terminar, toque em Encerrar turno: o mundo anda, e as cenas e o relatório mostram o que aconteceu. As quatro visões mudam o mapa e as ações dos cartões.</p></div>
    </div>
  </Sheet>
}
function SoundToggle() {
  const [muted, setM] = useState(isMuted())
  return <button className={styles.btnSec} onClick={() => { setMuted(!muted); setM(!muted) }}>{muted ? 'Som: desligado' : 'Som: ligado'}</button>
}
export function ChronicleSheet({ game, onClose, onPick }: { game: GameState; onClose: () => void; onPick: (id: Id) => void }) {
  return <Sheet title="Crônica" sub="Tudo o que aconteceu, do mais recente ao mais antigo" onClose={onClose} wide>
    <div className={styles.chron}>{game.campaign.notifications.slice(-80).reverse().map(n => <button key={n.id} className={n.important ? styles.important : ''} onClick={() => n.provinceId && onPick(n.provinceId)}><small>{longDate(n.day)}</small><b>{n.title}</b><span>{n.text}</span></button>)}</div>
  </Sheet>
}
