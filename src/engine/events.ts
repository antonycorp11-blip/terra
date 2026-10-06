import type { GameState, House, Id, Province } from './types'
import type { Decision, WorldEvent } from './mvpTypes'
import { BALANCE } from './balance'
import { clamp, controlled, isVassal, nextId, pay, playerHouse, playerSeat, record } from './stateUtils'
import { notify } from './notifications'
import { hash } from './random'
import { knowledge, reveal } from './knowledge'
import { rulerOf } from './characters'
import { PORTRAITS } from './portraits'
import { castleOf, defenders, enemyArmy, resolveBattle } from './military'
import { adminOf } from './economy'

const E = BALANCE.events, W = BALANCE.world
const roll = (g: GameState, key: string) => hash(`${g.world.seed}:${g.day}:${key}`)
const house = (g: GameState, id: Id) => g.world.houses.find(h => h.id === id)!
const prov = (g: GameState, id: Id) => g.world.provinces.find(p => p.id === id)!
const contact = (g: GameState, id: Id) => g.campaign.contacts.find(c => c.houseId === id)
const hasCondition = (g: GameState, id: Id) => g.campaign.conditions.some(c => c.provinceId === id && c.until > g.day)
/** Houses the player knows and could deal with: contacts that are not vassals. */
const knownHouses = (g: GameState) => g.campaign.contacts.filter(c => c.establishedDay !== null && !isVassal(g, c.houseId)).map(c => house(g, c.houseId))
type Candidate = { weight: number; provinceId: Id | null; houseId: Id | null; event: WorldEvent }

/** Every event the world can raise today. Each choice has a cost and a consequence the engine applies. */
function candidates(g: GameState): Candidate[] {
  const out: Candidate[] = [], mine = controlled(g)
  const pick = <T,>(list: T[], key: string) => list[roll(g, key) % list.length]
  const restless = mine.filter(p => !hasCondition(g, p.id)).sort((a, b) => a.loyalty - b.loyalty)
  const anyLand = pick(mine.filter(p => !hasCondition(g, p.id)), 'land')
  if (restless[0] && restless[0].loyalty < 55) {
    const p = restless[0]
    out.push({ weight: 4, provinceId: p.id, houseId: null, event: { key: 'peticao', title: `Petição de ${p.name}`, text: `Anciãos de ${p.name} chegam à sua corte. Pedem que a coroa da casa veja a miséria das aldeias: lealdade atual ${p.loyalty}.`, data: { province: p.id }, choices: [
      { id: 'ouvir', label: 'Ouvir e ajudar', detail: 'Pagar 60 de ouro em sementes e telhados. Lealdade +8.', cost: '60 ouro' },
      { id: 'ignorar', label: 'Mandar embora', detail: 'Nada gasto. Lealdade −4 e a notícia corre.' },
    ] } })
  }
  if (restless[0] && restless[0].loyalty < 30) {
    const p = restless[0], garrison = g.campaign.garrisons[p.id] ?? 0
    out.push({ weight: 6, provinceId: p.id, houseId: null, event: { key: 'motim', title: `Motim em ${p.name}`, text: `O povo de ${p.name} fechou os portões ao seu cobrador. Sua guarnição lá: ${garrison} homens.`, data: { province: p.id }, choices: [
      { id: 'baixar', label: 'Baixar o imposto', detail: 'O imposto da província vai para baixo. Lealdade +6 agora.' },
      { id: 'reprimir', label: 'Reprimir', detail: garrison >= 100 ? 'A guarnição abre os portões à força: perde até 20 homens, lealdade +3, o medo segura o povo.' : 'Com menos de 100 homens a repressão falha: perde homens e lealdade −6.' },
    ] } })
  }
  if (anyLand) {
    out.push({ weight: 2, provinceId: anyLand.id, houseId: null, event: { key: 'bandidos', title: `Bandidos em ${anyLand.name}`, text: `Um bando assalta carroças nas estradas de ${anyLand.name}. Os mercadores já evitam o caminho.`, data: { province: anyLand.id }, choices: [
      { id: 'cacar', label: 'Caçar o bando', detail: 'A guarnição local sai em patrulha (precisa de 40 homens). Perde alguns, recupera o saque e ganha lealdade.' },
      { id: 'tolerar', label: 'Deixar estar', detail: 'A renda da província cai 30% por 60 dias.' },
    ] } })
    if (anyLand.terrain !== 'várzea') out.push({ weight: 2, provinceId: anyLand.id, houseId: null, event: { key: 'seca', title: `Seca em ${anyLand.name}`, text: `Não chove em ${anyLand.name} há semanas. A colheita vai sair pela metade.`, data: { province: anyLand.id }, choices: [
      { id: 'distribuir', label: 'Abrir os celeiros', detail: 'Dar 100 de grãos ao povo. Lealdade +6. A colheita fica pela metade por 45 dias.', cost: '100 grãos' },
      { id: 'racionar', label: 'Racionar', detail: 'Colheita pela metade por 60 dias e lealdade −6.' },
    ] } })
    if (anyLand.population > 2500) out.push({ weight: 1, provinceId: anyLand.id, houseId: null, event: { key: 'peste', title: `Febre em ${anyLand.name}`, text: `Uma febre corre pelas casas de ${anyLand.name}. Os curandeiros pedem dinheiro e portões fechados.`, data: { province: anyLand.id }, choices: [
      { id: 'quarentena', label: 'Quarentena e curandeiros', detail: 'Pagar 80 de ouro. A febre dura 20 dias.', cost: '80 ouro' },
      { id: 'nada', label: 'Rezar', detail: 'A febre dura 50 dias, a população cai 2% ao mês e a lealdade −4.' },
    ] } })
  }
  const goods: [string, 'salt' | 'iron' | 'silver' | 'stone', number][] = [['sal', 'salt', 60], ['ferro', 'iron', 50], ['prata', 'silver', 30], ['pedra', 'stone', 60]]
  const [label, key, amount] = pick(goods, 'goods')
  out.push({ weight: 2, provinceId: playerSeat(g).id, houseId: null, event: { key: 'mercador', title: 'Mercador estrangeiro', text: `Uma barcaça de ${pick(['Lunaris', 'Orvane', 'Saltmere', 'Brennic'], 'origin')} atraca em ${playerSeat(g).name} com ${amount} de ${label} a preço de ocasião.`, data: { key, amount }, choices: [
    { id: 'comprar', label: `Comprar ${amount} de ${label}`, detail: 'Metade do preço do mercado.', cost: '90 ouro' },
    { id: 'recusar', label: 'Dispensar', detail: 'O mercador segue viagem.' },
  ] } })
  const war = g.campaign.wars.find(w => w.active)
  if (war) {
    const loser = house(g, war.defenderId)
    out.push({ weight: 3, provinceId: playerSeat(g).id, houseId: war.attackerId, event: { key: 'refugiados', title: 'Refugiados na estrada', text: `Famílias fogem da guerra entre ${house(g, war.attackerId).name} e ${loser.name} e pedem abrigo em ${playerSeat(g).name}.`, data: { attacker: war.attackerId }, choices: [
      { id: 'acolher', label: 'Acolher', detail: 'Pagar 80 de grãos. A população da sede cresce 300 e a casa agressora fica irritada.', cost: '80 grãos' },
      { id: 'recusar', label: 'Fechar os portões', detail: 'Nada muda além da sua consciência.' },
    ] } })
  }
  const rivals = knownHouses(g).filter(x => x.id !== g.playerHouseId)
  if (rivals.length) {
    const spyHouse = pick(rivals, 'spy')
    out.push({ weight: 2, provinceId: playerSeat(g).id, houseId: spyHouse.id, event: { key: 'espiao', title: 'Espião capturado', text: `A guarda prendeu um homem copiando suas cartas. Ele carrega o selo da ${spyHouse.name}.`, data: { house: spyHouse.id }, choices: [
      { id: 'executar', label: 'Enforcar em praça pública', detail: 'Renome +3. Relação com a casa −15.' },
      { id: 'devolver', label: 'Devolver com um recado', detail: 'Relação +8 e influência +5: eles ficam devendo.' },
      { id: 'virar', label: 'Comprar o espião', detail: 'Pagar 50 de ouro. Ele revela tudo sobre a sede da casa.', cost: '50 ouro' },
    ] } })
    const tracked = rivals.filter(x => (g.campaign.influence[x.id] ?? 0) >= 20).sort((a, b) => (g.campaign.influence[b.id] ?? 0) - (g.campaign.influence[a.id] ?? 0))[0]
    const rivalCourt = g.world.houses.find(x => x.id === playerSeat(g).liegeHouseId && x.id !== tracked?.id)
    if (tracked && rivalCourt) out.push({ weight: 3, provinceId: tracked.seatProvinceId, houseId: tracked.id, event: { key: 'contra', title: 'Intriga contra você', text: `${rivalCourt.name} espalha na corte da ${tracked.name} que sua casa quer engolir os vizinhos. Sua influência lá (${g.campaign.influence[tracked.id]}) está em risco.`, data: { house: tracked.id }, choices: [
      { id: 'responder', label: 'Responder com presentes', detail: 'Pagar 60 de ouro e 3 de renome. A influência se mantém.', cost: '60 ouro · 3 renome' },
      { id: 'ignorar', label: 'Ignorar', detail: 'Influência −12 sobre essa casa.' },
    ] } })
    const host = pick(rivals, 'tourney')
    out.push({ weight: 2, provinceId: host.seatProvinceId, houseId: host.id, event: { key: 'torneio', title: `Torneio da ${host.name}`, text: `${rulerOf(g, host.id).name} convida as casas para um torneio. Um campeão seu pode trazer glória ou vergonha.`, data: { house: host.id }, choices: [
      { id: 'enviar', label: 'Enviar um campeão', detail: 'Pagar 80 de ouro. Relação +6 e renome +4; vencendo, mais 8 de renome.', cost: '80 ouro' },
      { id: 'recusar', label: 'Agradecer e recusar', detail: 'Relação −3.' },
    ] } })
    const poor = rivals.filter(x => x.gold < 300 && !g.campaign.eventLog[`loan:${x.id}`])[0]
    if (poor) out.push({ weight: 2, provinceId: poor.seatProvinceId, houseId: poor.id, event: { key: 'emprestimo', title: `A ${poor.name} pede ouro`, text: `${rulerOf(g, poor.id).name} pede 150 de ouro emprestados e promete devolver 200 em três meses.`, data: { house: poor.id }, choices: [
      { id: 'emprestar', label: 'Emprestar 150', detail: 'Relação +12, influência +10. Se não pagarem, a dívida vira um laço.', cost: '150 ouro' },
      { id: 'recusar', label: 'Recusar', detail: 'Relação −6.' },
    ] } })
    const suitor = rivals.filter(x => (contact(g, x.id)?.relation ?? 0) >= 20 && !g.campaign.bonds.some(b => b.houseId === x.id))[0]
    if (suitor && !g.campaign.eventLog[`marriage:${suitor.id}`]) out.push({ weight: 2, provinceId: suitor.seatProvinceId, houseId: suitor.id, event: { key: 'casamento', title: 'Proposta de casamento', text: `A ${suitor.name} propõe unir uma filha da casa à sua família. Um laço de sangue abre caminho para o juramento.`, data: { house: suitor.id }, choices: [
      { id: 'aceitar', label: 'Aceitar', detail: 'Pagar 60 de ouro de festa. Laço de casamento, relação +20 e influência +15.', cost: '60 ouro' },
      { id: 'recusar', label: 'Recusar', detail: 'Relação −10.' },
    ] } })
  }
  return out
}

/** Raises a world event every few days, so the realm never stays still for long. */
export function processEvents(g: GameState) {
  processWars(g); processSuccession(g); processLoans(g)
  if (g.day < g.campaign.nextEventDay || g.campaign.decisions.some(d => !d.resolved && d.kind === 'evento')) return
  const recent = (key: string) => g.day - (g.campaign.eventLog[key] ?? -999) < 45
  const list = candidates(g).filter(c => !recent(c.event.key))
  g.campaign.nextEventDay = g.day + E.minGap + roll(g, 'gap') % E.spread
  if (!list.length) return
  const total = list.reduce((s, c) => s + c.weight, 0)
  let r = roll(g, 'event') % total, chosen = list[0]
  for (const c of list) { if (r < c.weight) { chosen = c; break } r -= c.weight }
  g.campaign.eventLog[chosen.event.key] = g.day
  g.campaign.decisions.push({ id: nextId(g, 'decision'), kind: 'evento', day: g.day, provinceId: chosen.provinceId, houseId: chosen.houseId, resolved: false, event: chosen.event })
  notify(g, chosen.event.title, chosen.event.text, chosen.provinceId, true)
}

/** Applies the player's answer to a world event. */
export function resolveEvent(g: GameState, d: Decision, choice: string) {
  const ev = d.event!, h = playerHouse(g), p = d.provinceId ? prov(g, d.provinceId) : null
  const hid = (ev.data.house ?? d.houseId) as Id | undefined, other = hid ? house(g, hid) : null
  const c = hid ? contact(g, hid) : undefined
  const rel = (n: number) => { if (c) c.relation = clamp(c.relation + n) }
  const inf = (n: number) => { if (hid) g.campaign.influence[hid] = clamp((g.campaign.influence[hid] ?? 0) + n, 0, 100) }
  const loyal = (n: number) => { if (p) p.loyalty = clamp(p.loyalty + n, 0, 100) }
  const cond = (kind: 'seca' | 'peste' | 'bandidos', days: number) => { if (p) g.campaign.conditions.push({ provinceId: p.id, kind, until: g.day + days }) }
  let result = ''
  switch (`${ev.key}:${choice}`) {
    case 'peticao:ouvir': pay(g, { gold: 60 }); loyal(8); result = `${p!.name} lembra da sua generosidade. Lealdade +8.`; break
    case 'peticao:ignorar': loyal(-4); result = `Os anciãos voltam de mãos vazias. Lealdade −4.`; break
    case 'motim:baixar': g.campaign.admin[p!.id] = { ...adminOf(g, p!.id), tax: 'baixo' }; loyal(6); result = `Imposto baixo em ${p!.name}. Os portões se abrem.`; break
    case 'motim:reprimir': {
      const garrison = g.campaign.garrisons[p!.id] ?? 0, lost = Math.min(garrison, garrison >= 100 ? 8 + roll(g, 'riot') % 13 : 25)
      g.campaign.garrisons[p!.id] = garrison - lost
      loyal(garrison >= 100 ? 3 : -6); result = garrison >= 100 ? `A guarnição retomou as ruas e perdeu ${lost} homens.` : `A repressão fracassou: ${lost} homens perdidos e o povo mais revoltado.`
      break
    }
    case 'bandidos:cacar': {
      const garrison = g.campaign.garrisons[p!.id] ?? 0
      if (garrison < 40) { cond('bandidos', 60); result = `Sem homens suficientes em ${p!.name}: o bando continua nas estradas.`; break }
      const lost = 4 + roll(g, 'bandits') % 12; g.campaign.garrisons[p!.id] = garrison - lost; h.gold += 50; loyal(5)
      result = `O bando foi desfeito. ${lost} homens perdidos, 50 de ouro recuperados, lealdade +5.`; break
    }
    case 'bandidos:tolerar': cond('bandidos', 60); result = `A renda de ${p!.name} cai 30% por 60 dias.`; break
    case 'seca:distribuir': pay(g, { food: 100 }); cond('seca', 45); loyal(6); result = `O povo come. A colheita de ${p!.name} sai pela metade por 45 dias.`; break
    case 'seca:racionar': cond('seca', 60); loyal(-6); result = `Racionamento em ${p!.name}: colheita pela metade por 60 dias, lealdade −6.`; break
    case 'peste:quarentena': pay(g, { gold: 80 }); g.campaign.conditions.push({ provinceId: p!.id, kind: 'peste', until: g.day + 20 }); result = 'Os portões se fecham e os curandeiros trabalham. A febre deve passar em 20 dias.'; break
    case 'peste:nada': g.campaign.conditions.push({ provinceId: p!.id, kind: 'peste', until: g.day + 50 }); loyal(-4); result = `A febre vai durar. ${p!.name} perde gente todo mês.`; break
    case 'mercador:comprar': { pay(g, { gold: 90 }); const k = ev.data.key as 'salt' | 'iron' | 'silver' | 'stone'; h.stock[k] += Number(ev.data.amount); result = 'A carga foi para os seus armazéns.'; break }
    case 'mercador:recusar': result = 'A barcaça parte.'; break
    case 'refugiados:acolher': { pay(g, { food: 80 }); const seat = playerSeat(g); seat.population += 300; const atk = contact(g, String(ev.data.attacker)); if (atk) atk.relation = clamp(atk.relation - 6); result = `300 pessoas se instalam em ${seat.name}.`; break }
    case 'refugiados:recusar': result = 'Os refugiados seguem para o sul.'; break
    case 'espiao:executar': rel(-15); h.prestige += 3; result = `A ${other!.name} soube do enforcamento. Renome +3, relação −15.`; break
    case 'espiao:devolver': rel(8); inf(5); result = `A ${other!.name} agradece, constrangida. Relação +8, influência +5.`; break
    case 'espiao:virar': pay(g, { gold: 50 }); reveal(g, other!.seatProvinceId, 'investigada', 'Espião comprado'); rel(-5); result = `O espião contou tudo sobre ${prov(g, other!.seatProvinceId).name}.`; break
    case 'contra:responder': pay(g, { gold: 60, renown: 3 }); result = `Seus presentes calaram os boatos na corte da ${other!.name}.`; break
    case 'contra:ignorar': inf(-12); result = `Os boatos pegaram: influência sobre a ${other!.name} −12.`; break
    case 'torneio:enviar': {
      pay(g, { gold: 80 }); rel(6); h.prestige += 4
      const won = roll(g, 'joust') % 100 < 40; if (won) h.prestige += 8
      result = won ? 'Seu campeão venceu a justa! Renome +12 no total.' : 'Seu campeão caiu na terceira justa, mas lutou bem. Renome +4.'; break
    }
    case 'torneio:recusar': rel(-3); result = 'A ausência foi notada.'; break
    case 'emprestimo:emprestar': pay(g, { gold: 150 }); other!.gold += 150; rel(12); inf(10); g.campaign.eventLog[`loan:${hid}`] = g.day + 90; result = `150 de ouro emprestados à ${other!.name}. Devem 200 em 90 dias.`; break
    case 'emprestimo:recusar': rel(-6); result = 'O mensageiro parte ofendido.'; break
    case 'casamento:aceitar': pay(g, { gold: 60 }); rel(20); inf(15); g.campaign.bonds.push({ houseId: hid!, kind: 'casamento', day: g.day, text: `Casamento entre a ${h.name} e a ${other!.name}.` }); g.campaign.eventLog[`marriage:${hid}`] = g.day; result = `As casas estão unidas pelo sangue. Influência +15.`; break
    case 'casamento:recusar': rel(-10); g.campaign.eventLog[`marriage:${hid}`] = g.day; result = 'A recusa foi uma ofensa.'; break
    case 'revolta:concessao': {
      pay(g, { gold: 150 }); const v = g.campaign.vassals.find(x => x.houseId === hid)!
      v.loyalty = 45; g.campaign.admin[other!.seatProvinceId] = { ...adminOf(g, other!.seatProvinceId), governor: `ruler-${hid}` }
      result = `${rulerOf(g, hid!).name} volta a governar ${prov(g, other!.seatProvinceId).name} em seu nome.`; break
    }
    case 'revolta:esmagar': result = crushRevolt(g, hid!, Number(ev.data.rebels)); break
    case 'sucessao:apoiar': pay(g, { gold: 100 }); g.campaign.politics.liegeThreat = clamp(g.campaign.politics.liegeThreat - 25, 0, 100); rel(15); result = `${rulerOf(g, hid!).name} não esquece quem o apoiou. Ameaça −25.`; break
    case 'sucessao:pretendente': pay(g, { renown: 10 }); other!.mobilizable = Math.round(other!.mobilizable * .55); inf(20); g.campaign.politics.liegeThreat = clamp(g.campaign.politics.liegeThreat + 15, 0, 100); result = `A ${other!.name} se divide entre irmãos. Metade dos homens deles não responde mais ao novo grão-lorde.`; break
    case 'sucessao:neutro': result = 'Sua casa observa de longe.'; break
  }
  d.choice = choice
  notify(g, ev.title, result, d.provinceId)
}

function crushRevolt(g: GameState, houseId: Id, rebels: number): string {
  const rebel = house(g, houseId), seat = prov(g, rebel.seatProvinceId), garrison = g.campaign.garrisons[seat.id] ?? 0
  const r = resolveBattle(`${g.world.seed}:revolta:${houseId}:${g.day}`, rebels, garrison, 1, 'assalto', false, seat.terrain)
  g.campaign.vassals = g.campaign.vassals.filter(v => v.houseId !== houseId || !r.victory)
  if (r.victory) {
    // The rebels take their seat back and leave the player's rule.
    seat.governingHouseId = houseId; seat.legalHouseId = houseId; g.campaign.garrisons[seat.id] = 0; delete g.campaign.garrisons[seat.id]; delete g.campaign.admin[seat.id]
    castleOf(g, seat).garrison = r.attackerLeft
    const ct = contact(g, houseId); if (ct) ct.relation = -60
    g.campaign.influence[houseId] = 0
    record(g, `A ${rebel.name} retomou ${seat.name} da ${playerHouse(g).name}.`, [houseId, seat.id])
    return `Os rebeldes venceram. ${seat.name} voltou para a ${rebel.name}, que agora é sua inimiga.`
  }
  g.campaign.garrisons[seat.id] = r.defenderLeft
  const v = g.campaign.vassals.find(x => x.houseId === houseId); if (v) v.loyalty = 35
  rebel.mobilizable = Math.round(rebel.mobilizable * .5)
  playerHouse(g).prestige += 4
  return `A revolta foi esmagada em ${seat.name}. A ${rebel.name} se curva de novo, quebrada. Sua guarnição: ${r.defenderLeft}.`
}

/** Loans come back with interest, or turn into a debt bond. */
function processLoans(g: GameState) {
  for (const [key, due] of Object.entries(g.campaign.eventLog)) {
    if (!key.startsWith('loan:') || due !== g.day) continue
    const debtor = house(g, key.slice(5))
    if (debtor.gold >= 200) { debtor.gold -= 200; playerHouse(g).gold += 200; notify(g, 'Dívida paga', `A ${debtor.name} devolveu 200 de ouro.`, debtor.seatProvinceId) }
    else { g.campaign.bonds.push({ houseId: debtor.id, kind: 'dívida', day: g.day, text: `A ${debtor.name} não pagou o empréstimo.` }); g.campaign.influence[debtor.id] = clamp((g.campaign.influence[debtor.id] ?? 0) + 10, 0, 100); notify(g, 'Dívida não paga', `A ${debtor.name} não tem como pagar. Agora deve a você um favor que pode virar juramento.`, debtor.seatProvinceId, true) }
    g.campaign.eventLog[key] = -1
  }
}

/** Houses wage war on each other: Ardesh raids Hadrin early, then rivalries flare across the realm. */
function processWars(g: GameState) {
  for (const w of g.campaign.wars) if (w.active && g.day - w.startDay >= W.peaceAfter) {
    w.active = false
    if (knowledge(g, house(g, w.attackerId).seatProvinceId) >= 1) notify(g, 'Paz', `${house(g, w.attackerId).name} e ${house(g, w.defenderId).name} assinaram uma trégua.`, house(g, w.attackerId).seatProvinceId)
  }
  const realm = playerHouse(g).realmId
  const npc = (x: House) => x.id !== g.playerHouseId && !isVassal(g, x.id) && x.rank !== 'real' && x.realmId === realm
  const atWar = (id: Id) => g.campaign.wars.some(w => w.active && (w.attackerId === id || w.defenderId === id))
  let attacker: House | undefined, target: Province | undefined, reason = ''
  if (g.day === W.ardeshWarDay) {
    attacker = g.world.houses.find(x => x.name === 'Casa Ardesh' && npc(x)); const liege = g.world.houses.find(x => x.id === playerSeat(g).liegeHouseId)
    if (attacker && liege && liege.id !== g.playerHouseId) target = g.world.provinces.filter(p => p.governingHouseId === liege.id && !p.occupyingHouseId && p.id !== liege.seatProvinceId).sort((a, b) => dist(a, prov(g, attacker!.seatProvinceId)) - dist(b, prov(g, attacker!.seatProvinceId)))[0]
    reason = 'pelas minas da fronteira'
  } else if (g.day > W.ardeshWarDay && g.day % W.warEvery === 0) {
    const pool = g.world.houses.filter(x => npc(x) && !atWar(x.id) && x.mobilizable >= 300)
    attacker = pool[roll(g, 'war') % Math.max(1, pool.length)]
    if (attacker) {
      const own = g.world.provinces.filter(p => p.governingHouseId === attacker!.id)
      const borders = own.flatMap(p => p.neighbors.map(n => prov(g, n))).filter(p => p.governingHouseId !== attacker!.id && !p.occupyingHouseId && npc(house(g, p.governingHouseId)) && !atWar(p.governingHouseId) && p.liegeHouseId !== attacker!.id)
      target = borders[roll(g, 'warTarget') % Math.max(1, borders.length)]
      reason = pick(['por uma herança disputada', 'por um casamento desfeito', 'pela rota do sal', 'por um insulto antigo', 'por terras de caça'], roll(g, 'reason'))
    }
  }
  if (!attacker || !target) return
  const defender = house(g, target.governingHouseId), men = Math.round(attacker.mobilizable * .5)
  if (men < 100 || defenders(g, target) <= 0) return
  const army = enemyArmy(g, attacker.id, men, attacker.seatProvinceId, target.id)
  if (!army) return
  attacker.mobilizable -= men
  g.campaign.wars.push({ id: nextId(g, 'war'), attackerId: attacker.id, defenderId: defender.id, startDay: g.day, reason, active: true })
  record(g, `${attacker.name} declarou guerra à ${defender.name} ${reason}.`, [attacker.id, defender.id])
  const seen = knowledge(g, target.id) >= 1 || knowledge(g, attacker.seatProvinceId) >= 1
  if (seen) notify(g, 'Guerra entre casas', `${attacker.name} marcha com ${men} homens contra ${knowledge(g, target.id) >= 2 ? target.name : 'terras avistadas'} da ${defender.name}, ${reason}. Uma casa em guerra fica fraca em casa.`, target.id, defender.id === playerSeat(g).liegeHouseId)
}
const dist = (a: Province, b: Province) => Math.hypot(a.center[0] - b.center[0], a.center[1] - b.center[1])
const pick = <T,>(list: T[], n: number) => list[n % list.length]

/** The old grand lord dies; his heir takes the seat and the player must choose a side. */
function processSuccession(g: GameState) {
  if (g.day !== W.hadrinDeathDay) return
  const liege = g.world.houses.find(x => x.id === playerSeat(g).liegeHouseId)
  if (!liege || liege.id === g.playerHouseId || isVassal(g, liege.id)) return
  const ruler = rulerOf(g, liege.id), counsel = g.campaign.characters.find(c => c.id === `counsel-${liege.id}`)
  const old = ruler.name
  const used = new Set(g.campaign.characters.map(c => c.portraitAsset))
  const figure = PORTRAITS.find(f => f.race === ruler.race && !used.has(f.file))
  ruler.name = counsel?.name ?? 'Aldric'; ruler.age = 24 + roll(g, 'heir') % 12; ruler.traits = ['ambicioso', 'belicoso']; ruler.ambition = 80; ruler.diplomacy = 35
  ruler.portraitAsset = figure?.file ?? null; ruler.memory = [{ day: g.day, text: `Herdou o assento do pai, ${old}.` }]
  ruler.relationship = { trust: 0, respect: 0, friendship: 0 }
  if (counsel) { counsel.name = pick(['Merel', 'Orsin', 'Talia', 'Bram'], roll(g, 'c')); counsel.role = 'Pretendente' }
  liege.memory.push(`${old} morreu no dia ${g.day}; ${ruler.name} herdou o assento.`)
  record(g, `${old} da ${liege.name} morreu. ${ruler.name} herdou o assento.`, [liege.id])
  g.campaign.decisions.push({ id: nextId(g, 'decision'), kind: 'evento', day: g.day, provinceId: liege.seatProvinceId, houseId: liege.id, resolved: false, event: {
    key: 'sucessao', title: `${old} morreu`, text: `O velho grão-lorde morreu. ${ruler.name}, jovem e ambicioso, toma o assento, mas ${counsel?.name ?? 'um primo'} contesta a herança. As casas do feudo esperam para ver de que lado você fica.`, data: { house: liege.id },
    choices: [
      { id: 'apoiar', label: `Apoiar ${ruler.name}`, detail: 'Pagar 100 de ouro em presentes de coroação. Ameaça −25 e relação +15.', cost: '100 ouro' },
      { id: 'pretendente', label: 'Apoiar o pretendente', detail: 'Gastar 10 de renome. A casa se divide e perde quase metade dos homens; influência +20, ameaça +15.', cost: '10 renome' },
      { id: 'neutro', label: 'Ficar neutro', detail: 'Nada muda, por enquanto.' },
    ] } })
  notify(g, 'Morte do grão-lorde', `${old} da ${liege.name} morreu. ${ruler.name} herdou o assento e a disputa começou.`, liege.seatProvinceId, true)
}
