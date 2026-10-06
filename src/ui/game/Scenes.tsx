import { useEffect, useState, type ReactElement } from 'react'
import type { GameState } from '../../engine/types'
import type { Decision } from '../../engine/mvpTypes'
import { choicesFor, resolveDecision } from '../../engine/decisions'
import { defenders, wallLevel } from '../../engine/military'
import { BALANCE } from '../../engine/balance'
import Crest from '../Heraldry'
import { type Act } from '../parts'
import { cardUrl, heraldryOf, houseOf, mapColor, provinceOf } from '../view'
import styles from './Game.module.css'

function Soldier({ x, y, color, flip, fallen }: { x: number; y: number; color: string; flip?: boolean; fallen?: boolean }) {
  return <g transform={`translate(${x} ${y}) scale(${flip ? -1 : 1} 1)`} className={fallen ? styles.fallen : undefined}>
    <ellipse cx="0" cy="9" rx="4" ry="1.4" fill="#000" opacity=".25"/>
    <rect x="-2.6" y="-1" width="5.2" height="8" rx="1.5" fill={color} stroke="#1b130a" strokeWidth=".6"/>
    <circle cx="0" cy="-3.6" r="2.4" fill="#e3c39e" stroke="#1b130a" strokeWidth=".5"/>
    <path d="M-2.6 -5.2h5.2l-.6-1.8h-4z" fill="#8a8f96"/>
    <path d="M3.6 -9V9" stroke="#5a3d1e" strokeWidth=".8"/><path d="M3.6 -9l-1 2.4h2z" fill="#cfd4da"/>
    <path d="M-4.4 1.5a2.6 3.4 0 0 0 0 5.2" fill={color} stroke="#1b130a" strokeWidth=".6"/>
  </g>
}
function Ranks({ men, color, side, advance, fallen }: { men: number; color: string; side: 'left' | 'right'; advance: number; fallen: number }) {
  const n = Math.max(1, Math.min(42, Math.ceil(men / 25))), cols = 7
  return <g className={styles.ranks} style={{ transform: `translateX(${side === 'left' ? advance : -advance}px)` }}>
    {Array.from({ length: n }, (_, i) => { const c = i % cols, r = Math.floor(i / cols); const x = side === 'left' ? 40 + r * 13 + (c % 2) * 3 : 360 - r * 13 - (c % 2) * 3; return <Soldier key={i} x={x} y={46 + c * 15} color={color} flip={side === 'right'} fallen={i >= n - fallen}/> })}
  </g>
}

/** A battle plays out in three phases: lines form, the chosen tactic, the outcome. */
export function BattleScene({ game, battleId, onClose }: { game: GameState; battleId: string; onClose: () => void }) {
  const b = game.campaign.battles.find(x => x.id === battleId)!
  const [phase, setPhase] = useState(0)
  useEffect(() => { if (phase >= 3) return; const t = window.setTimeout(() => setPhase(phase + 1), phase === 0 ? 900 : 1700); return () => window.clearTimeout(t) }, [phase])
  const att = houseOf(game, b.attackerHouseId), def = houseOf(game, b.defenderHouseId), p = provinceOf(game, b.provinceId)
  const shown = b.phases[Math.min(phase, 2)]
  const playerWon = (b.attackerHouseId === game.playerHouseId) === b.victory
  const lossA = Math.ceil(b.attackerStart / 25) - Math.ceil(shown.attacker / 25), lossD = Math.ceil(b.defenderStart / 25) - Math.ceil(Math.max(1, shown.defender) / 25)
  return <div className={styles.backdrop} data-ui>
    <section className={`${styles.sheet} ${styles.wide} ${styles.battle}`} role="dialog" aria-label={`Batalha de ${p.name}`}>
      <header className={styles.battleHead}>
        <div><Crest heraldry={heraldryOf(game, att)} size={34}/><b>{att.name}</b><span>{shown.attacker} homens</span></div>
        <div className={styles.battleTitle}><h3>Batalha de {p.name}</h3><span>{shown.label}{b.wall ? ` · muralha nível ${b.wall}` : ''}</span></div>
        <div><span>{Math.max(0, shown.defender)} homens</span><b>{def.name}</b><Crest heraldry={heraldryOf(game, def)} size={34}/></div>
      </header>
      <svg className={styles.field} viewBox="0 0 400 170" aria-hidden>
        <defs><linearGradient id="grass" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#6f8a46"/><stop offset="1" stopColor="#4d6a32"/></linearGradient></defs>
        <rect width="400" height="170" fill="url(#grass)"/>
        {Array.from({ length: 40 }, (_, i) => <circle key={i} cx={(i * 97) % 400} cy={(i * 53) % 170} r="1.4" fill="#3d5527" opacity=".5"/>)}
        {b.wall > 0 && <g transform="translate(372 30)"><rect x="0" y="0" width="28" height="120" fill="#9b958a" stroke="#4a463f"/>{Array.from({ length: 6 }, (_, i) => <rect key={i} x="-4" y={i * 20} width="8" height="10" fill="#b8b2a6" stroke="#4a463f"/>)}{phase >= 2 && b.victory && <path d="M0 50l14 10-6 12 10 8" stroke="#2a2016" strokeWidth="2" fill="none"/>}</g>}
        <Ranks men={b.attackerStart} color={mapColor(game, att.id)} side="left" advance={phase >= 1 ? 110 : 0} fallen={lossA}/>
        <Ranks men={b.defenderStart} color={mapColor(game, def.id)} side="right" advance={phase >= 1 ? 40 : 0} fallen={lossD}/>
        {phase === 1 && <g className={styles.clash}>{[0, 1, 2, 3, 4].map(i => <circle key={i} cx={200 + (i - 2) * 9} cy={60 + i * 18} r="9" fill="#fff6d0"/>)}</g>}
      </svg>
      <div className={styles.phases}>{b.phases.map((ph, i) => <span key={i} className={i <= phase ? styles.on : ''}>{ph.label}</span>)}</div>
      {phase >= 3 && <div className={`${styles.result} ${playerWon ? styles.win : styles.lose}`}><h4>{playerWon ? 'Vitória' : 'Derrota'}</h4><p>{b.summary}</p><button className={styles.btn} onClick={onClose}>Continuar</button></div>}
      {phase < 3 && <button className={styles.skip} onClick={() => setPhase(3)}>pular</button>}
    </section>
  </div>
}

/** Decisions that pause the world: the siege assault, oaths, the liege's letters and the crown's offer. */
export function DecisionScene({ game, decision, act }: { game: GameState; decision: Decision; act: Act }) {
  const choices = choicesFor(game, decision)
  const house = decision.houseId ? houseOf(game, decision.houseId) : null
  const ruler = house ? game.campaign.characters.find(c => c.id === `ruler-${house.id}`) : null
  const player = houseOf(game, game.playerHouseId)
  const choose = (id: string) => act(g => resolveDecision(g, decision.id, id))
  let art: ReactElement | null = null, title = '', text = ''
  if (decision.kind === 'assalto') {
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
  } else {
    title = decision.kind === 'ultimato' ? `Ultimato da ${house?.name}` : decision.kind === 'rei' ? `A coroa escreve` : `Convocação da ${house?.name}`
    text = decision.kind === 'ultimato' ? `“Serraval cresce demais. Pague ${BALANCE.politics.submitGold} de ouro e renuncie às suas ambições, ou tomarei Pontevela.”` : decision.kind === 'rei' ? `“Hadrin envelhece, e Três Pontes precisa de mãos firmes. Pague ${BALANCE.politics.kingPactGold} de ouro à coroa e eu impedirei que ele marche contra você.”` : `“As incursões de Ardesh pedem homens. Mande ${BALANCE.politics.levyMen} dos seus a Torrealva, como manda o juramento.”`
    art = <div className={styles.letter}>{ruler?.portraitAsset && <img src={cardUrl(ruler.portraitAsset)} alt={ruler.name}/>}<div><Crest heraldry={heraldryOf(game, house!)} size={44}/><b>{ruler?.role} {ruler?.name}</b><span>{house?.name}</span></div></div>
  }
  return <div className={styles.backdrop} data-ui>
    <section className={`${styles.sheet} ${styles.decision}`} role="dialog" aria-label={title}>
      <span className={styles.k}>decisão · o tempo parou</span><h3>{title}</h3>
      {art}
      <p className={styles.decisionText}>{text}</p>
      <div className={styles.choices}>{choices.map(c => <button key={c.id} className={styles.choice} onClick={() => choose(c.id)}><b>{c.label}</b><span>{c.detail}</span>{c.cost && <small>{c.cost}</small>}</button>)}</div>
    </section>
  </div>
}
