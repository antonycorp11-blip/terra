import { useEffect, useState, type ReactElement } from 'react'
import type { GameState } from '../../engine/types'
import type { Decision } from '../../engine/mvpTypes'
import { choicesFor, resolveDecision } from '../../engine/decisions'
import { defenders, wallLevel } from '../../engine/military'
import { fieldQuote } from '../../engine/party'
import { BALANCE } from '../../engine/balance'
import Crest from '../Heraldry'
import Icon, { ResourceIcon, type IconName } from '../Icons'
import { type Act } from '../parts'
import { cardUrl, heraldryOf, houseOf, mapColor, provinceOf } from '../view'
import { sfx } from '../sfx'
import styles from './Game.module.css'

/** One soldier: shield in the house colour, helmet, spear. Fallen soldiers topple and fade. */
function Soldier({ x, y, color, flip, fallen, delay = 0 }: { x: number; y: number; color: string; flip?: boolean; fallen?: boolean; delay?: number }) {
  return <g transform={`translate(${x} ${y})`}>
    <g className={`${styles.soldier} ${fallen ? styles.fallen : ''}`} style={{ animationDelay: `${delay}ms` }}>
      <g transform={`scale(${flip ? -1 : 1} 1)`}>
        <ellipse cx="0" cy="13" rx="6" ry="1.8" fill="#000" opacity=".28"/>
        <path d="M-2.5 6l-1.2 7M2.5 6l1.2 7" stroke="#2b2116" strokeWidth="1.8" strokeLinecap="round"/>
        <rect x="-3.6" y="-3" width="7.2" height="10.5" rx="2" fill="#6d5a40" stroke="#1b130a" strokeWidth=".7"/>
        <circle cx="0" cy="-6" r="3.2" fill="#e3c39e" stroke="#1b130a" strokeWidth=".6"/>
        <path d="M-3.4 -7.2a3.4 3.6 0 0 1 6.8 0z" fill="#9aa1a8" stroke="#1b130a" strokeWidth=".5"/>
        <path d="M5.4 -15V13" stroke="#5a3d1e" strokeWidth="1.1"/><path d="M5.4 -15l-1.5 3.4h3z" fill="#d9dee4"/>
        <path d="M-7 -1.5h6v6.5a3 3 0 0 1-3 3 3 3 0 0 1-3-3z" fill={color} stroke="#1b130a" strokeWidth=".7"/>
        <path d="M-4 0v6" stroke="rgba(255,255,255,.35)" strokeWidth=".8"/>
      </g>
    </g>
  </g>
}
/** A block of soldiers. Each figure stands for `unit` men. */
function Ranks({ count, color, side, x0, fallen, marching }: { count: number; color: string; side: 'left' | 'right'; x0: number; fallen: number; marching: boolean }) {
  const rows = 6
  return <g className={`${styles.ranks} ${marching ? styles.marching : ''}`} style={{ transform: `translateX(${x0}px)` }}>
    {Array.from({ length: count }, (_, i) => { const row = i % rows, col = Math.floor(i / rows)
      const x = side === 'left' ? -col * 17 - (row % 2) * 6 : col * 17 + (row % 2) * 6
      return <Soldier key={i} x={x} y={90 + row * 16} color={color} flip={side === 'right'} fallen={i >= count - fallen} delay={(i * 53) % 400}/> })}
  </g>
}
function Banner({ x, color, children }: { x: number; color: string; children: ReactElement }) {
  return <g transform={`translate(${x} 40)`}><path d="M0 0v62" stroke="#3b2a12" strokeWidth="2"/><path d="M1 2h30l-6 10 6 10H1z" fill={color} stroke="#1b130a" strokeWidth=".8"/><foreignObject x="6" y="3" width="18" height="18">{children}</foreignObject></g>
}

/** A battle plays out in three beats: lines form, the clash with the chosen tactic, the rout. */
export function BattleScene({ game, battleId, onClose }: { game: GameState; battleId: string; onClose: () => void }) {
  const b = game.campaign.battles.find(x => x.id === battleId)!
  const [phase, setPhase] = useState(0)
  useEffect(() => { if (phase >= 3) return; const t = window.setTimeout(() => setPhase(phase + 1), phase === 0 ? 1100 : 1900); return () => window.clearTimeout(t) }, [phase])
  const att = houseOf(game, b.attackerHouseId), def = houseOf(game, b.defenderHouseId), p = provinceOf(game, b.provinceId)
  // Outlaws have no house: they fight under a ragged red banner.
  const outlaw = b.bandit?.side === 'defender'
  const defName = outlaw ? b.bandit!.name : def.name, defColor = outlaw ? '#5a1d16' : mapColor(game, def.id), attColor = mapColor(game, att.id)
  const shown = b.phases[Math.min(phase, 2)]
  const playerWon = (b.attackerHouseId === game.playerHouseId) === b.victory
  useEffect(() => { if (phase === 0) sfx.drums(); else if (phase === 1) sfx.clash(); else if (phase === 3 && playerWon) sfx.fanfare() }, [phase]) // eslint-disable-line react-hooks/exhaustive-deps
  const unit = Math.max(5, Math.ceil(Math.max(b.attackerStart, b.defenderStart) / 42))
  const nA = Math.max(1, Math.ceil(b.attackerStart / unit)), nD = Math.max(1, Math.ceil(b.defenderStart / unit))
  const lossA = nA - Math.ceil(shown.attacker / unit), lossD = nD - Math.ceil(Math.max(0, shown.defender) / unit)
  const forest = p.terrain === 'floresta', hills = p.terrain === 'colina' || p.terrain === 'montanha', coast = p.terrain === 'litoral' || p.terrain === 'várzea'
  // Lines: far apart, then meet in the middle; at the end the loser falls back.
  const ax = phase === 0 ? 150 : phase === 1 ? 262 : b.victory ? 300 : 200, dx = phase === 0 ? 450 : phase === 1 ? 300 : b.victory ? 420 : 300
  return <div className={`${styles.backdrop} ${styles.battleBack}`} data-ui>
    <section className={`${styles.sheet} ${styles.wide} ${styles.battle}`} role="dialog" aria-label={`Batalha de ${p.name}`}>
      <header className={styles.battleHead}>
        <div><Crest heraldry={heraldryOf(game, att)} size={30}/><b>{att.name}</b><span>{shown.attacker}</span></div>
        <div className={styles.battleTitle}><h3>{b.wall ? 'Batalha de' : 'Combate em'} {p.name}</h3><span>{shown.label}{b.wall ? ` · muralha nível ${b.wall}` : ''}</span></div>
        <div><span>{Math.max(0, shown.defender)}</span><b>{defName}</b>{outlaw ? <Icon name="militar" size={26}/> : <Crest heraldry={heraldryOf(game, def)} size={30}/>}</div>
      </header>
      <svg className={styles.field} viewBox="0 0 600 220" preserveAspectRatio="xMidYMid slice" aria-hidden>
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#5d7f8f"/><stop offset="1" stopColor="#c9c09a"/></linearGradient>
          <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1"><stop stopColor={hills ? '#7d7b4a' : '#738f45'}/><stop offset="1" stopColor={hills ? '#55583a' : '#43602c'}/></linearGradient>
        </defs>
        <rect width="600" height="220" fill="url(#sky)"/>
        <path d={hills ? 'M0 70L60 30 120 62 190 18 260 60 330 26 400 64 470 22 540 58 600 34V90H0z' : 'M0 78Q80 56 160 72T320 68T480 70T600 66V90H0z'} fill={hills ? '#6b7268' : '#5d7a52'} opacity=".75"/>
        {coast && <rect y="66" width="600" height="10" fill="#4f7f96" opacity=".7"/>}
        <rect y="76" width="600" height="144" fill="url(#ground)"/>
        {Array.from({ length: 70 }, (_, i) => <path key={i} d={`M${(i * 89) % 600} ${84 + (i * 37) % 130}l2 -4 2 4`} stroke="#35501f" strokeWidth="1" fill="none" opacity=".55"/>)}
        {forest && Array.from({ length: 14 }, (_, i) => <g key={i} transform={`translate(${i * 45 + 10} ${70 + (i % 3) * 3})`}><path d="M0 0l-9 18h18z" fill="#2f4a26"/><path d="M0 -10l-7 14h14z" fill="#3b5a2e"/></g>)}
        {b.wall > 0 && <g transform="translate(548 70)"><rect x="0" y="0" width="52" height="130" fill="#9b958a" stroke="#4a463f"/>{Array.from({ length: 7 }, (_, i) => <rect key={i} x="-6" y={i * 19} width="12" height="10" fill="#b8b2a6" stroke="#4a463f"/>)}{phase >= 2 && b.victory && <path d="M0 40l18 12-8 14 14 10" stroke="#2a2016" strokeWidth="3" fill="none"/>}</g>}
        <Banner x={18} color={attColor}><Crest heraldry={heraldryOf(game, att)} size={18}/></Banner>
        <Banner x={b.wall ? 520 : 552} color={defColor}>{outlaw ? <span/> : <Crest heraldry={heraldryOf(game, def)} size={18}/>}</Banner>
        <Ranks count={nA} color={attColor} side="left" x0={ax} fallen={lossA} marching={phase === 1}/>
        <Ranks count={nD} color={defColor} side="right" x0={dx} fallen={lossD} marching={phase === 1}/>
        {phase === 1 && <g className={styles.clash}>{Array.from({ length: 9 }, (_, i) => <circle key={i} cx={281 + ((i * 7) % 9) - 4} cy={95 + i * 12} r={5 + (i % 3) * 2} fill="#fff1c4"/>)}</g>}
        {phase >= 1 && <g className={styles.dust}>{Array.from({ length: 6 }, (_, i) => <ellipse key={i} cx={240 + i * 22} cy={200 - (i % 2) * 8} rx="26" ry="9" fill="#d9c9a0"/>)}</g>}
      </svg>
      <div className={styles.phases}>{b.phases.map((ph, i) => <span key={i} className={i <= phase ? styles.on : ''}>{ph.label}</span>)}</div>
      {phase >= 3 && <div className={`${styles.result} ${playerWon ? styles.win : styles.lose}`}><h4>{playerWon ? 'Vitória' : 'Derrota'}</h4><p>{b.summary}</p><button className={styles.btn} onClick={onClose}>Continuar</button></div>}
      {phase < 3 && <button className={styles.skip} onClick={() => setPhase(3)}>pular</button>}
    </section>
  </div>
}

const EVENT_ICON: Record<string, IconName> = { marco: 'renown', prisioneiro: 'houses', bandidos: 'militar', motim: 'militar', revolta: 'militar', mercador: 'gold', emprestimo: 'gold', espiao: 'speech', contra: 'influencia', refugiados: 'houses', peticao: 'houses', torneio: 'renown', casamento: 'influencia', peste: 'bell', sucessao: 'houses' }
/** Decisions that pause the world: the siege assault, oaths, the liege's letters and the crown's offer. */
export function DecisionScene({ game, decision, act }: { game: GameState; decision: Decision; act: Act }) {
  const choices = choicesFor(game, decision)
  const house = decision.houseId ? houseOf(game, decision.houseId) : null
  const ruler = house ? game.campaign.characters.find(c => c.id === `ruler-${house.id}`) : null
  const player = houseOf(game, game.playerHouseId)
  const choose = (id: string) => act(g => resolveDecision(g, decision.id, id))
  let art: ReactElement | null = null, title = '', text = ''
  if (decision.kind === 'combate') {
    const q = fieldQuote(game, decision), p = provinceOf(game, decision.provinceId!), irian = game.campaign.characters.find(c => c.id === `ruler-${player.id}`)!
    const foe = q.enemy, bandit = foe?.kind === 'bandidos'
    title = decision.ambush ? `Emboscada em ${p.name}` : `Combate em ${p.name}`
    text = `${q.mine} homens de Irian contra ${foe?.men ?? 0} ${bandit ? `de ${foe!.name}` : `da escolta da ${house?.name}`}. Terreno: ${p.terrain}${q.cover ? ' (bom para emboscadas)' : ''}. ${q.odds >= 1.4 ? 'Vocês são bem mais fortes.' : q.odds >= 1 ? 'Forças parecidas: a tática decide.' : 'Eles são mais fortes. Recuar não é vergonha.'}`
    art = <div className={styles.duel}>
      <div className={styles.side}>{irian.portraitAsset && <img src={cardUrl(irian.portraitAsset)} alt="Irian"/>}<span><Crest heraldry={heraldryOf(game, player)} size={22}/><b>{q.mine}</b></span></div>
      <div className={styles.odds}><i style={{ width: `${Math.min(100, q.odds / (q.odds + 1) * 100)}%` }}/></div>
      <div className={styles.side}>{bandit ? <span className={styles.outlawArt}><Icon name="militar" size={64}/></span> : ruler?.portraitAsset && <img src={cardUrl(ruler.portraitAsset)} alt={ruler.name}/>}<span>{bandit ? <Icon name="militar" size={18}/> : <Crest heraldry={heraldryOf(game, house!)} size={22}/>}<b>{foe?.men ?? 0}</b></span></div>
    </div>
  } else if (decision.kind === 'assalto') {
    const army = game.campaign.armies.find(a => a.id === decision.armyId)!, p = provinceOf(game, decision.provinceId!), wall = wallLevel(game, p)
    title = `As muralhas de ${p.name}`; text = `${army.men} homens seus cercam ${p.name}. Defensores estimados: ~${Math.round(defenders(game, p) / 10) * 10} atrás de muralhas de nível ${wall}.${army.starved ? ' A guarnição está faminta.' : ''} Como atacar?`
    art = <svg className={styles.siegeArt} viewBox="0 0 300 120" aria-hidden>
      <rect width="300" height="120" fill="#5b6f3c"/><path d="M0 95h300v25H0z" fill="#4a5c30"/>
      <g transform="translate(150 22)">{Array.from({ length: wall + 1 }, (_, i) => <g key={i} transform={`translate(${(i - wall / 2) * 26} 0)`}><rect x="-9" y="0" width="18" height="60" fill="#a39d90" stroke="#4a463f"/><rect x="-11" y="-6" width="22" height="8" fill="#b9b3a6" stroke="#4a463f"/></g>)}<rect x={-wall * 13} y="22" width={wall * 26} height="38" fill="#948e82" stroke="#4a463f"/><path d="M-8 60v-14a8 8 0 0 1 16 0v14" fill="#2b2016"/></g>
      {Array.from({ length: Math.min(24, Math.ceil(army.men / 50)) }, (_, i) => <Soldier key={i} x={20 + (i % 12) * 22} y={100 + Math.floor(i / 12) * 10 - (i % 2) * 3} color={mapColor(game, player.id)}/>)}
    </svg>
  } else if (decision.kind === 'submissão' || decision.kind === 'juramento') {
    title = decision.kind === 'submissão' ? `${house!.name} se rende` : `Juramento da ${house!.name}`
    text = decision.kind === 'submissão' ? `${ruler?.name} ajoelha diante de Irian. A casa vai jurar lealdade; os termos são seus.` : `${ruler?.name} aceita jurar lealdade à ${player.name}. Que termos você oferece?`
    art = <div className={styles.oath}>
      <Crest heraldry={heraldryOf(game, player)} size={70}/>
      {ruler?.portraitAsset ? <img className={styles.kneel} src={cardUrl(ruler.portraitAsset)} alt={ruler.name}/> : <span/>}
      <Crest heraldry={heraldryOf(game, house!)} size={56}/>
    </div>
  } else if (decision.kind === 'evento') {
    const ev = decision.event!, p = decision.provinceId ? provinceOf(game, decision.provinceId) : null
    title = ev.title; text = ev.text
    // Events about another house show its lord; events in your land show the land and what struck it.
    art = ruler && house && house.id !== player.id ? <div className={styles.letter}>{ruler.portraitAsset && <img src={cardUrl(ruler.portraitAsset)} alt={ruler.name}/>}<div><Crest heraldry={heraldryOf(game, house)} size={44}/><b>{ruler.role} {ruler.name}</b><span>{house.name}</span></div></div>
      : <div className={styles.eventArt} data-key={ev.key}>{ev.key === 'seca' ? <ResourceIcon resource="grãos" size={44}/> : <Icon name={EVENT_ICON[ev.key] ?? 'bell'} size={40}/>}<div><b>{p?.name ?? player.name}</b><span>{p ? `${p.population.toLocaleString('pt-BR')} habitantes · lealdade ${p.loyalty}%` : ''}</span></div><Crest heraldry={heraldryOf(game, player)} size={40}/></div>
  } else {
    title = decision.kind === 'ultimato' ? `Ultimato da ${house?.name}` : decision.kind === 'rei' ? `A coroa escreve` : `Convocação da ${house?.name}`
    text = decision.kind === 'ultimato' ? `“Serraval cresce demais. Pague ${BALANCE.politics.submitGold} de ouro e renuncie às suas ambições, ou tomarei Pontevela.”` : decision.kind === 'rei' ? `“Hadrin envelhece, e Três Pontes precisa de mãos firmes. Pague ${BALANCE.politics.kingPactGold} de ouro à coroa e eu impedirei que ele marche contra você.”` : `“As incursões de Ardesh pedem homens. Mande ${BALANCE.politics.levyMen} dos seus a Torrealva, como manda o juramento.”`
    art = <div className={styles.letter}>{ruler?.portraitAsset && <img src={cardUrl(ruler.portraitAsset)} alt={ruler.name}/>}<div><Crest heraldry={heraldryOf(game, house!)} size={44}/><b>{ruler?.role} {ruler?.name}</b><span>{house?.name}</span></div></div>
  }
  return <div className={styles.backdrop} data-ui>
    <section className={`${styles.sheet} ${styles.decision}`} role="dialog" aria-label={title}>
      <span className={styles.k}>{decision.event?.key === 'marco' ? 'conquista' : decision.kind === 'evento' ? 'acontecimento' : decision.kind === 'combate' ? 'combate' : 'decisão'}</span><h3>{title}</h3>
      {art}
      <p className={styles.decisionText}>{text}</p>
      <div className={styles.choices}>{choices.map(c => <button key={c.id} className={styles.choice} onClick={() => choose(c.id)}><b>{c.label}</b><span>{c.detail}</span>{c.cost && <small>{c.cost}</small>}</button>)}</div>
    </section>
  </div>
}

/** The opening: who Irian is, what threatens him, and how to play. Shown once at the start of a campaign. */
export function IntroScene({ game, onStart }: { game: GameState; onStart: () => void }) {
  const player = houseOf(game, game.playerHouseId), irian = game.campaign.characters.find(c => c.id === `ruler-${player.id}`)!
  const liege = houseOf(game, provinceOf(game, player.seatProvinceId).liegeHouseId), old = game.campaign.characters.find(c => c.id === `ruler-${liege.id}`)!
  return <div className={styles.backdrop} data-ui>
    <section className={`${styles.sheet} ${styles.intro}`} role="dialog" aria-label="Começo da campanha">
      {irian.portraitAsset && <img className={styles.introFigure} src={cardUrl(irian.portraitAsset)} alt="Irian"/>}
      <div className={styles.introText}>
        <span className={styles.k}>ano 128 do pacto · {provinceOf(game, player.seatProvinceId).name}</span>
        <h3>Irian da {player.name}</h3>
        <p>Seu pai morreu na primavera, e {provinceOf(game, player.seatProvinceId).name} agora é sua: uma ponte, um rio e um nome pequeno. {old.name} da {liege.name}, o velho grão-lorde, não tem herdeiro claro. Salteadores rondam as estradas, e as casas vizinhas medem você.</p>
        <ul>
          <li><b>Toque em Irian</b> e leve a comitiva pelo mapa: 2 movimentos por turno.</li>
          <li><b>Cace bandos</b> por ouro e renome; as casas pagam recompensas.</li>
          <li><b>Converse em pessoa</b>, negocie, capture lordes em batalha.</li>
          <li><b>3 ordens por turno</b> para ações à distância. Depois, <b>encerre o turno</b>.</li>
        </ul>
        <p className={styles.goalLine}>Objetivo: fazer quatro casas de Três Pontes jurarem a você e virar grão-lorde.</p>
        <button className={styles.btn} onClick={onStart}>Pegar a espada</button>
      </div>
    </section>
  </div>
}
