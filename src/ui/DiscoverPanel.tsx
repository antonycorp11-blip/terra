import { BALANCE } from '../engine/balance'
import { canExplore, expeditionQuote, sendExpedition } from '../engine/exploration'
import { diplomacyQuote, diplomaticAction, sendEmissary } from '../engine/diplomacy'
import { KNOWLEDGE, knowledge, knownRoute, visibleProvinceName } from '../engine/knowledge'
import { disposition } from '../engine/relationships'
import { rulerOf } from '../engine/characters'
import type { GameState, Province } from '../engine/types'
import { useUI } from './store'
import { ActionButton, Empty, HouseMark, Meter, Progress, Row, Section, fmt, longDate, panelStyles as styles, type Act } from './parts'

const LEVEL_LABEL = ['Desconhecida', 'Avistada', 'Explorada', 'Investigada']
const TYPE_GLYPH: Record<string,string> = { castelo:'♜', fortaleza:'♜', cidade:'♛', porto:'⚓', vila:'⌂', aldeia:'⌂', mina:'⚒', serraria:'🪵', fazenda:'❦', entreposto:'⚖' }

export function ProvinceHeader({ game, province }: { game: GameState; province: Province }) {
  const level = knowledge(game, province.id)
  const fief = game.world.fiefs.find(f => f.id === province.fiefId)!, realm = game.world.realms.find(r => r.id === province.realmId)!
  return <div className={styles.identity}>
    {level >= 2 ? <HouseMark game={game} houseId={province.governingHouseId} size={40}/> : <div className={styles.unknownMark}>?</div>}
    <div><small>PROVÍNCIA · {LEVEL_LABEL[level].toUpperCase()}</small><h1>{visibleProvinceName(game, province.id)}</h1><p>{level >= 2 ? `${fief.name} · ${realm.name}` : level === 1 ? `Terreno: ${province.terrain}` : 'Coberta pela névoa'}</p></div>
  </div>
}

export default function DiscoverPanel({ game, act }: { game: GameState; act: Act }) {
  const { selectedProvinceId } = useUI()
  const province = game.world.provinces.find(p => p.id === selectedProvinceId)
  if (!province) return <DiscoverOverview game={game}/>
  const level = knowledge(game, province.id)
  return <>
    <ProvinceHeader game={game} province={province}/>
    <div className={styles.body}>
      {level === 0 && <Empty>Ninguém em sua corte conhece estas terras. Explore as fronteiras avistadas para que novas regiões se tornem alcançáveis.</Empty>}
      {level === 1 && <SightedProvince game={game} province={province} act={act}/>}
      {level >= 2 && <KnownProvince game={game} province={province} act={act}/>}
    </div>
  </>
}

function DiscoverOverview({ game }: { game: GameState }) {
  const { focusProvince } = useUI()
  const active = game.campaign.expeditions.filter(e => !e.completed)
  const done = game.campaign.expeditions.filter(e => e.completed).slice(-4).reverse()
  const levels = Object.values(game.campaign.knowledge).map(k => KNOWLEDGE.indexOf(k.level))
  const explorable = game.world.provinces.filter(p => canExplore(game, p.id)).length
  return <>
    <div className={styles.identity}><div className={styles.modeMark}>✦</div><div><small>VISÃO GERAL</small><h1>Fronteiras de Varedor</h1><p>{levels.filter(l => l >= 2).length} províncias conhecidas · {levels.filter(l => l === 1).length} avistadas</p></div></div>
    <div className={styles.body}>
      <p className={styles.lead}>Toque em uma fronteira <b className={styles.dashed}>destacada</b> no mapa para preparar uma expedição. Províncias exploradas permitem enviar emissários.</p>
      <Section title="Expedições" aside={<small>{active.length}/{BALANCE.expedition.max}</small>}>
        {active.length ? active.map(e => <button key={e.id} className={styles.listItem} onClick={() => focusProvince(e.provinceId)}><strong>{visibleProvinceName(game, e.provinceId)}</strong><small>Retorno em {e.endDay - game.day} dias</small><Progress value={(game.day - e.startDay) / (e.endDay - e.startDay)} label="Progresso da expedição"/></button>) : <Empty>Nenhuma expedição em campo. {explorable} fronteiras podem ser exploradas agora.</Empty>}
      </Section>
      {done.length > 0 && <Section title="Descobertas recentes">{done.map(e => <button key={e.id} className={styles.report} onClick={() => focusProvince(e.provinceId)}><small>{longDate(e.endDay)}</small>{e.report}</button>)}</Section>}
    </div>
  </>
}

function SightedProvince({ game, province, act }: { game: GameState; province: Province; act: Act }) {
  const quote = expeditionQuote(game, province.id)
  const active = game.campaign.expeditions.find(e => !e.completed && e.provinceId === province.id)
  const running = game.campaign.expeditions.filter(e => !e.completed).length
  const house = game.world.houses.find(h => h.id === game.playerHouseId)!
  const borders = province.neighbors.filter(id => knowledge(game, id) >= 2).map(id => game.world.provinces.find(p => p.id === id)!.name)
  const reason = !quote.route.length || quote.route.length < 2 ? 'Nenhum caminho conhecido chega até aqui. Explore uma região vizinha primeiro.' : running >= BALANCE.expedition.max ? 'No máximo duas expedições simultâneas.' : house.gold < quote.gold || house.stock.food < quote.food ? `Recursos insuficientes: são necessários ${quote.gold} ouro e ${quote.food} alimentos.` : null
  return <>
    <p className={styles.lead}>Contornos de {province.terrain} vistos à distância{borders.length ? `, além de ${borders.slice(0, 2).join(' e ')}` : ''}. Nome, casa governante e assentamentos ainda são desconhecidos.</p>
    {active ? <Section title="Expedição em campo"><Row label="Retorno" value={`em ${active.endDay - game.day} dias`}/><Progress value={(game.day - active.startDay) / (active.endDay - active.startDay)} label="Progresso da expedição"/></Section>
      : <Section title="Preparar expedição">
        <Row label="Custo" value={`${quote.gold} ouro · ${quote.food} alimentos`}/>
        <Row label="Duração" value={`${quote.days} dias`}/>
        <Row label="Rota" value={quote.route.length > 1 ? `${quote.route.length - 1} ${quote.route.length > 2 ? 'etapas' : 'etapa'} por terras conhecidas` : '—'}/>
        <ActionButton primary title="Enviar expedição" detail={`${quote.gold} ouro · ${quote.food} alimentos · ${quote.days} dias`} disabled={!!reason} reason={reason} onClick={() => act(g => sendExpedition(g, province.id), 'Expedição enviada.')}/>
      </Section>}
  </>
}

function KnownProvince({ game, province, act }: { game: GameState; province: Province; act: Act }) {
  const { selectedSettlementId, selectSettlement, setMode, selectCharacter } = useUI()
  const world = game.world
  const level = knowledge(game, province.id)
  const house = world.houses.find(h => h.id === province.governingHouseId)!
  const own = house.id === game.playerHouseId
  const ruler = rulerOf(game, house.id)
  const liege = world.houses.find(h => h.id === province.liegeHouseId)!
  const contact = game.campaign.contacts.find(c => c.houseId === house.id)
  const settlements = province.settlementIds.map(id => world.settlements.find(s => s.id === id)!)
  const settlement = settlements.find(s => s.id === selectedSettlementId)
  const report = game.campaign.expeditions.filter(e => e.completed && e.provinceId === province.id).at(-1)
  const wealth = settlements.reduce((n, s) => n + s.production.gold, 0)
  const intel = game.campaign.reports.filter(r => r.provinceId === province.id && r.expiresDay >= game.day).at(-1)
  return <>
    <Row label="Casa governante" value={house.name}/>
    <Row label="Governante" value={`${ruler.name} · ${ruler.role}`}/>
    <Row label="Suserano" value={liege.name}/>
    {!own && <Row label="Relação" value={contact?.establishedDay != null ? `${disposition(contact.relation)} (${contact.relation > 0 ? '+' : ''}${contact.relation})` : contact ? 'Emissário a caminho' : 'Sem contato'}/>}
    <Row label="Terreno" value={province.terrain}/>
    <Row label="População" value={own || level >= 3 ? fmt(province.population) : `≈ ${fmt(Math.round(province.population / 500) * 500)}`}/>
    <Row label="Lealdade" value={own ? `${province.loyalty}%` : intel?.loyalty !== undefined ? `${intel.loyalty}% (relatório)` : 'Requer espionagem'}/>
    {!own && <Row label="Riqueza estimada" value={`≈ ${fmt(Math.round(wealth / 10) * 10)} ouro/mês`}/>}
    {own && <ActionButton primary title="Administrar Pontevela" detail="Economia, investimentos e corte" onClick={() => setMode('influenciar')}/>}

    <Section title="Assentamentos">
      <div className={styles.siteList}>{settlements.map(s => <button key={s.id} className={s.id === selectedSettlementId ? styles.picked : ''} onClick={() => selectSettlement(s.id === selectedSettlementId ? null : s.id)}><span>{TYPE_GLYPH[s.type] ?? '⌂'}</span><strong>{s.name}</strong><small>{s.type}</small></button>)}</div>
      {settlement && <div className={styles.card}><h3>{settlement.name}</h3><Row label="Tipo" value={settlement.type}/><Row label="Habitantes" value={own ? fmt(settlement.population) : `≈ ${fmt(Math.round(settlement.population / 100) * 100)}`}/><Row label="Guarnição" value={own ? fmt(settlement.garrison) : 'Desconhecida'}/><Row label="Defesa" value={own ? settlement.defense : '—'}/></div>}
    </Section>

    {report?.report && <Section title="Relatório da expedição"><p className={styles.quote}>{report.report}</p></Section>}

    {!own && <Section title="Diplomacia">
      {!contact && <>
        <p className={styles.lead}>{ruler.name} governa em nome da {house.name}. Um emissário pode abrir relações formais.</p>
        <ActionButton primary title="Enviar emissário" detail={`${BALANCE.diplomacy.gold} ouro · ${diplomacyQuote(game, province.id)} dias`} disabled={!knownRoute(game, province.id).length || world.houses.find(h => h.id === game.playerHouseId)!.gold < BALANCE.diplomacy.gold} reason={!knownRoute(game, province.id).length ? 'É preciso uma rota terrestre por províncias exploradas.' : 'Ouro insuficiente.'} onClick={() => act(g => sendEmissary(g, province.id), 'O emissário partiu.')}/>
      </>}
      {contact && contact.establishedDay === null && <PendingMissions game={game} houseId={house.id}/>}
      {contact && contact.establishedDay !== null && <Relations game={game} houseId={house.id} act={act} onTalk={() => { setMode('influenciar'); selectCharacter(ruler.id) }}/>}
    </Section>}
  </>
}

function PendingMissions({ game, houseId }: { game: GameState; houseId: string }) {
  const label = { emissary:'Emissário a caminho', rapprochement:'Aproximação diplomática', audience:'Pedido de audiência' }
  const pending = game.campaign.diplomacy.filter(d => d.houseId === houseId && !d.completed)
  return <>{pending.map(d => <div key={d.id} className={styles.pending}><Row label={label[d.kind]} value={`${d.endDay - game.day} dias`}/><Progress value={(game.day - d.startDay) / (d.endDay - d.startDay)} label={label[d.kind]}/></div>)}</>
}

export function Relations({ game, houseId, act, onTalk }: { game: GameState; houseId: string; act: Act; onTalk?: () => void }) {
  const contact = game.campaign.contacts.find(c => c.houseId === houseId)!
  const house = game.world.houses.find(h => h.id === houseId)!
  const player = game.world.houses.find(h => h.id === game.playerHouseId)!
  const giftWait = contact.lastGiftDay === null ? 0 : Math.max(0, contact.lastGiftDay + BALANCE.diplomacy.giftCooldown - game.day)
  const recent = (kind: string) => game.campaign.diplomacy.some(d => d.houseId === houseId && d.kind === kind && (!d.completed || game.day - d.startDay < 30))
  const routeOk = knownRoute(game, contact.provinceId).length > 0
  return <>
    <Meter value={contact.relation} label={disposition(contact.relation)}/>
    <details className={styles.reasons}><summary>Por que esta relação?</summary><ul>{contact.reasons.map(r => <li key={r}>{r}</li>)}</ul></details>
    {contact.trade && <p className={styles.badge}>⚖ Acordo comercial ativo: +{BALANCE.diplomacy.tradeIncome} ouro/mês{contact.relation < 0 || !routeOk ? ' (suspenso: relação hostil ou rota perdida)' : ''}</p>}
    {contact.audienceUntil >= game.day && <p className={styles.badge}>♛ Audiência concedida até {longDate(contact.audienceUntil)}</p>}
    <PendingMissions game={game} houseId={houseId}/>
    <div className={styles.actionGrid}>
      <ActionButton title="Enviar presente" detail={`${BALANCE.diplomacy.giftGold} ouro · relação +10`} disabled={giftWait > 0 || player.gold < BALANCE.diplomacy.giftGold} reason={giftWait ? `Novo presente em ${giftWait} dias.` : 'Ouro insuficiente.'} onClick={() => act(g => diplomaticAction(g, houseId, 'gift'), `${house.name} recebeu o presente.`)}/>
      <ActionButton title="Oferecer aproximação" detail={`${BALANCE.diplomacy.rapprochementDays} dias · conforme o contexto`} disabled={recent('rapprochement')} reason="Uma aproximação já foi oferecida nos últimos 30 dias." onClick={() => act(g => diplomaticAction(g, houseId, 'rapprochement'), 'Comitiva de aproximação enviada.')}/>
      <ActionButton title="Solicitar audiência" detail={`${BALANCE.diplomacy.audienceDays} dias · exige relação ≥ −15`} disabled={recent('audience') || contact.audienceUntil >= game.day} reason={contact.audienceUntil >= game.day ? 'A audiência já está concedida.' : 'Pedido recente em avaliação.'} onClick={() => act(g => diplomaticAction(g, houseId, 'audience'), 'Pedido de audiência enviado.')}/>
      <ActionButton title="Propor comércio" detail={`+${BALANCE.diplomacy.tradeIncome} ouro/mês`} disabled={contact.trade || contact.relation < 0 || !routeOk} reason={contact.trade ? 'Acordo já firmado.' : contact.relation < 0 ? 'Exige relação não hostil (≥ 0).' : 'Exige rota terrestre descoberta.'} onClick={() => act(g => diplomaticAction(g, houseId, 'trade'), 'Acordo comercial firmado.')}/>
    </div>
    {onTalk && <ActionButton primary title={`Conversar com ${rulerOf(game, houseId).name}`} detail="Abrir em Influenciar" onClick={onTalk}/>}
  </>
}
