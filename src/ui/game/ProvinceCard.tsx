import { createContext, useContext, useState, type ReactNode } from 'react'
import type { GameState, Id, Province, Resource } from '../../engine/types'
import { RESOURCES } from '../../engine/types'
import { BALANCE } from '../../engine/balance'
import { adminOf, conditionOf, governorCandidates, provinceBalance, setGovernor, setTax } from '../../engine/economy'
import { startInvestment, workInProgress, workQuote, mineYield } from '../../engine/investments'
import { canExplore, expeditionQuote, sendExpedition } from '../../engine/exploration'
import { sellers, purchaseQuote, buyResource } from '../../engine/travel'
import { RACE_LABEL, rulerOf } from '../../engine/characters'
import { sendEmissary, diplomaticAction } from '../../engine/diplomacy'
import { negotiationBlocked, startNegotiation, NEGOTIATION_LABEL } from '../../engine/negotiation'
import { attack, attackQuote, besiegeWithParty, defenders, levyCap, moveTroops, recruit, upgradeWalls, wallLevel } from '../../engine/military'
import { influenceAction, influenceOf, cooldownLeft, debtOf, oathReady, proposeOath, canInfluence, relationWith, bondWith } from '../../engine/influence'
import { hireSpy, sendSpy, spyQuote } from '../../engine/espionage'
import { attackParty, hostile, lordLocation, moveParty, moveToward, partyPath, orderCost, partyReach, playerParty, presentWith, withOrder } from '../../engine/party'
import { conquestPlan, PATH_LABEL } from '../../engine/plans'
import { disposition } from '../../engine/relationships'
import { controlled, inPlayerRealm, isVassal, liegeOf } from '../../engine/stateUtils'
import { knowledge } from '../../engine/knowledge'
import type { InvestmentKind, Negotiation, TaxLevel } from '../../engine/mvpTypes'
import Crest from '../Heraldry'
import Icon, { ResourceIcon } from '../Icons'
import { useUI, type Lens } from '../store'
import { fmt, signed, type Act } from '../parts'
import { cardUrl, heraldryOf, houseOf, levelOf, mapColor, provinceOf } from '../view'
import styles from './Game.module.css'

interface Props { game: GameState; provinceId: Id; lens: Lens; act: Act; onClose: () => void }
const PATH_COLOR = ['#c0473a', '#2f8d97', '#c9a23e']

/** Orders left this turn, for every action that costs one. */
const Orders = createContext(3)
function Action({ label, detail, onClick, disabled, tone, cost = 0 }: { label: string; detail?: string; onClick: () => void; disabled?: boolean | string; tone?: 'sec' | 'risk' | 'war'; cost?: number }) {
  const left = useContext(Orders)
  const blocked = disabled || (cost > left && 'sem ordens neste turno')
  const text = typeof blocked === 'string' ? blocked : detail
  return <button className={`${styles.act} ${tone ? styles[tone] : ''}`} onClick={onClick} disabled={Boolean(blocked)} title={typeof blocked === 'string' ? blocked : undefined}>
    <span>{label}</span><small>{text}{cost > 0 && !blocked ? <em className={styles.seal}>1 ordem</em> : null}</small>
  </button>
}
const Section = ({ title, children }: { title: string; children: ReactNode }) => <section className={styles.cardSection}><span className={styles.cardH}>{title}</span>{children}</section>
const resList = (rs: Resource[]) => rs.map(r => <span key={r} className={styles.resTag}><ResourceIcon resource={r} size={14}/>{r}</span>)

export default function ProvinceCard({ game, provinceId, lens, act, onClose }: Props) {
  const ui = useUI()
  const p = provinceOf(game, provinceId), level = levelOf(game, p.id)
  const mine = controlled(game).some(c => c.id === p.id)
  const house = houseOf(game, p.occupyingHouseId ?? p.governingHouseId), fief = game.world.fiefs.find(f => f.id === p.fiefId)!, realm = game.world.realms.find(r => r.id === p.realmId)!
  const ruler = rulerOf(game, house.id)
  // In your own land the figure is whoever governs it for you, or Irian himself.
  const governor = mine ? game.campaign.characters.find(c => c.id === adminOf(game, p.id).governor) : null
  const figure = governor?.portraitAsset ? governor : ruler
  let body: ReactNode
  if (level === 'hidden') body = <><div className={styles.k}>desconhecida</div><h4>Terra sem registro</h4><p className={styles.note}>Ninguém da sua casa esteve aqui. Explore uma terra vizinha para avistá-la.</p></>
  else if (level === 'sighted') body = <Sighted game={game} p={p} act={act}/>
  else body = <>
    <HouseHeader game={game} p={p} mine={mine}/>
    {lens === 'territorio' && (mine ? <OwnTerritory game={game} p={p} act={act}/> : <ForeignTerritory game={game} p={p} act={act}/>)}
    {lens === 'diplomacia' && (mine ? <OwnDiplomacy game={game} p={p} act={act}/> : <ForeignDiplomacy game={game} p={p} act={act}/>)}
    {lens === 'militar' && (mine ? <OwnMilitary game={game} p={p} act={act}/> : <ForeignMilitary game={game} p={p} act={act}/>)}
    {lens === 'influencia' && (mine ? <OwnInfluence game={game} act={act}/> : <ForeignInfluence game={game} p={p} act={act}/>)}
  </>
  const showFigure = level === 'known' && figure?.portraitAsset
  return <aside className={`${styles.card} ${showFigure ? styles.withFigure : ''}`} data-ui aria-label={`Província ${level === 'known' ? p.name : ''}`}>
    <button className={styles.cx} onClick={onClose} aria-label="Fechar"><Icon name="close" size={16}/></button>
    {showFigure && <div className={styles.cardFigure} style={{ ['--hc' as string]: mapColor(game, house.id) }}>
      <img src={cardUrl(figure!.portraitAsset!)} alt={`${figure!.name}, ${house.name}`}/>
      <span className={styles.figureName}><b>{figure!.name}</b>{figure === governor ? 'governador' : ruler.role.toLowerCase()}</span>
    </div>}
    <div className={styles.cardBody}><Orders.Provider value={game.campaign.orders}>
      {level === 'known' && <div className={styles.k}>{p.name} · {fief.name} · {realm.name}</div>}
      {level !== 'hidden' && <Road game={game} p={p} act={act}/>}
      {body}
      {level === 'known' && !mine && lens === 'territorio' && <Ways game={game} p={p} onOpen={path => ui.openSheet({ kind: 'plan', provinceId: p.id, path })}/>}
      {level === 'known' && house.id !== game.playerHouseId && ruler && <Meet game={game} houseId={house.id} act={act}/>}
    </Orders.Provider></div>
  </aside>
}

/** The house that held a province before it swore to the player. */
const formerHouse = (game: GameState, p: Province) => { const v = game.campaign.vassals.find(x => x.provinceIds?.includes(p.id)); return v ? houseOf(game, v.houseId) : null }
/** Irian's retinue and whoever else is on this province's roads. */
function Road({ game, p, act }: { game: GameState; p: Province; act: Act }) {
  const party = playerParty(game), cost = partyReach(game).get(p.id), here = party.provinceId === p.id, route = here || cost !== undefined ? null : partyPath(game, p.id)
  const others = game.campaign.parties.filter(x => x.id !== party.id && x.provinceId === p.id)
  const quest = (id: string) => game.campaign.quests.find(q => !q.done && q.partyId === id)
  if (!here && cost === undefined && !route && !others.length) return null
  return <div className={styles.road}>
    {here ? <span className={styles.hereTag}><Icon name="militar" size={13}/>{party.siegeArmyId ? `Irian cerca ${p.name}` : `Irian está aqui com ${party.men} homens`}</span>
      : cost !== undefined ? <Action label="Levar a comitiva para cá" detail={`${cost} movimento${cost > 1 ? 's' : ''} · ${party.men} homens`} onClick={() => act(g => moveParty(g, p.id))}/>
      : route ? <Action label="Seguir para cá" detail={`chega em ${Math.ceil(route.cost / BALANCE.party.moves)} turnos${party.moves ? '' : ' · a comitiva já andou neste turno'}`} disabled={!party.moves && 'encerre o turno para seguir'} onClick={() => act(g => moveToward(g, p.id))}/> : null}
    {here && !party.siegeArmyId && !inPlayerRealm(game, p.id) && knowledge(game, p.id) >= 2 && (attackQuote(game, p.id, p.id).justified || hostile(game, p.governingHouseId)) && !game.campaign.armies.some(a => a.houseId === game.playerHouseId && a.targetProvinceId === p.id) && <Action tone="war" label={`Cercar ${p.name}`} detail={`com os ${party.men} homens da comitiva · ~${Math.round(defenders(game, p) / 10) * 10} defensores`} disabled={party.men < BALANCE.military.partySiegeMin && `precisa de ${BALANCE.military.partySiegeMin} homens`} onClick={() => act(g => besiegeWithParty(g), 'Cerco iniciado')}/>}
    {others.map(x => { const q = quest(x.id), foe = x.kind === 'bandidos'
      return <div key={x.id} className={`${styles.meet} ${foe ? styles.outlaw : ''}`}>
        {foe ? <Icon name="militar" size={20}/> : <Crest heraldry={heraldryOf(game, houseOf(game, x.houseId!))} size={24}/>}
        <span><b>{foe ? x.name : `${rulerOf(game, x.houseId!).name} da ${houseOf(game, x.houseId!).name}`}</b>{x.men} {foe ? 'salteadores' : 'homens na escolta'}{q ? ` · recompensa da ${houseOf(game, q.houseId).name}: ${q.gold} ouro` : ''}</span>
        {here && (foe || hostile(game, x.houseId!)) && <button className={`${styles.mini2} ${styles.danger}`} onClick={() => act(g => attackParty(g, x.id))}>Atacar</button>}
      </div> })}
  </div>
}
/** Lords are met in person: go where he is, then talk. */
function Meet({ game, houseId, act }: { game: GameState; houseId: string; act: Act }) {
  const ui = useUI(), ruler = rulerOf(game, houseId), at = lordLocation(game, houseId)
  if (!at) return <p className={styles.small}>{ruler.name} é seu prisioneiro.</p>
  const present = presentWith(game, houseId), cost = partyReach(game).get(at)
  return <div className={styles.acts}>{present
    ? <Action label={`Conversar com ${ruler.name}`} detail="em pessoa · sem custo" tone="sec" onClick={() => ui.openSheet({ kind: 'conversation', characterId: ruler.id })}/>
    : cost !== undefined ? <Action label={`Ir até ${ruler.name}`} detail={`${knowledge(game, at) >= 2 ? provinceOf(game, at).name : 'terra avistada'} · ${cost} mov.`} tone="sec" onClick={() => act(g => moveParty(g, at))}/>
    : partyPath(game, at) && playerParty(game).moves ? <Action label={`Seguir até ${ruler.name}`} detail={`está em ${knowledge(game, at) >= 2 ? provinceOf(game, at).name : 'terra avistada'} · ${Math.ceil(partyPath(game, at)!.cost / BALANCE.party.moves)} turnos`} tone="sec" onClick={() => act(g => moveToward(g, at))}/>
    : <Action label={`Conversar com ${ruler.name}`} tone="sec" disabled={`está em ${knowledge(game, at) >= 2 ? provinceOf(game, at).name : 'terras distantes'}: leve a comitiva até lá`} onClick={() => {}}/>}
  </div>
}
function HouseHeader({ game, p, mine }: { game: GameState; p: Province; mine: boolean }) {
  const house = houseOf(game, p.occupyingHouseId ?? p.governingHouseId), ruler = rulerOf(game, house.id)
  const rel = relationWith(game, house.id), vassal = isVassal(game, house.id)
  const occupied = p.occupyingHouseId ? ` · ocupada (posse legal: ${houseOf(game, p.legalHouseId).name})` : ''
  return <div className={styles.houseHead}>
    <Crest heraldry={heraldryOf(game, house)} size={44} title={house.name}/>
    <div>
      <h4>{house.name}{vassal && <span className={styles.vassalTag}>sua vassala</span>}</h4>
      <div className={styles.motto}>“{house.motto}”</div>
      <div className={styles.who}>{mine ? (p.id === houseOf(game, game.playerHouseId).seatProvinceId ? 'Sua sede. Irian governa daqui.' : formerHouse(game, p) ? `Tomada da ${formerHouse(game, p)!.name}. Agora governada por você.` : 'Seu domínio.') : <>{ruler.role} <b>{ruler.name}</b> · {RACE_LABEL[ruler.race].toLowerCase()} · {ruler.age} anos</>}{occupied}</div>
      {!mine && house.id !== game.playerHouseId && <div className={styles.relRow}><span className={styles.rel} data-tone={rel >= 20 ? 'good' : rel >= 0 ? 'mid' : 'bad'}>{signed(rel)} · {disposition(rel).toLowerCase()}</span><span>{ruler.traits.join(', ')}</span></div>}
      {ruler?.note && !mine && <p className={styles.note}>{ruler.note}</p>}
      {ruler?.second && !mine && <p className={styles.duality}><b>Duas consciências.</b> {ruler.name} e {ruler.second.name} ({ruler.second.traits[0]}) pesam cada proposta. Convencer uma não basta.</p>}
    </div>
  </div>
}

function Sighted({ game, p, act }: { game: GameState; p: Province; act: Act }) {
  const q = expeditionQuote(game, p.id)
  const busy = game.campaign.expeditions.some(e => !e.completed && e.provinceId === p.id)
  return <>
    <div className={styles.k}>terra avistada · {p.terrain}</div><h4>Além das suas terras</h4>
    <p className={styles.note}>Daqui só se vê o relevo. Não sabemos quem governa, o que produz nem quantos homens guardam esta terra.</p>
    <div className={styles.acts}>
      <Action cost={1} label={busy ? 'Batedores a caminho' : 'Enviar batedores'} detail={`${q.gold} ouro · ${q.food} grãos · ${q.days} dias · risco baixo`} disabled={busy ? 'aguarde o retorno' : !canExplore(game, p.id) && (q.route.length < 2 ? 'sem caminho conhecido' : 'limite de 2 expedições')} onClick={() => act(g => withOrder(g, g => sendExpedition(g, p.id), 1), 'Batedores partiram')}/>
    </div>
    <p className={styles.small}>Ou leve a comitiva de Irian até lá: quem anda pelo mapa descobre a terra e conhece o lorde em pessoa.</p>
  </>
}

function Ways({ game, p, onOpen }: { game: GameState; p: Province; onOpen: (path: 0 | 1 | 2) => void }) {
  if (isVassal(game, p.governingHouseId)) return null
  const plans = ([0, 1, 2] as const).map(i => conquestPlan(game, p.id, i))
  const best = plans.reduce((b, pl, i) => pl.level > plans[b].level ? i : b, 0)
  return <section className={styles.ways}><span className={styles.cardH}>caminhos para tomar {p.name}</span>
    {plans.map((pl, i) => <button key={i} className={`${styles.way} ${i === best ? styles.best : ''}`} onClick={() => onOpen(i as 0 | 1 | 2)}>
      <span className={styles.wayName}>{PATH_LABEL[i]}</span>
      <span className={styles.lvl} style={{ ['--pc' as string]: PATH_COLOR[i] }}>{pl.stages.map((s, k) => <i key={k} className={s.done ? styles.on : ''}/>)}</span>
      <span className={styles.go}>{pl.next} ›</span>
    </button>)}
  </section>
}

const TAX: Record<TaxLevel, string> = { baixo: 'Baixo', normal: 'Normal', alto: 'Alto' }
const WORKS: InvestmentKind[] = ['farms', 'market', 'mine', 'barracks']
const pct = (n: number) => `${n >= 0 ? '+' : '−'}${Math.abs(n * 100).toFixed(1).replace('.', ',')}%`
/** Your province: what it yields, how its people grow, and every lever of rule. */
function OwnTerritory({ game, p, act }: { game: GameState; p: Province; act: Act }) {
  const b = provinceBalance(game, p), admin = adminOf(game, p.id), ui = useUI()
  const seat = p.id === houseOf(game, game.playerHouseId).seatProvinceId
  const former = formerHouse(game, p), vassal = former && game.campaign.vassals.find(v => v.houseId === former.id)
  const govs = governorCandidates(game), current = game.campaign.characters.find(c => c.id === admin.governor)
  const conditions = (['seca', 'peste', 'bandidos'] as const).filter(k => conditionOf(game, p.id, k))
  const until = (k: string) => game.campaign.conditions.filter(c => c.provinceId === p.id && c.kind === k).reduce((m, c) => Math.max(m, c.until), 0) - game.day
  const COND = { seca: 'Seca: colheita pela metade', peste: 'Febre: a população cai', bandidos: 'Bandidos: renda −30%' }
  return <>
    <div className={styles.stats}>
      <span><b>{fmt(p.population)}</b>habitantes<em className={b.growth.perMonth >= 0 ? styles.up : styles.down}>{signed(b.growth.perMonth)}/mês</em></span>
      <span><b>{p.loyalty}%</b>lealdade</span>
      <span><b>{signed(b.out.gold - b.administration)}</b>ouro/mês</span>
      <span><b>{signed(b.out.food - b.consumption)}</b>grãos/mês</span>
    </div>
    {conditions.map(k => <p key={k} className={styles.alert}>{COND[k]} por mais {until(k)} dias.</p>)}
    <div className={styles.growth} aria-label="Por que a população muda">{b.growth.factors.map(([label, v]) => <span key={label} className={v >= 0 ? styles.up : styles.down}>{pct(v)} {label}</span>)}</div>
    <Section title="imposto">
      <div className={styles.segment} role="radiogroup" aria-label="Imposto">{(Object.keys(TAX) as TaxLevel[]).map(t => <button key={t} role="radio" aria-checked={admin.tax === t} onClick={() => act(g => setTax(g, p.id, t))}>{TAX[t]}<small>{t === 'baixo' ? 'ouro ×0,6 · +2 lealdade' : t === 'alto' ? 'ouro ×1,4 · −3 lealdade' : 'equilíbrio'}</small></button>)}</div>
    </Section>
    {!seat && <Section title="governador">
      <select className={styles.select} value={admin.governor ?? ''} onChange={e => act(g => setGovernor(g, p.id, e.target.value || null), 'Governador nomeado')} aria-label="Governador">
        <option value="">ninguém (lealdade −1/mês)</option>
        {current && <option value={current.id}>{current.name} · {current.role.toLowerCase()}</option>}
        {govs.map(c => <option key={c.id} value={c.id}>{c.name} · {c.role.toLowerCase()}</option>)}
      </select>
      <p className={styles.small}>Longe de Irian, a terra precisa de alguém que governe por ele: +1 lealdade/mês, mais se for bom diplomata.</p>
    </Section>}
    {vassal && <Section title={`a antiga ${former!.name}`}>
      <p className={styles.small}>{rulerOf(game, former!.id).name} jurou lealdade e perdeu o governo destas terras. Lealdade da família: <b>{vassal.loyalty}</b>{vassal.loyalty < 30 ? ' (perigo de revolta)' : ''}.</p>
      <Action tone="sec" label={`Falar com ${rulerOf(game, former!.id).name}`} onClick={() => ui.openSheet({ kind: 'conversation', characterId: rulerOf(game, former!.id).id })}/>
    </Section>}
    <Section title="obras">{WORKS.map(kind => { const rule = BALANCE.investment[kind], q = workQuote(game, p.id, kind), wip = workInProgress(game, p.id, kind)
      const benefit = kind === 'mine' ? `+${mineYield(p).amount} ${mineYield(p).label}/mês` : rule.benefit
      return <button key={kind} className={styles.work} disabled={Boolean(wip) || q.max} onClick={() => act(g => withOrder(g, g => startInvestment(g, kind, p.id), 1), 'Obras iniciadas')}>
        <span className={styles.workName}>{rule.name}<small>{benefit} por nível</small></span>
        <span className={styles.pips}>{[1, 2, 3].map(i => <i key={i} className={i <= q.level ? styles.on : wip && i === q.next ? styles.wip : ''}/>)}</span>
        <span className={styles.workCost}>{wip ? `${wip.endDay - game.day} dias` : q.max ? 'máximo' : <>{q.gold} ouro · {q.wood} mad.<small>{q.days} dias</small></>}</span>
      </button> })}</Section>
    <Section title="produz">{<div className={styles.resRow}>{resList(p.resources)}</div>}</Section>
    {seat && <div className={styles.acts}><Action tone="sec" label="Falar com a corte" detail="mãe, irmãos, intendente" onClick={() => ui.openSheet({ kind: 'conversation', characterId: 'court-0' })}/></div>}
  </>
}
function ForeignTerritory({ game, p, act }: { game: GameState; p: Province; act: Act }) {
  const house = houseOf(game, p.governingHouseId), contact = game.campaign.contacts.find(c => c.houseId === house.id)
  const lack = RESOURCES.filter(r => !p.resources.includes(r)).slice(0, 2)
  const pending = game.campaign.diplomacy.some(d => d.houseId === house.id && d.kind === 'emissary' && !d.completed)
  return <>
    <div className={styles.resRow}><b className={styles.mini}>produz</b>{resList(p.resources)}<b className={styles.mini}>falta</b>{resList(lack)}</div>
    {!contact && house.id !== game.playerHouseId && !isVassal(game, house.id) && <div className={styles.acts}><Action cost={1} label={pending ? 'Emissário a caminho' : 'Enviar emissário'} detail={`${BALANCE.diplomacy.gold} ouro · ${BALANCE.diplomacy.days}+ dias`} disabled={pending && 'aguarde'} onClick={() => act(g => withOrder(g, g => sendEmissary(g, p.id), 1), 'Emissário enviado')}/></div>}
  </>
}

function OwnDiplomacy({ game, p, act }: { game: GameState; p: Province; act: Act }) {
  const missing = RESOURCES.filter(r => !controlled(game).some(c => c.resources.includes(r)))
  const trades = game.campaign.contacts.filter(c => c.trade)
  return <>
    <Section title="faltam nas suas terras"><div className={styles.resRow}>{resList(missing)}</div></Section>
    <Section title="comprar de quem produz">
      {missing.flatMap(r => sellers(game, r).slice(0, 3).map(h => { const q = purchaseQuote(game, h.id, r); return <Action cost={1} key={r + h.id} tone="sec" label={`${q.amount} de ${r} · ${h.name.replace('Casa ', '')}`} detail={`${q.price} ouro`} disabled={q.refuses ?? false} onClick={() => act(g => withOrder(g, g => buyResource(g, h.id, r), 1), 'Compra feita')}/> }))}
      {!missing.some(r => sellers(game, r).length) && <p className={styles.small}>Ninguém que você conheça produz o que falta. Explore e faça contato.</p>}
    </Section>
    <Section title="pactos comerciais">{trades.length ? trades.map(c => <div key={c.houseId} className={styles.line}>{houseOf(game, c.houseId).name} · +{BALANCE.diplomacy.tradeIncome} ouro/mês</div>) : <p className={styles.small}>Nenhum ainda. Toque numa casa vizinha para negociar.</p>}</Section>
    <p className={styles.small}>{p.name}: produz {p.resources.join(' e ')}.</p>
  </>
}
function ForeignDiplomacy({ game, p, act }: { game: GameState; p: Province; act: Act }) {
  const ui = useUI(), house = houseOf(game, p.governingHouseId), contact = game.campaign.contacts.find(c => c.houseId === house.id)
  const open = game.campaign.negotiations.find(n => n.houseId === house.id && (n.status === 'aberta' || n.status === 'aguardando'))
  const negotiate = (kind: Negotiation['kind']) => act(g => { const n = startNegotiation(g, house.id, kind); ui.openSheet({ kind: 'negotiation', negotiationId: n.campaign.negotiations.at(-1)!.id }); return n })
  if (house.id === game.playerHouseId || isVassal(game, house.id)) return <p className={styles.small}>Esta terra é sua: toda a produção vai para o seu tesouro.</p>
  if (!contact || contact.establishedDay === null) return <><p className={styles.note}>Sem contato. Um emissário abre as portas.</p><div className={styles.acts}><Action cost={1} label="Enviar emissário" detail={`${BALANCE.diplomacy.gold} ouro`} disabled={game.campaign.diplomacy.some(d => d.houseId === house.id && !d.completed) && 'a caminho'} onClick={() => act(g => withOrder(g, g => sendEmissary(g, p.id), 1), 'Emissário enviado')}/></div></>
  const giftWait = contact.lastGiftDay === null ? 0 : Math.max(0, contact.lastGiftDay + BALANCE.diplomacy.giftCooldown - game.day)
  return <>
    <Section title="por que esta relação"><ul className={styles.reasons}>{contact.reasons.slice(0, 4).map(r => <li key={r}>{r}</li>)}</ul></Section>
    <div className={styles.status}><span className={contact.trade ? styles.on : ''}>comércio</span><span className={contact.alliance ? styles.on : ''}>aliança</span><span>vassalagem</span></div>
    <div className={styles.acts}>
      {open ? <Action label="Ver a negociação" detail={open.status === 'aguardando' ? `resposta em ${open.replyDay - game.day} dias` : `rodada ${open.round}`} onClick={() => ui.openSheet({ kind: 'negotiation', negotiationId: open.id })}/>
        : (['comércio', 'aliança', 'vassalagem'] as const).map(k => <Action key={k} label={`Negociar ${NEGOTIATION_LABEL[k].toLowerCase()}`} tone={k === 'comércio' ? undefined : 'sec'} disabled={negotiationBlocked(game, house.id, k) ?? false} onClick={() => negotiate(k)}/>)}
      <Action cost={orderCost(game, house.id)} tone="sec" label="Enviar presente" detail={`${BALANCE.diplomacy.giftGold} ouro · +10 relação`} disabled={giftWait > 0 && `de novo em ${giftWait} dias`} onClick={() => act(g => withOrder(g, g => diplomaticAction(g, house.id, 'gift'), orderCost(game, house.id)), 'Presente enviado')}/>
      {p.resources.filter(r => r !== 'grãos').map(r => { const q = purchaseQuote(game, house.id, r); return <Action cost={1} key={r} tone="sec" label={`Comprar ${q.amount} de ${r}`} detail={`${q.price} ouro`} disabled={q.refuses ?? false} onClick={() => act(g => withOrder(g, g => buyResource(g, house.id, r), 1), 'Compra feita')}/> })}
    </div>
  </>
}

function OwnMilitary({ game, p, act }: { game: GameState; p: Province; act: Act }) {
  const men = game.campaign.garrisons[p.id] ?? 0, cap = levyCap(game, p), wall = wallLevel(game, p), M = BALANCE.military
  const [to, setTo] = useState<Id | ''>('')
  const [count, setCount] = useState(Math.min(100, men))
  const realm = game.world.provinces.filter(x => x.id !== p.id && inPlayerRealm(game, x.id))
  return <>
    <div className={styles.stats}><span><b>{men}</b>homens</span><span><b>{cap}</b>máximo</span><span><b>{wall}</b>muralha</span><span><b>{game.campaign.armies.filter(a => a.houseId === game.playerHouseId).length}</b>em marcha</span></div>
    <p className={styles.small}>Até {Math.round((M.levyShare + M.barracksShare * workQuote(game, p.id, 'barracks').level) * 100)}% da população pode servir ({fmt(p.population)} habitantes). A população cresce {signed(provinceBalance(game, p).growth.perMonth)} por mês; fazendas, comida e lealdade aceleram. Um quartel (visão Território) aumenta o limite.</p>
    <div className={styles.acts}>
      <Action label={`Recrutar ${M.recruitBatch} homens`} detail={`${M.recruitGold} ouro · ${M.recruitRenown} renome · ${M.recruitIron} ferro`} disabled={men + M.recruitBatch > cap && 'população no limite'} onClick={() => act(g => recruit(g, p.id), 'Recrutamento')}/>
      <Action cost={1} tone="sec" label={`Reforçar muralhas (nível ${wall + 1})`} detail={`${M.wallUpgrade.stone} pedra · ${M.wallUpgrade.gold} ouro`} disabled={wall >= 5 && 'nível máximo'} onClick={() => act(g => withOrder(g, g => upgradeWalls(g, p.id), 1), 'Muralhas reforçadas')}/>
    </div>
    {realm.length > 0 && <Section title="deslocar tropas">
      <div className={styles.moveRow}><select value={to} onChange={e => setTo(e.target.value)} aria-label="Destino"><option value="">destino…</option>{realm.map(x => <option key={x.id} value={x.id}>{x.name} ({game.campaign.garrisons[x.id] ?? 0})</option>)}</select>
        <input type="range" min={50} max={Math.max(50, men)} step={25} value={count} onChange={e => setCount(+e.target.value)} aria-label="Homens"/><b>{count}</b></div>
      <Action cost={1} tone="sec" label="Marchar" disabled={(!to || men < 50) && 'escolha destino e homens'} onClick={() => act(g => withOrder(g, g => moveTroops(g, p.id, to as Id, count), 1), 'Tropas em marcha')}/>
    </Section>}
  </>
}
function ForeignMilitary({ game, p, act }: { game: GameState; p: Province; act: Act }) {
  const seat = houseOf(game, game.playerHouseId).seatProvinceId, ui = useUI()
  const men = game.campaign.garrisons[seat] ?? 0
  const [count, setCount] = useState(Math.max(50, Math.min(men, 400)))
  if (inPlayerRealm(game, p.id)) return <p className={styles.small}>Território seu. Defensores: {defenders(game, p)}.</p>
  const q = attackQuote(game, seat, p.id), party = playerParty(game), here = party.provinceId === p.id && !party.siegeArmyId
  const war = game.campaign.armies.find(a => a.houseId === game.playerHouseId && a.targetProvinceId === p.id && a.order === 'atacar')
  return <>
    <div className={styles.stats}><span><b>~{Math.round(q.defenders / 10) * 10}</b>defensores</span><span><b>{q.wall}</b>muralha</span><span><b>{q.days}d</b>marcha</span><span><b>{q.siegeDays}d</b>cerco</span></div>
    <p className={q.justified ? styles.small : styles.alert}>{q.justified ? 'Você tem justificativa para esta guerra.' : `Sem justificativa: −${BALANCE.military.unjustRenown} de renome, e as casas vão desconfiar. Um espião pode fabricar uma reivindicação.`}</p>
    {here && !war && <div className={styles.acts}><Action tone="war" label={`Cercar ${p.name} com a comitiva`} detail={`${party.men} homens · assalto em ${q.siegeDays} dias${party.men < q.recommended ? ` · recomendado ${q.recommended}` : ''}${p.governingHouseId === liegeOf(game) ? ' · é guerra contra o seu suserano' : !q.justified ? ` · sem justificativa: −${BALANCE.military.unjustRenown} renome` : ''}`} disabled={party.men < BALANCE.military.partySiegeMin && `precisa de ${BALANCE.military.partySiegeMin} homens`} onClick={() => act(g => besiegeWithParty(g), 'Cerco iniciado')}/></div>}
    {war ? <p className={styles.small}>{war.party ? 'Irian e a comitiva' : 'Seu exército'} de {war.men} homens {war.status === 'marchando' ? 'está a caminho' : war.status === 'sitiando' ? `cerca as muralhas${war.siegeEndDay ? ` (assalto em ${Math.max(0, war.siegeEndDay - game.day)} dias)` : ''}` : 'aguarda a ordem de assalto'}.</p> : <>
      <div className={styles.moveRow}><span>Homens</span><input type="range" min={50} max={Math.max(50, men)} step={25} value={count} onChange={e => setCount(+e.target.value)} aria-label="Homens para a campanha"/><b>{count}</b></div>
      <p className={styles.small}>Recomendado: {q.recommended}. Você tem {men} em Pontevela.</p>
      <div className={styles.acts}>
        <Action cost={1} tone="war" label={`Marchar contra ${p.name}`} detail={`${count} homens`} disabled={(men < 50 || q.route.length < 2) && (q.route.length < 2 ? 'sem caminho' : 'homens insuficientes')} onClick={() => act(g => withOrder(g, g => attack(g, seat, p.id, Math.min(count, g.campaign.garrisons[seat] ?? 0)), 1), 'Marcha de guerra')}/>
        <Action tone="sec" label="Ver o plano de conquista" onClick={() => ui.openSheet({ kind: 'plan', provinceId: p.id, path: 0 })}/>
      </div>
    </>}
    {!q.justified && <SpyMission game={game} p={p} kind="reivindicação" act={act}/>}
  </>
}

function OwnInfluence({ game, act }: { game: GameState; act: Act }) {
  const agents = game.campaign.agents
  const name = (id: string) => game.campaign.characters.find(c => c.id === id)!
  return <>
    <Section title="seus agentes">{agents.map(a => { const c = name(a.characterId), busy = game.campaign.spyMissions.find(m => m.agentId === a.id && !m.completed); return <div key={a.id} className={styles.agent}>
      <span><b>{c.name}</b> · {c.role.toLowerCase()} · {RACE_LABEL[c.race].toLowerCase()}<small>intriga {c.intrigue} · lealdade {a.loyalty} · {a.description}</small></span>
      {a.hired ? <em>{busy ? `em missão · ${busy.endDay - game.day}d` : 'disponível'}</em> : <button className={styles.mini2} onClick={() => act(g => hireSpy(g, a.id), 'Agente contratado')}>contratar · {BALANCE.spy.gold}</button>}
    </div> })}</Section>
    <p className={styles.small}>Agentes custam {BALANCE.spy.upkeep} de ouro por mês. Mande-os a outras casas na visão Influência ou Militar.</p>
  </>
}
function SpyMission({ game, p, kind, act }: { game: GameState; p: Province; kind: 'investigar' | 'segredo' | 'reivindicação'; act: Act }) {
  const free = game.campaign.agents.filter(a => a.hired && !game.campaign.spyMissions.some(m => m.agentId === a.id && !m.completed))
  const q = spyQuote(game, p.id, kind)
  const label = kind === 'reivindicação' ? 'Fabricar reivindicação' : kind === 'segredo' ? 'Buscar um segredo' : 'Investigar a província'
  return <Action cost={1} tone="sec" label={label} detail={`espião · ${q.gold} ouro · ${q.days} dias`} disabled={!free.length ? 'contrate um agente (sua província, Influência)' : !q.route.length && 'sem rota conhecida'} onClick={() => act(g => withOrder(g, g => sendSpy(g, free[0].id, p.id, kind), 1), 'Agente enviado')}/>
}
function ForeignInfluence({ game, p, act }: { game: GameState; p: Province; act: Act }) {
  const house = houseOf(game, p.governingHouseId), I = BALANCE.influence
  if (isVassal(game, house.id)) { const v = game.campaign.vassals.find(x => x.houseId === house.id)!; return <div className={styles.stats}><span><b>{v.loyalty}</b>lealdade</span><span><b>{v.terms ?? '—'}</b>termos</span><span><b>{v.path}</b>caminho</span></div> }
  const inf = influenceOf(game, house.id), bond = bondWith(game, house.id), debt = debtOf(game, house.id), can = canInfluence(game, house.id)
  if (!can) return <p className={styles.note}>Sem acesso à corte. Estabeleça contato primeiro (Diplomacia).</p>
  const wait = (k: string, d: number) => { const n = cooldownLeft(game, house.id, k, d); return n > 0 && `de novo em ${n} dias` }
  return <>
    <div className={styles.meterRow}><span>influência</span><span className={styles.meter}><i style={{ width: `${inf}%` }}/><em style={{ left: `${I.oathThreshold}%` }}/></span><b>{inf}%</b></div>
    <p className={styles.small}>{bond ? `Laço: ${bond.text}` : 'Sem laço ainda: dívida, segredo ou casamento.'}</p>
    <div className={styles.acts}>
      {oathReady(game, house.id) && <Action cost={orderCost(game, house.id)} label="Convidar ao juramento" detail="cerimônia de vassalagem" onClick={() => act(g => withOrder(g, g => proposeOath(g, house.id), orderCost(game, house.id)))}/>}
      <Action cost={orderCost(game, house.id)} tone="sec" label="Oferecer um banquete" detail={`${I.banquet.gold} ouro · ${I.banquet.food} grãos · +${I.banquet.gain}%`} disabled={wait('banquete', I.banquet.cooldown)} onClick={() => act(g => withOrder(g, g => influenceAction(g, house.id, 'banquete'), orderCost(game, house.id)), 'Banquete')}/>
      <Action cost={orderCost(game, house.id)} tone="sec" label="Patrocinar a corte" detail={`${I.patronage.silver} prata · +${I.patronage.gain}%`} disabled={wait('patrocínio', I.patronage.cooldown)} onClick={() => act(g => withOrder(g, g => influenceAction(g, house.id, 'patrocínio'), orderCost(game, house.id)), 'Patrocínio')}/>
      {debt && <Action cost={orderCost(game, house.id)} tone="sec" label={`Comprar a dívida (${fmt(debt.amount)} ouro)`} detail={`deve à ${debt.creditor}`} onClick={() => act(g => withOrder(g, g => influenceAction(g, house.id, 'dívida'), orderCost(game, house.id)), 'Dívida comprada')}/>}
      <Action cost={orderCost(game, house.id)} tone="sec" label="Propor casamento" detail={`${I.marriage.renown} renome · exige relação +${I.marriage.relation}`} disabled={relationWith(game, house.id) < I.marriage.relation && `relação ${relationWith(game, house.id)}`} onClick={() => act(g => withOrder(g, g => influenceAction(g, house.id, 'casamento'), orderCost(game, house.id)), 'Promessa de casamento')}/>
      <SpyMission game={game} p={provinceOf(game, house.seatProvinceId)} kind="segredo" act={act}/>
      {knowledge(game, p.id) < 3 && <SpyMission game={game} p={p} kind="investigar" act={act}/>}
    </div>
  </>
}
