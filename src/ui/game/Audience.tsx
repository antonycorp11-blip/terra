import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { GameState, Id } from '../../engine/types'
import type { Character, OfferKind } from '../../engine/mvpTypes'
import { BALANCE } from '../../engine/balance'
import { converse, dialogueWait, playerLine, topicsFor, TOPICS } from '../../engine/dialogue'
import { canConverse, RACE_LABEL } from '../../engine/characters'
import { offersFor, propose, scoreOffer, NEGOTIATION_LABEL, threatTo } from '../../engine/negotiation'
import { relationWith } from '../../engine/influence'
import Crest from '../Heraldry'
import Icon from '../Icons'
import { type Act } from '../parts'
import { cardUrl, heraldryOf, houseOf, mapColor } from '../view'
import styles from './Audience.module.css'

/** A face-to-face scene: the lord stands at the left, the exchange happens at the right. */
function Stage({ game, who, onClose, label, children }: { game: GameState; who: Character; onClose: () => void; label: string; children: ReactNode }) {
  const house = houseOf(game, who.houseId)
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k) }, [onClose])
  return <div className={styles.stage} data-ui role="dialog" aria-label={label} style={{ ['--hc' as string]: mapColor(game, house.id) }}>
    <div className={styles.hall}>
      {who.portraitAsset ? <img key={who.id} className={styles.figure} src={cardUrl(who.portraitAsset)} alt={who.name}/> : <span className={styles.bigCrest}><Crest heraldry={heraldryOf(game, house)} size={150}/></span>}
      <div className={styles.plate}><Crest heraldry={heraldryOf(game, house)} size={30}/><span><b>{who.name}</b>{who.role} · {house.name}</span></div>
    </div>
    <section className={styles.panel}>
      <button className={styles.close} onClick={onClose} aria-label="Fechar"><Icon name="close" size={18}/></button>
      {children}
    </section>
  </div>
}
const Bar = ({ label, v }: { label: string; v: number }) => <span className={styles.bar} data-tone={v >= 15 ? 'good' : v >= -5 ? 'mid' : 'bad'}><i style={{ width: `${(v + 100) / 2}%` }}/><em>{label} {v > 0 ? '+' : ''}{v}</em></span>

export function ConversationScene({ game, characterId, act, onClose }: { game: GameState; characterId: Id; act: Act; onClose: () => void }) {
  const [id, setId] = useState(characterId)
  const c = game.campaign.characters.find(x => x.id === id)!, house = houseOf(game, c.houseId)
  const history = game.campaign.conversations.filter(x => x.characterId === id).slice(-3)
  const court = c.houseId === game.playerHouseId ? game.campaign.characters.filter(x => x.id.startsWith('court-')) : game.campaign.characters.filter(x => x.houseId === c.houseId && !x.id.startsWith('candidate'))
  const log = useRef<HTMLDivElement>(null)
  useEffect(() => { log.current?.scrollTo({ top: log.current.scrollHeight, behavior: 'smooth' }) }, [history.length, id])
  const rel = c.houseId === game.playerHouseId ? null : relationWith(game, c.houseId)
  const open = canConverse(game, c)
  return <Stage game={game} who={c} onClose={onClose} label={`Conversa com ${c.name}`}>
    <header className={styles.head}>
      <div className={styles.title}><h3>{c.name}</h3><span>{RACE_LABEL[c.race]} · {c.age} anos · {c.traits.join(', ')}</span></div>
      <div className={styles.bars}><Bar label="confiança" v={c.relationship.trust}/><Bar label="respeito" v={c.relationship.respect}/><Bar label="amizade" v={c.relationship.friendship}/>{rel !== null && <Bar label={`casa`} v={rel}/>}</div>
      {c.second && <p className={styles.second}>Duas consciências: <b>{c.second.name}</b> ({c.second.traits[0]}) também escuta. Amizade {c.second.relationship.friendship}, confiança {c.second.relationship.trust}.</p>}
    </header>
    <div className={styles.log} ref={log}>
      {history.length === 0 && <p className={styles.say}>{!open ? 'Ainda não há contato com esta casa.' : c.relationship.trust < 0 ? `${c.name} cruza os braços e espera que você fale primeiro.` : `${c.name} recebe você com atenção.`}</p>}
      {history.map(h => <div key={h.id} className={styles.exchange}>
        <p className={styles.you}>{h.prompt ?? TOPICS[h.topic]}</p>
        <p className={styles.say}>{h.response}</p>
        <small className={styles.fx}>{h.consequence}</small>
      </div>)}
    </div>
    <div className={styles.options}>{topicsFor(game, c).map(t => { const w = dialogueWait(game, c.id, t); return <button key={t} disabled={w > 0 || !open} data-risk={t === 'threaten' || t === 'favor' ? 'true' : undefined} onClick={() => act(g => converse(g, c.id, t))}>
      <span>“{playerLine(game, c, t)}”</span><small>{TOPICS[t]}{w > 0 ? ` · de novo em ${w} dias` : ''}</small>
    </button> })}</div>
    {court.length > 1 && <div className={styles.court}>{court.map(x => <button key={x.id} aria-pressed={x.id === id} onClick={() => setId(x.id)}>{x.name}<small>{x.role}</small></button>)}<span className={styles.courtLabel}>{c.houseId === game.playerHouseId ? 'sua corte' : `corte da ${house.name.replace('Casa ', '')}`}</span></div>}
  </Stage>
}

/** How the lord reacts to what is on the table, in his own temperament. */
function reaction(c: Character, score: number, needed: number) {
  const t = c.traits[0], gap = needed - score
  if (gap <= 0) return t === 'orgulhoso' ? '“Aceitável. Por ora.”' : t === 'desconfiado' ? '“Parece justo. Parece.”' : '“Temos um acordo, se vier assim.”'
  if (gap <= 12) return t === 'ambicioso' ? '“Quase. Mostre que vale a pena.”' : '“Estamos perto. Falta pouco.”'
  if (gap <= 30) return t === 'pragmático' ? '“Os números ainda não fecham.”' : '“Isso não basta para a minha casa.”'
  return t === 'orgulhoso' ? '“Isso é um insulto.”' : t === 'generoso' ? '“Gostaria de ajudar, mas não assim.”' : '“Você não pode estar falando sério.”'
}
export function NegotiationScene({ game, negotiationId, act, onClose }: { game: GameState; negotiationId: Id; act: Act; onClose: () => void }) {
  const n = game.campaign.negotiations.find(x => x.id === negotiationId)!, house = houseOf(game, n.houseId), ruler = game.campaign.characters.find(c => c.id === `ruler-${house.id}`)!
  const offers = offersFor(game, house.id)
  const [picked, setPicked] = useState<OfferKind[]>(n.kind === 'comércio' && offers.find(o => o.kind === 'comércio')?.available ? ['comércio'] : [])
  const score = scoreOffer(game, house.id, n.kind, picked), needed = n.needed
  const threat = threatTo(game, house.id), waiting = n.status === 'aguardando', fill = Math.min(100, score / needed * 100)
  const cost = picked.reduce((c, k) => { const o = offers.find(x => x.kind === k)!; return { gold: c.gold + (o.cost.gold ?? 0), silver: c.silver + (o.cost.silver ?? 0), renown: c.renown + (o.cost.renown ?? 0) } }, { gold: 0, silver: 0, renown: 0 })
  const costText = [cost.gold && `${cost.gold} ouro`, cost.silver && `${cost.silver} prata`, cost.renown && `${cost.renown} renome`].filter(Boolean).join(' · ') || 'sem custo'
  return <Stage game={game} who={ruler} onClose={onClose} label={`${NEGOTIATION_LABEL[n.kind]} com a ${house.name}`}>
    <header className={styles.head}>
      <div className={styles.title}><h3>{NEGOTIATION_LABEL[n.kind]}</h3><span>com a {house.name} · rodada {Math.min(n.round, BALANCE.negotiation.maxRounds)} de {BALANCE.negotiation.maxRounds}</span></div>
      <div className={styles.rounds}>{Array.from({ length: BALANCE.negotiation.maxRounds }, (_, i) => <i key={i} className={i < n.round - 1 ? styles.spent : i === n.round - 1 ? styles.now : ''}/>)}</div>
    </header>
    <div className={styles.weigh}>
      <div className={styles.meter} data-ok={score >= needed}><i style={{ width: `${fill}%` }}/><span>sua oferta <b>{score}</b></span><span>exigem <b>{needed}</b></span></div>
      <p className={styles.react}>{waiting ? `O emissário leva a proposta. Resposta em ${n.replyDay - game.day} dias.` : n.status === 'aceita' ? '“Está feito.”' : n.status === 'recusada' ? 'As conversas terminaram sem acordo.' : reaction(ruler, score, needed)}{threat && !waiting ? <small>A {house.name} {threat}.</small> : null}</p>
    </div>
    <div className={styles.offers}>{offers.map(o => { const on = picked.includes(o.kind); return <button key={o.kind} aria-pressed={on} disabled={!o.available || waiting || n.status !== 'aberta'} onClick={() => setPicked(on ? picked.filter(k => k !== o.kind) : [...picked, o.kind])} title={o.why}>
      <b>{o.label}</b><span>+{o.value}</span><small>{o.why}</small>
    </button> })}</div>
    {n.log.length > 0 && <p className={styles.history}>{n.log.at(-1)}</p>}
    <footer className={styles.send}>
      <span>{costText}<small>devolvido se recusarem</small></span>
      {n.status === 'aberta' ? <button className={styles.primary} onClick={() => act(g => propose(g, n.id, picked), 'Proposta enviada')}>Enviar proposta</button> : <button className={styles.secondary} onClick={onClose}>Voltar ao mapa</button>}
    </footer>
  </Stage>
}
