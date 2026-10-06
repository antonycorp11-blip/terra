import type { GameState, Resource } from '../../engine/types'
import { RESOURCES } from '../../engine/types'
import { influenceOf } from '../../engine/influence'
import { menUnderArms, provinceProduction } from '../../engine/economy'
import { ascension, fiefHouses, liegeHouse } from '../../engine/politics'
import { controlled, isVassal } from '../../engine/stateUtils'
import { sellers } from '../../engine/travel'
import { ResourceIcon } from '../Icons'
import type { Lens } from '../store'
import { fmt } from '../parts'
import { mapColor } from '../view'
import styles from './Game.module.css'

/** The data panel of each view: what the whole map is telling you, in numbers. */
export default function LensSummary({ game, lens, filter, setFilter }: { game: GameState; lens: Lens; filter: string | null; setFilter: (r: string | null) => void }) {
  if (lens === 'territorio') return null
  const houses = fiefHouses(game)
  const army = (id: string) => id === game.playerHouseId ? menUnderArms(game) : game.world.houses.find(h => h.id === id)!.mobilizable
  if (lens === 'militar') {
    const rows = houses.map(h => ({ h, v: army(h.id) })).sort((a, b) => b.v - a.v), max = Math.max(...rows.map(r => r.v))
    const foes = game.campaign.armies.filter(a => a.houseId !== game.playerHouseId)
    return <aside className={styles.lsum} data-ui>
      <span className={styles.k}>visão militar</span><h5>Forças do feudo</h5>
      <div className={styles.bars}>{rows.map(({ h, v }) => <div key={h.id} className={`${styles.bar} ${h.id === game.playerHouseId ? styles.me : ''}`}><span>{h.name.replace('Casa ', '')}{isVassal(game, h.id) ? ' ◆' : ''}</span><span className={styles.track}><i style={{ width: `${v / max * 100}%`, background: mapColor(game, h.id) }}/></span><b>{fmt(v)}</b></div>)}</div>
      {foes.length ? <p className={styles.alert}>{foes.map(a => `${game.world.houses.find(h => h.id === a.houseId)!.name}: ${a.men} homens ${a.status === 'sitiando' ? 'cercando' : 'em marcha'}.`).join(' ')}</p> : <p>Números com ~ são estimativas. Toque numa província sua para recrutar ou deslocar tropas.</p>}
    </aside>
  }
  if (lens === 'influencia') {
    const asc = ascension(game)
    return <aside className={styles.lsum} data-ui>
      <span className={styles.k}>visão de influência</span><h5>Seu peso no feudo</h5>
      <div className={styles.bars}>{houses.filter(h => h.id !== game.playerHouseId).map(h => { const v = isVassal(game, h.id) ? 100 : influenceOf(game, h.id); const bond = game.campaign.bonds.find(b => b.houseId === h.id); return <div key={h.id} className={styles.bar}><span>{h.name.replace('Casa ', '')}{bond ? ' ◆' : ''}</span><span className={styles.track}><i style={{ width: `${v}%`, background: v >= 60 ? '#f1c75b' : '#c99a3e' }}/></span><b>{v >= 100 ? 'vassalo' : `${v}%`}</b></div> })}</div>
      <p>Apoio para ser grão-lorde: <b>{asc.support} de {asc.needed}</b> casas{asc.recognised ? ', e a coroa reconhece' : `. Falta também o reconhecimento da coroa ou a queda de ${liegeHouse(game).name.replace('Casa ', '')}`}.</p>
    </aside>
  }
  // Diplomacy: production, scarcity and who sells what.
  const mine = controlled(game)
  const produce = new Set(mine.flatMap(p => p.resources))
  const out = mine.reduce((s, p) => { const o = provinceProduction(game, p); return { stone: s.stone + o.stone, iron: s.iron + o.iron, salt: s.salt + o.salt, silver: s.silver + o.silver } }, { stone: 0, iron: 0, salt: 0, silver: 0 })
  const lacks = RESOURCES.filter(r => !produce.has(r) && (r === 'pedra' ? !out.stone : r === 'sal' ? !out.salt : r === 'prata' ? !out.silver : r === 'ferro' ? out.iron < 20 : true))
  return <aside className={styles.lsum} data-ui>
    <span className={styles.k}>visão de diplomacia</span><h5>Comércio e acordos</h5>
    <div className={styles.rchips}><button aria-pressed={!filter} onClick={() => setFilter(null)}>todos</button>{RESOURCES.map(r => <button key={r} aria-pressed={filter === r} onClick={() => setFilter(filter === r ? null : r)}><ResourceIcon resource={r} size={14}/>{r}</button>)}</div>
    {filter ? <p><b>Quem produz {filter}:</b> {sellers(game, filter as Resource).map(h => h.name.replace('Casa ', '')).join(', ') || 'ninguém que você conheça'}.</p>
      : <p className={lacks.length ? styles.alert : ''}>{lacks.length ? `Suas terras não produzem ${lacks.join(', ')}. Toque num recurso para ver quem vende.` : 'Suas terras produzem de tudo um pouco.'}</p>}
    <p>{game.campaign.contacts.filter(c => c.trade).length} pactos comerciais · {game.campaign.vassals.length} vassalos pagando tributo.</p>
  </aside>
}
