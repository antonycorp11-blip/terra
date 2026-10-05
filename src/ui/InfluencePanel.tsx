import { BALANCE } from '../engine/balance'
import { economicBalance } from '../engine/economy'
import { startInvestment } from '../engine/investments'
import { canConverse, characterName, knownCharacter } from '../engine/characters'
import { TOPICS, converse, dialogueWait } from '../engine/dialogue'
import { hireSpy, sendSpy, spyQuote } from '../engine/espionage'
import { knowledge, visibleProvinceName } from '../engine/knowledge'
import { disposition } from '../engine/relationships'
import type { Character, DialogueTopic, InvestmentKind } from '../engine/mvpTypes'
import type { GameState } from '../engine/types'
import { ProvinceHeader, Relations } from './DiscoverPanel'
import Portrait from './Portrait'
import { useUI, type InfluenceTab } from './store'
import { ActionButton, Empty, HouseMark, Meter, Progress, Row, Section, fmt, longDate, panelStyles as styles, signed, type Act } from './parts'

const TABS: [InfluenceTab, string][] = [['dominio', 'Domínio'], ['personagens', 'Corte'], ['espioes', 'Espiões'], ['relacoes', 'Relações']]
const houseOf = (game: GameState, id: string) => game.world.houses.find(h => h.id === id)!

export default function InfluencePanel({ game, act, onVisitCastle }: { game: GameState; act: Act; onVisitCastle: () => void }) {
  const { selectedProvinceId, selectedCharacterId, influenceTab, setInfluenceTab, selectProvince } = useUI()
  const character = game.campaign.characters.find(c => c.id === selectedCharacterId)
  if (character) return <Conversation game={game} character={character} act={act}/>
  const province = game.world.provinces.find(p => p.id === selectedProvinceId)
  if (province && province.governingHouseId !== game.playerHouseId) return <ForeignCourt game={game} provinceId={province.id} act={act}/>
  const player = houseOf(game, game.playerHouseId)
  return <>
    <div className={styles.identity}><HouseMark game={game} houseId={player.id} size={40}/><div><small>INFLUENCIAR</small><h1>{player.name}</h1><p>Prestígio {player.prestige} · Influência {player.influence}</p></div></div>
    <nav className={styles.tabs} role="tablist">{TABS.map(([id, label]) => <button key={id} role="tab" aria-selected={influenceTab === id} className={influenceTab === id ? styles.activeTab : ''} onClick={() => { setInfluenceTab(id); if (province) selectProvince(null) }}>{label}</button>)}</nav>
    <div className={styles.body}>
      {influenceTab === 'dominio' && <Domain game={game} act={act} onVisitCastle={onVisitCastle}/>}
      {influenceTab === 'personagens' && <Court game={game}/>}
      {influenceTab === 'espioes' && <Spies game={game} act={act}/>}
      {influenceTab === 'relacoes' && <RelationList game={game}/>}
    </div>
  </>
}

function Domain({ game, act, onVisitCastle }: { game: GameState; act: Act; onVisitCastle: () => void }) {
  const player = houseOf(game, game.playerHouseId)
  const seat = game.world.provinces.find(p => p.id === player.seatProvinceId)!
  const b = economicBalance(game)
  const nextBalance = BALANCE.month - (game.day % BALANCE.month)
  const situation = seat.loyalty >= 75 && b.food >= 0 ? 'Estável e próspera' : seat.loyalty >= 55 ? 'Estável, com tensões' : 'Inquieta'
  return <>
    <div className={styles.stats}>
      {([['Ouro', player.gold], ['Alimentos', player.stock.food], ['Madeira', player.stock.wood], ['Ferro', player.stock.iron], ['Cavalos', player.stock.horses], ['População', seat.population]] as const).map(([label, value]) => <div key={label}><small>{label}</small><strong>{fmt(value)}</strong></div>)}
    </div>
    <Row label="Lealdade de Pontevela" value={`${seat.loyalty}%`} tone={seat.loyalty >= 70 ? 'good' : seat.loyalty < 50 ? 'bad' : undefined}/>
    <Row label="Situação" value={situation}/>
    <Section title="Balanço mensal" aside={<small>próximo em {nextBalance} d</small>}>
      <table className={styles.ledger}><tbody>
        <tr><th>Receita tributária</th><td className={styles.good}>{signed(b.revenue)} ouro</td></tr>
        {b.trade > 0 && <tr><th>Acordos comerciais</th><td className={styles.good}>{signed(b.trade)} ouro</td></tr>}
        <tr><th>Despesa administrativa</th><td className={styles.bad}>{signed(-b.administration)} ouro</td></tr>
        {b.upkeep > 0 && <tr><th>Manutenção de agentes</th><td className={styles.bad}>{signed(-b.upkeep)} ouro</td></tr>}
        <tr><th>Produção agrícola</th><td className={styles.good}>{signed(b.foodProduction)} alimentos</td></tr>
        <tr><th>Consumo populacional</th><td className={styles.bad}>{signed(-b.consumption)} alimentos</td></tr>
        <tr><th>Madeira · Ferro</th><td className={styles.good}>{signed(b.wood)} · {signed(b.iron)}</td></tr>
        <tr className={styles.total}><th>Saldo</th><td>{signed(b.gold)} ouro · {signed(b.food)} alimentos</td></tr>
      </tbody></table>
    </Section>
    <Section title="Investimentos">
      {(Object.keys(BALANCE.investment) as InvestmentKind[]).map(kind => {
        const rule = BALANCE.investment[kind], project = game.campaign.investments.find(i => i.kind === kind && i.provinceId === seat.id)
        const short = player.gold < rule.gold || player.stock.wood < rule.wood
        return <div key={kind} className={styles.investment} data-investment={kind}>
          <div><strong>{rule.name}</strong><small>{rule.benefit} · {rule.days} dias</small></div>
          {!project && <ActionButton title="Investir" detail={`${rule.gold} ouro · ${rule.wood} madeira`} disabled={short} reason="Recursos insuficientes." onClick={() => act(g => startInvestment(g, kind), `${rule.name}: obras iniciadas.`)}/>}
          {project && !project.completed && <><small className={styles.status}>Em obras · {project.endDay - game.day} dias restantes</small><Progress value={(game.day - project.startDay) / (project.endDay - project.startDay)} label={rule.name}/></>}
          {project?.completed && <small className={styles.done}>✔ Concluído em {longDate(project.endDay)} — {rule.benefit}</small>}
        </div>
      })}
      <p className={styles.hint}>Neste MVP cada obra pode ser realizada uma vez; os benefícios são permanentes.</p>
    </Section>
    <ActionButton title="Visitar o Castelo da Ponte Alta" detail="Audiências e crônica local" onClick={onVisitCastle}/>
  </>
}

function CharacterRow({ game, character }: { game: GameState; character: Character }) {
  const { selectCharacter } = useUI()
  const able = canConverse(game, character)
  return <button className={styles.person} onClick={() => selectCharacter(character.id)} aria-label={`Abrir ${character.name}`}>
    <Portrait character={character} color={houseOf(game, character.houseId).color} size={40}/>
    <span><strong>{characterName(game, character)}</strong><small>{character.role} · {character.traits.join(', ')}</small></span>
    <em>{able ? 'Conversar ›' : 'Requer contato'}</em>
  </button>
}

function Court({ game }: { game: GameState }) {
  const known = game.campaign.characters.filter(c => c.id !== `ruler-${game.playerHouseId}` && knownCharacter(game, c))
  const own = known.filter(c => c.houseId === game.playerHouseId), others = known.filter(c => c.houseId !== game.playerHouseId)
  return <>
    <Section title="Corte de Pontevela">{own.map(c => <CharacterRow key={c.id} game={game} character={c}/>)}</Section>
    <Section title="Outras casas">{others.length ? others.map(c => <CharacterRow key={c.id} game={game} character={c}/>) : <Empty>Explore províncias e envie emissários para conhecer outros nobres.</Empty>}</Section>
  </>
}

function Conversation({ game, character, act }: { game: GameState; character: Character; act: Act }) {
  const { selectCharacter } = useUI()
  const house = houseOf(game, character.houseId)
  const able = canConverse(game, character)
  const last = game.campaign.conversations.filter(c => c.characterId === character.id).at(-1)
  const distant = character.houseId !== game.playerHouseId
  return <>
    <button className={styles.back} onClick={() => selectCharacter(null)}>‹ Voltar</button>
    <div className={styles.portraitHeader}>
      <Portrait character={character} color={house.color} size={74}/>
      <div><small>{house.name.toUpperCase()}</small><h1>{character.name}</h1><p>{character.role} · {character.age} anos</p><p className={styles.traits}>{character.traits.map(t => <span key={t}>{t}</span>)}</p></div>
    </div>
    <div className={styles.body}>
      <div className={styles.attributes}>{([['Diplomacia', character.diplomacy], ['Carisma', character.charisma], ['Intriga', character.intrigue], ['Ambição', character.ambition]] as const).map(([label, value]) => <div key={label}><small>{label}</small><strong>{value}</strong></div>)}</div>
      <Meter value={character.relationship.trust} label="Confiança"/>
      <Meter value={character.relationship.respect} label="Respeito"/>
      <Meter value={character.relationship.friendship} label="Amizade"/>
      {last && <div className={styles.speech} aria-live="polite"><p>“{last.response}”</p><small>{last.consequence}</small></div>}
      {able ? <Section title="Conversar">
        <div className={styles.topics}>{(Object.keys(TOPICS) as DialogueTopic[]).map(topic => { const wait = dialogueWait(game, character.id, topic); return <button key={topic} disabled={wait > 0} onClick={() => act(g => converse(g, character.id, topic))} title={wait ? `Disponível em ${wait} dias` : undefined}>{TOPICS[topic]}{wait > 0 && <small>{wait} d</small>}</button> })}</div>
      </Section> : <Empty>{distant ? 'Personagens de outras casas exigem contato estabelecido por emissário ou uma audiência concedida.' : 'Indisponível.'}</Empty>}
      {character.memory.length > 0 && <Section title="Memória">{character.memory.slice(-5).reverse().map((m, i) => <p key={i} className={styles.memory}><small>{longDate(m.day)}</small>{m.text}</p>)}</Section>}
    </div>
  </>
}

function ForeignCourt({ game, provinceId, act }: { game: GameState; provinceId: string; act: Act }) {
  const province = game.world.provinces.find(p => p.id === provinceId)!
  const level = knowledge(game, provinceId)
  const { selectProvince } = useUI()
  const house = houseOf(game, province.governingHouseId)
  const contact = game.campaign.contacts.find(c => c.houseId === house.id)
  const characters = game.campaign.characters.filter(c => c.houseId === house.id && knownCharacter(game, c))
  const reports = game.campaign.reports.filter(r => r.provinceId === provinceId).slice().reverse()
  const idle = game.campaign.agents.filter(a => a.hired && !game.campaign.spyMissions.some(m => m.agentId === a.id && !m.completed))
  const busy = game.campaign.spyMissions.filter(m => m.provinceId === provinceId && !m.completed)
  const quote = level >= 2 ? spyQuote(game, provinceId) : null
  const gold = houseOf(game, game.playerHouseId).gold
  return <>
    <button className={styles.back} onClick={() => selectProvince(null)}>‹ {houseOf(game, game.playerHouseId).name}</button>
    <ProvinceHeader game={game} province={province}/>
    <div className={styles.body}>
      {level < 2 ? <Empty>Estas terras ainda não foram exploradas. Use o modo Descobrir para enviar uma expedição.</Empty> : <>
        <Row label="Casa governante" value={house.name}/>
        <Row label="Relação" value={contact?.establishedDay != null ? `${disposition(contact.relation)} (${contact.relation})` : contact ? 'Emissário a caminho' : 'Sem contato'}/>
        {contact?.establishedDay != null && <Section title="Relações diplomáticas"><Relations game={game} houseId={house.id} act={act}/></Section>}
        <Section title="Personagens conhecidos">{characters.length ? characters.map(c => <CharacterRow key={c.id} game={game} character={c}/>) : <Empty>Nenhum personagem conhecido.</Empty>}</Section>
        <Section title="Investigar província">
          {busy.map(m => { const agent = game.campaign.characters.find(c => c.id === game.campaign.agents.find(a => a.id === m.agentId)!.characterId)!; return <div key={m.id} className={styles.pending}><Row label={`${agent.name} infiltrado`} value={`${m.endDay - game.day} dias`}/><Progress value={(game.day - m.startDay) / (m.endDay - m.startDay)} label="Missão de espionagem"/></div> })}
          {idle.length ? idle.map(a => { const c = game.campaign.characters.find(ch => ch.id === a.characterId)!; return <ActionButton key={a.id} title={`Enviar ${c.name}`} detail={`Intriga ${c.intrigue} · ${quote!.gold} ouro · ${quote!.days} dias`} disabled={!quote!.route.length || gold < quote!.gold} reason={!quote!.route.length ? 'Exige rota terrestre por províncias exploradas.' : 'Ouro insuficiente.'} onClick={() => act(g => sendSpy(g, a.id, provinceId), `${c.name} partiu em missão.`)}/> }) : <Empty>{game.campaign.agents.some(a => a.hired) ? 'Todos os agentes estão em missão.' : 'Contrate um agente na aba Espiões.'}</Empty>}
        </Section>
        <Section title="Relatórios de inteligência">{reports.length ? reports.map(r => <ReportCard key={r.id} game={game} reportId={r.id}/>) : <Empty>Nenhuma informação colhida por agentes.</Empty>}</Section>
      </>}
    </div>
  </>
}

function ReportCard({ game, reportId, link }: { game: GameState; reportId: string; link?: boolean }) {
  const { focusProvince, setMode } = useUI()
  const r = game.campaign.reports.find(x => x.id === reportId)!
  const expired = r.expiresDay < game.day
  return <article className={`${styles.intel} ${expired ? styles.expired : ''}`} data-report={r.provinceId}>
    <h3>Relatório — {visibleProvinceName(game, r.provinceId)}</h3>
    <p className={styles.intelMeta}>{longDate(r.day)} · Fonte: {r.source} · Confiança {r.confidence} · {expired ? 'desatualizado' : `válido até ${longDate(r.expiresDay)}`}</p>
    <p>{r.text}</p>
    {r.rumor && <p className={styles.rumor}>Rumor não confirmado: {r.rumor}</p>}
    {link && <button className={styles.linkButton} onClick={() => { setMode('influenciar'); focusProvince(r.provinceId) }}>Ver no mapa ›</button>}
  </article>
}

function Spies({ game, act }: { game: GameState; act: Act }) {
  const gold = houseOf(game, game.playerHouseId).gold
  const hired = game.campaign.agents.filter(a => a.hired)
  return <>
    <p className={styles.lead}>Agentes custam {BALANCE.spy.gold} ouro e {BALANCE.spy.upkeep} ouro/mês. Selecione uma província conhecida no mapa para enviá-los. Máximo de {BALANCE.spy.max}.</p>
    <Section title="Agentes" aside={<small>{hired.length}/{BALANCE.spy.max}</small>}>
      {game.campaign.agents.map(agent => {
        const c = game.campaign.characters.find(ch => ch.id === agent.characterId)!
        const mission = game.campaign.spyMissions.find(m => m.agentId === agent.id && !m.completed)
        return <div key={agent.id} className={styles.agent} data-agent={agent.id}>
          <Portrait character={c} color="#3b3a35" size={44}/>
          <div><strong>{c.name}</strong><small>{c.role} · Intriga {c.intrigue} · Lealdade {agent.loyalty}</small><p>{agent.description}</p>
            {agent.hired ? mission ? <><small className={styles.status}>Em missão em {visibleProvinceName(game, mission.provinceId)} · {mission.endDay - game.day} dias</small><Progress value={(game.day - mission.startDay) / (mission.endDay - mission.startDay)} label="Missão"/></> : <small className={styles.done}>Disponível em Pontevela</small>
              : <ActionButton title="Contratar" detail={`${BALANCE.spy.gold} ouro · ${BALANCE.spy.upkeep}/mês`} disabled={hired.length >= BALANCE.spy.max || gold < BALANCE.spy.gold} reason={hired.length >= BALANCE.spy.max ? 'Limite de três agentes.' : 'Ouro insuficiente.'} onClick={() => act(g => hireSpy(g, agent.id), `${c.name} agora serve à sua casa.`)}/>}
          </div>
        </div>
      })}
    </Section>
    <Section title="Arquivo de relatórios">{game.campaign.reports.length ? game.campaign.reports.slice().reverse().map(r => <ReportCard key={r.id} game={game} reportId={r.id} link/>) : <Empty>Nenhum relatório recebido.</Empty>}</Section>
  </>
}

function RelationList({ game }: { game: GameState }) {
  const { focusProvince } = useUI()
  const contacts = game.campaign.contacts
  return contacts.length ? <>{contacts.map(c => { const house = houseOf(game, c.houseId); return <button key={c.houseId} className={styles.contact} onClick={() => focusProvince(c.provinceId)}>
    <HouseMark game={game} houseId={c.houseId} size={30}/>
    <span><strong>{house.name}</strong><small>{c.establishedDay === null ? 'Emissário a caminho' : `${disposition(c.relation)} · ${c.relation > 0 ? '+' : ''}${c.relation}${c.trade ? ' · comércio' : ''}`}</small></span>
    <em>›</em>
  </button> })}</> : <Empty>Nenhuma casa contatada. Explore uma província vizinha e envie um emissário pelo modo Descobrir.</Empty>
}
