import type { GameState } from '../../engine/types'
import { BALANCE } from '../../engine/balance'
import { attackParty, hostile, partyCap, partyReach, playerParty, transferMen } from '../../engine/party'
import { controlled } from '../../engine/stateUtils'
import { rulerOf } from '../../engine/characters'
import Crest from '../Heraldry'
import Icon from '../Icons'
import { useUI } from '../store'
import { type Act } from '../parts'
import { cardUrl, heraldryOf, houseOf, mapColor, provinceOf } from '../view'
import styles from './Game.module.css'

/** Irian's retinue: where it stands, who is there, and what can be done in person. */
export default function PartyCard({ game, act, onClose }: { game: GameState; act: Act; onClose: () => void }) {
  const ui = useUI()
  const party = playerParty(game), p = provinceOf(game, party.provinceId), me = houseOf(game, game.playerHouseId), irian = rulerOf(game, me.id)
  const own = controlled(game).some(c => c.id === p.id), garrison = game.campaign.garrisons[p.id] ?? 0, cap = partyCap(game), T = BALANCE.party.transfer
  const here = game.campaign.parties.filter(x => x.id !== party.id && x.provinceId === p.id)
  const seatLord = game.world.houses.find(h => h.seatProvinceId === p.id && h.id !== me.id && !game.campaign.parties.some(x => x.houseId === h.id) && !game.campaign.prisoners.some(x => x.houseId === h.id) && p.governingHouseId === h.id)
  const reach = partyReach(game).size
  return <aside className={`${styles.card} ${styles.withFigure}`} data-ui aria-label="Comitiva de Irian">
    <button className={styles.cx} onClick={onClose} aria-label="Fechar"><Icon name="close" size={16}/></button>
    <div className={styles.cardFigure} style={{ ['--hc' as string]: mapColor(game, me.id) }}>
      {irian.portraitAsset && <img src={cardUrl(irian.portraitAsset)} alt="Irian"/>}
      <span className={styles.figureName}><b>Irian</b>em {p.name}</span>
    </div>
    <div className={styles.cardBody}>
      <div className={styles.k}>comitiva · {p.name}</div>
      <h4>{party.men} homens</h4>
      <div className={styles.meterRow}><span>tamanho</span><span className={styles.meter}><i style={{ width: `${Math.min(100, party.men / cap * 100)}%` }}/></span><b>{cap}</b></div>
      <p className={styles.small}>{party.moves > 0 ? `${party.moves} movimento${party.moves > 1 ? 's' : ''} neste turno. ${reach ? 'Toque num marcador dourado para levar a comitiva.' : 'Nenhuma terra conhecida ao alcance.'}` : 'A comitiva já andou neste turno. Encerre o turno para seguir viagem.'} Cada província sua permite liderar mais 30 homens.</p>

      {(here.length > 0 || seatLord) && <section className={styles.cardSection}><span className={styles.cardH}>aqui em {p.name}</span>
        {seatLord && <div className={styles.meet}><Crest heraldry={heraldryOf(game, seatLord)} size={26}/><span><b>{rulerOf(game, seatLord.id).name}</b> está no castelo da {seatLord.name}</span><button className={styles.mini2} onClick={() => ui.openSheet({ kind: 'conversation', characterId: rulerOf(game, seatLord.id).id })}>Conversar</button></div>}
        {here.map(x => x.kind === 'bandidos'
          ? <div key={x.id} className={styles.meet}><Icon name="militar" size={20}/><span><b>{x.name}</b> · {x.men} salteadores</span><button className={styles.mini2} onClick={() => act(g => attackParty(g, x.id))}>Atacar</button></div>
          : <div key={x.id} className={styles.meet}><Crest heraldry={heraldryOf(game, houseOf(game, x.houseId!))} size={26}/><span><b>{rulerOf(game, x.houseId!).name}</b> · {x.men} homens{hostile(game, x.houseId!) ? ' · hostil' : ''}</span>
              <button className={styles.mini2} onClick={() => ui.openSheet({ kind: 'conversation', characterId: rulerOf(game, x.houseId!).id })}>Conversar</button>
              <button className={`${styles.mini2} ${styles.danger}`} onClick={() => act(g => attackParty(g, x.id))}>Atacar</button></div>)}
      </section>}

      {own && <section className={styles.cardSection}><span className={styles.cardH}>guarnição de {p.name}: {garrison}</span>
        <div className={styles.split}>
          <button className={styles.act} disabled={garrison < T || party.men + T > cap} onClick={() => act(g => transferMen(g, T))}><span>Levar {T} homens</span><small>da guarnição</small></button>
          <button className={`${styles.act} ${styles.sec}`} disabled={party.men - T < 10} onClick={() => act(g => transferMen(g, -T))}><span>Deixar {T}</span><small>na guarnição</small></button>
        </div>
        <p className={styles.small}>Recrute na visão Militar; depois traga os homens para a comitiva.</p>
      </section>}
      <div className={styles.acts}><button className={`${styles.act} ${styles.sec}`} onClick={() => { ui.setPartyMode(false); ui.select(p.id) }}><span>Ver {p.name}</span></button></div>
    </div>
  </aside>
}
