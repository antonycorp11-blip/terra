import { useEffect, useState, type ReactNode } from 'react'
import type { GameState, Id } from '../../engine/types'
import type { DialogueTopic, OfferKind } from '../../engine/mvpTypes'
import type { SaveSlot } from '../../engine/persistence'
import { BALANCE } from '../../engine/balance'
import { ascension, fiefHouses, liegeHouse, sovereign } from '../../engine/politics'
import { menUnderArms } from '../../engine/economy'
import { converse, dialogueWait, TOPICS } from '../../engine/dialogue'
import { canConverse, RACE_LABEL } from '../../engine/characters'
import { conquestPlan, PATH_LABEL } from '../../engine/plans'
import { offersFor, propose, scoreOffer, NEGOTIATION_LABEL, threatTo } from '../../engine/negotiation'
import { isVassal } from '../../engine/stateUtils'
import Crest from '../Heraldry'
import Icon from '../Icons'
import type { Lens } from '../store'
import { fmt, longDate, type Act } from '../parts'
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
          <span className={styles.tileText}><b>{h.name}</b><small>{h.id === game.playerHouseId ? 'sua casa' : v ? `vassala · lealdade ${v.loyalty} · tributo ${Math.round(v.tribute * 100)}%` : h.id === liege.id ? 'seu suserano' : `${ruler.name} · ${RACE_LABEL[ruler.race].toLowerCase()} · relação ${contact ? contact.relation : '?'}`}</small></span>
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

/* ---------- Conversation ---------- */
export function ConversationSheet({ game, characterId, act, onClose }: { game: GameState; characterId: Id; act: Act; onClose: () => void }) {
  const [id, setId] = useState(characterId)
  const c = game.campaign.characters.find(x => x.id === id)!, house = houseOf(game, c.houseId)
  const last = game.campaign.conversations.filter(x => x.characterId === id).at(-1)
  const court = c.houseId === game.playerHouseId ? game.campaign.characters.filter(x => x.id.startsWith('court-')) : game.campaign.characters.filter(x => x.houseId === c.houseId && !x.id.startsWith('candidate'))
  const ring = (label: string, v: number) => { const C = 2 * Math.PI * 15, f = (v + 100) / 200; return <div className={styles.ring}><svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="15" className={styles.ringBg}/><circle cx="20" cy="20" r="15" className={styles.ringV} stroke={v >= 15 ? '#86ad6f' : v >= -5 ? '#d9b45a' : '#c4553f'} strokeDasharray={C} strokeDashoffset={C * (1 - f)} transform="rotate(-90 20 20)"/></svg><b>{v > 0 ? '+' : ''}{v}</b>{label}</div> }
  return <Sheet title={c.name} sub={`${c.role} · ${house.name} · ${RACE_LABEL[c.race]} · ${c.age} anos`} onClose={onClose} wide>
    <div className={styles.convo}>
      <div className={styles.convoFigure} style={{ ['--hc' as string]: mapColor(game, house.id) }}>
        {c.portraitAsset ? <img src={assetUrl(c.portraitAsset)} alt={c.name}/> : <Crest heraldry={heraldryOf(game, house)} size={96}/>}
        <div className={styles.rings}>{ring('confiança', c.relationship.trust)}{ring('respeito', c.relationship.respect)}{ring('amizade', c.relationship.friendship)}</div>
        {c.second && <div className={styles.second}><b>{c.second.name}</b>, a outra consciência: amizade {c.second.relationship.friendship}, confiança {c.second.relationship.trust}</div>}
      </div>
      <div className={styles.convoMain}>
        <div className={styles.traits}>{c.traits.map(t => <span key={t}>{t}</span>)}</div>
        <div className={styles.speech}>{last ? <><p>{last.response}</p><small className={styles.fx}>{last.consequence}</small></> : <p>{c.relationship.trust < 0 ? 'Espera que você fale primeiro.' : 'Recebe você com atenção.'}</p>}{c.memory.length > 0 && <small className={styles.mem}>Lembra: {c.memory.slice(-2).map(m => m.text).join(' · ')}</small>}</div>
        <div className={styles.chips}>{(Object.keys(TOPICS) as DialogueTopic[]).map(t => { const w = dialogueWait(game, c.id, t); return <button key={t} disabled={w > 0 || !canConverse(game, c)} onClick={() => act(g => converse(g, c.id, t))}>{TOPICS[t]}{w > 0 && <small>em {w}d</small>}</button> })}</div>
        {court.length > 1 && <div className={styles.courtRow}><span className={styles.cardH}>{c.houseId === game.playerHouseId ? 'sua corte' : 'nesta corte'}</span>{court.map(x => <button key={x.id} aria-pressed={x.id === id} onClick={() => setId(x.id)}>{x.name}<small>{x.role}</small></button>)}</div>}
      </div>
    </div>
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

/* ---------- Negotiation: the scale of offers ---------- */
export function NegotiationSheet({ game, negotiationId, act, onClose }: { game: GameState; negotiationId: Id; act: Act; onClose: () => void }) {
  const n = game.campaign.negotiations.find(x => x.id === negotiationId)!, house = houseOf(game, n.houseId), ruler = game.campaign.characters.find(c => c.id === `ruler-${house.id}`)!
  const offers = offersFor(game, house.id)
  const [picked, setPicked] = useState<OfferKind[]>(n.kind === 'comércio' ? ['comércio'] : [])
  const score = scoreOffer(game, house.id, n.kind, picked), needed = n.needed
  const tilt = Math.max(-18, Math.min(18, (score - needed) / 2))
  const threat = threatTo(game, house.id)
  const waiting = n.status === 'aguardando'
  return <Sheet title={`${NEGOTIATION_LABEL[n.kind]} com a ${house.name}`} sub={`Rodada ${Math.min(n.round, BALANCE.negotiation.maxRounds)} de ${BALANCE.negotiation.maxRounds} · ${n.status}`} onClose={onClose} wide>
    <div className={styles.nego}>
      <div className={styles.scale}>
        <svg viewBox="0 0 220 140" aria-label={`Balança: ${score} de ${needed}`}>
          <path d="M110 18v100M80 130h60" stroke="#c9a85a" strokeWidth="4" strokeLinecap="round"/>
          <g transform={`rotate(${-tilt} 110 22)`}><path d="M30 22h160" stroke="#e8d29a" strokeWidth="4" strokeLinecap="round"/>
            <path d="M30 22l-18 40h36zM190 22l-18 40h36z" fill="none" stroke="#c9a85a" strokeWidth="1.5"/>
            <ellipse cx="30" cy="64" rx="22" ry="6" fill="#d4ab52"/><ellipse cx="190" cy="64" rx="22" ry="6" fill="#8b6b2e"/>
            <text x="30" y="88" textAnchor="middle" className={styles.scaleText}>sua oferta {score}</text><text x="190" y="88" textAnchor="middle" className={styles.scaleText}>exigem {needed}</text></g>
        </svg>
        <p className={score >= needed ? styles.goodTxt : styles.small}>{score >= needed ? 'A balança pende para o seu lado. Eles devem aceitar.' : `Faltam ${needed - score} pontos.`} {threat ? `A casa ${threat}.` : ''}</p>
        {ruler.portraitAsset && <img className={styles.negoFigure} src={assetUrl(ruler.portraitAsset)} alt={ruler.name}/>}
      </div>
      <div>
        <div className={styles.offers}>{offers.map(o => { const on = picked.includes(o.kind); return <button key={o.kind} className={`${styles.offer} ${on ? styles.on : ''}`} disabled={!o.available || waiting} onClick={() => setPicked(on ? picked.filter(k => k !== o.kind) : [...picked, o.kind])}>
          <b>{o.label}</b><span>+{o.value} · {Object.entries(o.cost).map(([k, v]) => `${v} ${k === 'gold' ? 'ouro' : k === 'silver' ? 'prata' : 'renome'}`).join(', ') || 'sem custo'}</span><small>{o.why}</small>
        </button> })}</div>
        <div className={styles.log}>{n.log.map((l, i) => <p key={i}>{l}</p>)}</div>
        <div className={styles.foot}>{waiting ? <p>O emissário leva a proposta. Resposta em {n.replyDay - game.day} dias.</p> : n.status === 'aceita' ? <p className={styles.goodTxt}>Acordo fechado.</p> : n.status === 'recusada' ? <p>Negociação encerrada.</p> : <button className={styles.btn} onClick={() => act(g => propose(g, n.id, picked), 'Proposta enviada')}>Enviar proposta</button>}</div>
      </div>
    </div>
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
        <span className={styles.cardH}>como jogar</span><p className={styles.small}>Toque nas províncias para ver a casa que as governa. As quatro visões no canto inferior mudam o mapa inteiro e as ações da carta. Cada província pode ser tomada por três caminhos, todos em etapas. O tempo para sozinho quando algo exige uma decisão.</p></div>
    </div>
  </Sheet>
}
export function ChronicleSheet({ game, onClose, onPick }: { game: GameState; onClose: () => void; onPick: (id: Id) => void }) {
  return <Sheet title="Crônica" sub="Tudo o que aconteceu, do mais recente ao mais antigo" onClose={onClose} wide>
    <div className={styles.chron}>{game.campaign.notifications.slice(-80).reverse().map(n => <button key={n.id} className={n.important ? styles.important : ''} onClick={() => n.provinceId && onPick(n.provinceId)}><small>{longDate(n.day)}</small><b>{n.title}</b><span>{n.text}</span></button>)}</div>
  </Sheet>
}
