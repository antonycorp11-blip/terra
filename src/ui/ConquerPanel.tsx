import { knowledge, visibleProvinceName } from '../engine/knowledge'
import type { GameState } from '../engine/types'
import { useUI } from './store'
import { Empty, HouseMark, Row, Section, fmt, longDate, panelStyles as styles } from './parts'

/** Read-only military overview. Battles and conquest are deliberately not simulated in this MVP. */
export default function ConquerPanel({ game }: { game: GameState }) {
  const { selectedProvinceId } = useUI()
  const world = game.world
  const player = world.houses.find(h => h.id === game.playerHouseId)!
  const own = world.provinces.filter(p => p.governingHouseId === player.id)
  const ownSettlements = own.flatMap(p => p.settlementIds).map(id => world.settlements.find(s => s.id === id)!)
  const province = world.provinces.find(p => p.id === selectedProvinceId)
  const foreign = province && province.governingHouseId !== player.id ? province : null
  const report = foreign ? game.campaign.reports.filter(r => r.provinceId === foreign.id && r.garrison !== undefined).at(-1) : undefined
  return <>
    <div className={styles.identity}><HouseMark game={game} houseId={player.id} size={40}/><div><small>CONQUISTAR</small><h1>Forças de {player.name.replace(/^Casa /, '')}</h1><p>Visão militar</p></div></div>
    <div className={styles.body}>
      <div className={styles.notice} role="note"><strong>Em desenvolvimento</strong>Batalhas, cercos e conquistas militares ainda não fazem parte desta versão. Nenhuma ordem militar é simulada.</div>
      <Section title="Tropas mobilizáveis">
        <Row label="Homens convocáveis" value={fmt(player.mobilizable)}/>
        <Row label="Cavalos" value={fmt(player.stock.horses)}/>
        <Row label="Ferro para armas" value={fmt(player.stock.iron)}/>
      </Section>
      <Section title="Defesa territorial">{ownSettlements.map(s => <Row key={s.id} label={s.name} value={`${fmt(s.garrison)} soldados · defesa ${s.defense}`}/>)}</Section>
      {foreign && <Section title={`Guarnições conhecidas — ${visibleProvinceName(game, foreign.id)}`}>
        {knowledge(game, foreign.id) < 2 ? <Empty>Território não explorado.</Empty>
          : report ? <><Row label="Guarnição estimada" value={`≈ ${fmt(report.garrison!)}`}/><p className={styles.intelMeta}>{longDate(report.day)} · Fonte: {report.source} · Confiança {report.confidence}{report.expiresDay < game.day ? ' · desatualizado' : ''}</p></>
          : <Empty>Sem informação militar. Envie um agente pelo modo Influenciar.</Empty>}
      </Section>}
      {!foreign && <p className={styles.hint}>Selecione uma província explorada para consultar guarnições conhecidas por espionagem.</p>}
    </div>
  </>
}
