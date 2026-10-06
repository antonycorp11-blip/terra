import type { GameState, Id, Province } from './types'
import type { BattlePhase, Decision, FieldTactic, Party } from './mvpTypes'
import { BALANCE } from './balance'
import { clamp, controlled, editGame, isVassal, nextId, pay, playerHouse, playerSeat, record, requireRule } from './stateUtils'
import { notify } from './notifications'
import { hash } from './random'
import { knowledge, reveal, sightNeighbors } from './knowledge'
import { rulerOf } from './characters'
import { initialRelation } from './relationships'
import { relationWith } from './influence'
import { makeVassal } from './vassals'

const PT = BALANCE.party, F = BALANCE.field, B = BALANCE.bandits, PR = BALANCE.prisoner
export const PLAYER_PARTY = 'party-player'
const prov = (g: GameState, id: Id) => g.world.provinces.find(p => p.id === id)!
const house = (g: GameState, id: Id) => g.world.houses.find(h => h.id === id)!
const roll = (g: GameState, key: string) => hash(`${g.world.seed}:${g.campaign.turn}:${key}`)
export const playerParty = (g: GameState) => g.campaign.parties.find(p => p.id === PLAYER_PARTY)!
export const partyCap = (g: GameState) => PT.capBase + PT.capPerProvince * controlled(g).length
/** Moving through mountains costs two moves. */
const hopCost = (p: Province) => p.terrain === 'montanha' ? 2 : 1
/** The ruler's party, if that lord is out on the roads; otherwise he is at his seat. */
export const lordParty = (g: GameState, houseId: Id) => g.campaign.parties.find(p => p.kind === 'lorde' && p.houseId === houseId)
export const isCaptive = (g: GameState, houseId: Id) => g.campaign.prisoners.some(p => p.houseId === houseId)
/** Where a house's lord is right now. */
export function lordLocation(g: GameState, houseId: Id): Id | null {
  if (isCaptive(g, houseId)) return null
  return lordParty(g, houseId)?.provinceId ?? house(g, houseId).seatProvinceId
}
/** Irian stands in the same province as that lord: talks and courtly gestures need no order. */
export const presentWith = (g: GameState, houseId: Id) => houseId === g.playerHouseId || lordLocation(g, houseId) === playerParty(g).provinceId
export const orderCost = (g: GameState, houseId: Id) => presentWith(g, houseId) ? 0 : 1

/** Spends turn orders around an action. The rule lives here so every remote action costs the same. */
export function withOrder(game: GameState, action: (g: GameState) => GameState, cost = 1): GameState {
  requireRule(game.campaign.orders >= cost, 'Sem ordens neste turno. Encerre o turno para receber novas.')
  const g = action(game)
  if (cost) { const next = g === game ? editGame(g) : g; next.campaign.orders -= cost; return next }
  return g
}

/* ---------- the player's retinue ---------- */
/** Provinces Irian can reach this turn, with the moves each costs. Sighted land can be entered and is explored on arrival. */
export function partyReach(g: GameState): Map<Id, number> {
  const party = playerParty(g), reach = new Map<Id, number>([[party.provinceId, 0]])
  const queue = [party.provinceId]
  while (queue.length) {
    const id = queue.shift()!, cost = reach.get(id)!
    for (const n of prov(g, id).neighbors) {
      const p = prov(g, n), c = cost + hopCost(p)
      if (c > party.moves || knowledge(g, n) < 1 || (reach.has(n) && reach.get(n)! <= c)) continue
      reach.set(n, c); queue.push(n)
    }
  }
  reach.delete(party.provinceId)
  return reach
}
/** Cheapest path over land Irian knows (sighted at least), with its total cost in moves. */
export function partyPath(g: GameState, to: Id): { path: Id[]; cost: number } | null {
  const from = playerParty(g).provinceId, dist = new Map<Id, number>([[from, 0]]), prev = new Map<Id, Id>(), open = [from]
  while (open.length) {
    open.sort((a, b) => dist.get(a)! - dist.get(b)!)
    const id = open.shift()!
    if (id === to) break
    for (const n of prov(g, id).neighbors) {
      if (knowledge(g, n) < 1) continue
      const c = dist.get(id)! + hopCost(prov(g, n))
      if (c < (dist.get(n) ?? Infinity)) { dist.set(n, c); prev.set(n, id); open.push(n) }
    }
  }
  if (!dist.has(to) || to === from) return null
  const path = [to]; while (path[0] !== from) path.unshift(prev.get(path[0])!)
  return { path, cost: dist.get(to)! }
}
/** Rides as far as this turn allows along the way to a distant province. */
export function moveToward(game: GameState, to: Id): GameState {
  const route = partyPath(game, to)
  requireRule(route, 'Não há caminho conhecido até lá.')
  const reach = partyReach(game)
  const stop = [...route.path].reverse().find(id => reach.has(id))
  requireRule(stop, 'A comitiva já andou neste turno.')
  return moveParty(game, stop)
}
export function moveParty(game: GameState, to: Id): GameState {
  const cost = partyReach(game).get(to)
  requireRule(cost !== undefined, 'A comitiva não chega lá neste turno.')
  requireRule(!game.campaign.decisions.some(d => !d.resolved), 'Resolva a decisão pendente antes de partir.')
  const g = editGame(game), party = playerParty(g), p = prov(g, to)
  party.moves -= cost; party.provinceId = to
  const first = knowledge(g, to) < 2
  reveal(g, to, 'explorada', 'A comitiva de Irian'); sightNeighbors(g, to)
  // Arriving at a foreign court opens contact, as a visit in person does.
  const owner = p.occupyingHouseId ?? p.governingHouseId
  if (owner !== g.playerHouseId && !isVassal(g, owner) && lordLocation(g, owner) === to) meet(g, owner, to)
  const band = g.campaign.parties.find(x => x.kind === 'bandidos' && x.provinceId === to)
  const foe = g.campaign.parties.find(x => x.kind === 'lorde' && x.id !== PLAYER_PARTY && x.provinceId === to && hostile(g, x.houseId!))
  if (band) encounter(g, band, false)
  else if (foe) encounter(g, foe, false)
  else if (first) notify(g, `A comitiva chega a ${p.name}`, `${p.name} é terra de ${p.terrain}, da ${house(g, owner).name}.`, to)
  return g
}
function meet(g: GameState, houseId: Id, at: Id) {
  let contact = g.campaign.contacts.find(c => c.houseId === houseId)
  if (contact && contact.establishedDay !== null) return
  if (!contact) { contact = { houseId, provinceId: house(g, houseId).seatProvinceId, establishedDay: g.day, ...initialRelation(g, houseId, at), lastGiftDay: null, audienceUntil: g.day + 30, trade: false }; g.campaign.contacts.push(contact) }
  else contact.establishedDay = g.day
  contact.relation = clamp(contact.relation + 5)
  const ruler = rulerOf(g, houseId); ruler.relationship.trust = clamp(ruler.relationship.trust + 6); ruler.memory.push({ day: g.day, text: 'Recebeu Irian em pessoa.' })
  notify(g, `Encontro com ${ruler.name}`, `${ruler.name} ${house(g, houseId).name.replace('Casa ', '')} recebeu Irian. Agora vocês podem conversar e negociar.`, at, true)
}
/** Moves men between the retinue and the garrison of a province Irian rules. */
export function transferMen(game: GameState, delta: number): GameState {
  const party = playerParty(game), at = party.provinceId
  requireRule(controlled(game).some(p => p.id === at), 'Só é possível trocar homens numa província sua.')
  const garrison = game.campaign.garrisons[at] ?? 0
  if (delta > 0) { requireRule(garrison >= delta, `A guarnição tem só ${garrison} homens.`); requireRule(party.men + delta <= partyCap(game), `A comitiva comporta ${partyCap(game)} homens. Conquiste terras para liderar mais.`) }
  else requireRule(party.men + delta >= 10, 'Irian precisa de pelo menos 10 homens.')
  const g = editGame(game), p = playerParty(g)
  p.men += delta; g.campaign.garrisons[at] = garrison - delta
  return g
}

/* ---------- encounters and field battles ---------- */
/** Houses whose lords attack Irian on sight. */
export function hostile(g: GameState, houseId: Id) {
  if (houseId === g.playerHouseId || isVassal(g, houseId)) return false
  const liegeAtWar = g.campaign.politics.stage === 'guerra' && houseId === playerSeat(g).liegeHouseId
  const attacked = g.campaign.armies.some(a => a.houseId === g.playerHouseId && prov(g, a.targetProvinceId).governingHouseId === houseId)
  return liegeAtWar || attacked || relationWith(g, houseId) <= -40
}
function encounter(g: GameState, enemy: Party, ambush: boolean) {
  if (g.campaign.decisions.some(d => !d.resolved && d.kind === 'combate')) return
  g.campaign.decisions.push({ id: nextId(g, 'decision'), kind: 'combate', day: g.day, provinceId: enemy.provinceId, houseId: enemy.houseId, partyId: enemy.id, ambush, resolved: false })
}
/** Irian attacks a party standing in his province. Falling on a lord at peace is a crime others remember. */
export function attackParty(game: GameState, partyId: Id): GameState {
  const target = game.campaign.parties.find(p => p.id === partyId)
  requireRule(target && target.id !== PLAYER_PARTY, 'Não há ninguém para atacar.')
  requireRule(target.provinceId === playerParty(game).provinceId, 'A comitiva precisa estar na mesma província.')
  requireRule(!game.campaign.decisions.some(d => !d.resolved), 'Resolva a decisão pendente antes.')
  const g = editGame(game), t = g.campaign.parties.find(p => p.id === partyId)!
  if (t.kind === 'lorde' && !hostile(g, t.houseId!)) {
    const c = g.campaign.contacts.find(x => x.houseId === t.houseId); if (c) c.relation = clamp(c.relation - 30)
    pay(g, { renown: Math.min(playerHouse(g).prestige, BALANCE.military.unjustRenown / 2) })
    g.campaign.politics.liegeThreat = clamp(g.campaign.politics.liegeThreat + BALANCE.military.unjustThreat, 0, 100)
    notify(g, 'Ataque sem aviso', `Irian caiu sobre a escolta da ${house(g, t.houseId!).name} em tempo de paz. As casas vão lembrar disso.`, t.provinceId, true)
  }
  encounter(g, t, false)
  return g
}
export function fieldQuote(g: GameState, d: Decision) {
  const enemy = g.campaign.parties.find(x => x.id === d.partyId), p = prov(g, d.provinceId!)
  const cover = p.terrain === 'floresta' || p.terrain === 'colina' || p.terrain === 'montanha'
  return { enemy, mine: playerParty(g).men, cover, odds: enemy ? playerParty(g).men / Math.max(1, enemy.men) : 0 }
}
/** Deterministic field battle: numbers, tactic, ground and a hashed roll of ±12%. */
export function fieldBattle(seed: string, mine: number, theirs: number, tactic: FieldTactic, terrain: Province['terrain'], defending: boolean) {
  const t = F[tactic]
  const r = .88 + (hash(seed) % 1000) / 1000 * .24
  const ground = tactic === 'linha' && (terrain === 'colina' || terrain === 'montanha' || defending) ? 1.15 : 1
  const A = mine * t.power * ground * r, D = theirs
  const victory = A > D
  const mineLeft = victory ? Math.max(1, Math.round(mine * (1 - t.loss * Math.min(1, D / A)))) : Math.round(mine * (1 - Math.min(.8, t.loss * 1.8)))
  const theirsLeft = victory ? Math.round(theirs * .1) : Math.max(1, Math.round(theirs * (1 - .35 * Math.min(1, A / D))))
  const mid = (a: number, b: number) => Math.round((a + b) / 2)
  const phases: BattlePhase[] = [
    { label: 'As linhas se formam', attacker: mine, defender: theirs },
    { label: t.label, attacker: mid(mine, mineLeft), defender: mid(theirs, theirsLeft) },
    { label: victory ? 'O inimigo debanda' : 'Seus homens recuam', attacker: mineLeft, defender: theirsLeft },
  ]
  return { victory, mineLeft, theirsLeft, phases }
}
/** The player answers an encounter: fight with a tactic, or fall back. */
export function fight(g: GameState, d: Decision, choice: string) {
  const enemy = g.campaign.parties.find(x => x.id === d.partyId), party = playerParty(g), p = prov(g, d.provinceId!), h = playerHouse(g)
  d.choice = choice
  if (!enemy) return
  if (choice === 'recuar') {
    const lost = Math.ceil(party.men * F.retreatLoss); party.men -= lost; party.moves = 0
    party.provinceId = closestOwn(g, p.id)
    notify(g, 'Retirada', `A comitiva recuou para ${prov(g, party.provinceId).name}, deixando ${lost} homens para trás.`, party.provinceId)
    return
  }
  const tactic = choice as FieldTactic
  if (tactic === 'emboscada') pay(g, { renown: F.emboscada.renown })
  const r = fieldBattle(`${g.world.seed}:${enemy.id}:${g.day}:${tactic}`, party.men, enemy.men, tactic, p.terrain, Boolean(d.ambush))
  const bandit = enemy.kind === 'bandidos', foeHouse = enemy.houseId ? house(g, enemy.houseId) : null
  let summary = ''
  party.men = Math.max(1, r.mineLeft)
  if (r.victory) {
    party.moves = 0
    if (bandit) {
      const loot = enemy.men * B.lootPerMan, recruits = Math.min(Math.max(0, partyCap(g) - party.men), Math.round(enemy.men * .2))
      h.gold += loot; h.prestige += B.renown + Math.round(enemy.men / 20); party.men += recruits
      g.campaign.parties = g.campaign.parties.filter(x => x.id !== enemy.id)
      summary = `${enemy.name} foram destroçados em ${p.name}. Saque: ${loot} ouro.${recruits ? ` ${recruits} cativos libertados se juntam à comitiva.` : ''}`
      payQuests(g, enemy.id)
    } else {
      h.prestige += BALANCE.military.victoryRenown
      const captured = roll(g, `capture:${enemy.id}`) % 100 < PR.captureChance + Math.min(25, Math.round((party.men / Math.max(1, enemy.men) - 1) * 20))
      if (captured) capture(g, enemy)
      else { enemy.men = Math.max(5, r.theirsLeft); enemy.wounded = 3; enemy.goal = enemy.homeId; enemy.provinceId = enemy.homeId }
      summary = captured ? `A escolta da ${foeHouse!.name} caiu em ${p.name}, e ${rulerOf(g, foeHouse!.id).name} é seu prisioneiro.` : `A escolta da ${foeHouse!.name} foi batida em ${p.name}; ${rulerOf(g, foeHouse!.id).name} fugiu ferido.`
      const c = g.campaign.contacts.find(x => x.houseId === foeHouse!.id); if (c) c.relation = clamp(c.relation - 15)
    }
  } else {
    enemy.men = r.theirsLeft
    defeat(g)
    summary = `${bandit ? `${enemy.name} venceram` : `A escolta da ${foeHouse!.name} venceu`} em ${p.name}. Irian escapou com ${playerParty(g).men} homens e voltou para casa.`
  }
  g.campaign.battles.push({ id: nextId(g, 'battle'), day: g.day, provinceId: p.id, attackerHouseId: g.playerHouseId, defenderHouseId: foeHouse?.id ?? g.playerHouseId, tactic, bandit: bandit ? { side: 'defender', name: enemy.name } : undefined,
    attackerStart: r.phases[0].attacker, defenderStart: r.phases[0].defender, attackerLeft: r.mineLeft, defenderLeft: r.theirsLeft, wall: 0, victory: r.victory, phases: r.phases, summary })
  notify(g, r.victory ? 'Vitória em campo' : 'Derrota em campo', summary, p.id)
}
function defeat(g: GameState) {
  const party = playerParty(g), h = playerHouse(g)
  party.men = Math.max(8, Math.round(party.men * PT.defeatKeep)); party.provinceId = playerSeat(g).id; party.moves = 0
  h.prestige = Math.max(0, h.prestige - PT.defeatRenown)
}
const closestOwn = (g: GameState, from: Id) => {
  const own = new Set(controlled(g).map(p => p.id)), queue = [from], seen = new Set([from])
  for (let i = 0; i < queue.length; i++) { const id = queue[i]; if (own.has(id)) return id; for (const n of prov(g, id).neighbors) if (!seen.has(n)) { seen.add(n); queue.push(n) } }
  return playerSeat(g).id
}

/* ---------- prisoners ---------- */
function capture(g: GameState, enemy: Party) {
  const hid = enemy.houseId!, ruler = rulerOf(g, hid)
  g.campaign.parties = g.campaign.parties.filter(x => x.id !== enemy.id)
  g.campaign.prisoners.push({ characterId: ruler.id, houseId: hid, since: g.campaign.turn, askedTurn: g.campaign.turn })
  ruler.memory.push({ day: g.day, text: 'Foi capturado por Irian em batalha.' })
  record(g, `${ruler.name} da ${house(g, hid).name} foi capturado pela ${playerHouse(g).name}.`, [hid, g.playerHouseId])
  askPrisoner(g, hid)
}
/** The lord yields only if he already leans to you, or his house cannot stand against you. */
export function oathUnderDuress(g: GameState, houseId: Id) {
  const h = house(g, houseId)
  return h.rank === 'provincial' && ((g.campaign.influence[houseId] ?? 0) >= 25 || relationWith(g, houseId) >= 10)
}
function askPrisoner(g: GameState, houseId: Id) {
  const h = house(g, houseId), ruler = rulerOf(g, houseId), ransom = ransomOf(g, houseId)
  g.campaign.decisions.push({ id: nextId(g, 'decision'), kind: 'evento', day: g.day, provinceId: playerSeat(g).id, houseId, resolved: false, event: {
    key: 'prisioneiro', title: `${ruler.name} é seu prisioneiro`, text: `${ruler.role} ${ruler.name} da ${h.name} está acorrentado no Castelo da Ponte Alta. A casa dele espera notícias.`, data: { house: houseId },
    choices: [
      { id: 'juramento', label: 'Exigir juramento', detail: oathUnderDuress(g, houseId) ? 'Ele aceita: a casa jura lealdade e as terras dela passam a ser suas.' : 'Ele vai recusar: falta influência (25) ou relação (+10), ou a casa é grande demais. Ele continua preso.' },
      { id: 'resgate', label: `Pedir resgate de ${ransom} ouro`, detail: 'A casa paga e ele volta para casa. Relação −10.', cost: `+${ransom} ouro` },
      { id: 'libertar', label: 'Libertar com honra', detail: `Relação +${PR.freeRelation}, influência +${PR.freeInfluence}, renome +${PR.freeRenown}.` },
      { id: 'manter', label: 'Manter preso', detail: `Sem o lorde, a casa defende-se pior (−25%). Relação −${PR.keepRelation} por turno; o grão-lorde não gosta.` },
    ] } })
}
const ransomOf = (g: GameState, houseId: Id) => { const h = house(g, houseId); return Math.min(h.gold, PR.ransomBase + Math.round(h.gold * PR.ransomShare)) }
export function resolvePrisoner(g: GameState, d: Decision, choice: string): string {
  const hid = String(d.event!.data.house), h = house(g, hid), ruler = rulerOf(g, hid), me = playerHouse(g)
  const c = g.campaign.contacts.find(x => x.houseId === hid)
  const release = () => { g.campaign.prisoners = g.campaign.prisoners.filter(p => p.houseId !== hid); spawnLord(g, hid, true) }
  switch (choice) {
    case 'juramento':
      if (oathUnderDuress(g, hid)) { g.campaign.prisoners = g.campaign.prisoners.filter(p => p.houseId !== hid); makeVassal(g, hid, 'militar', 'firmes'); return `${ruler.name} jurou de joelhos. As terras da ${h.name} agora são suas.` }
      if (c) c.relation = clamp(c.relation - 10)
      return `${ruler.name} cospe no chão: "Prefiro apodrecer aqui." Ele continua preso.`
    case 'resgate': { const r = ransomOf(g, hid); h.gold -= r; me.gold += r; if (c) c.relation = clamp(c.relation - 10); release(); return `A ${h.name} pagou ${r} de ouro. ${ruler.name} voltou para casa.` }
    case 'libertar': if (c) c.relation = clamp(c.relation + PR.freeRelation); g.campaign.influence[hid] = clamp((g.campaign.influence[hid] ?? 0) + PR.freeInfluence, 0, 100); me.prestige += PR.freeRenown; release(); return `${ruler.name} parte livre e em dívida com você.`
    default: g.campaign.politics.liegeThreat = clamp(g.campaign.politics.liegeThreat + PR.keepThreat, 0, 100); return `${ruler.name} continua nas suas masmorras.`
  }
}

/* ---------- quests ---------- */
function payQuests(g: GameState, partyId: Id) {
  for (const q of g.campaign.quests) if (!q.done && q.partyId === partyId) {
    q.done = true
    const h = house(g, q.houseId), c = g.campaign.contacts.find(x => x.houseId === q.houseId)
    h.gold = Math.max(0, h.gold - q.gold); playerHouse(g).gold += q.gold
    if (c) c.relation = clamp(c.relation + q.relation)
    g.campaign.influence[q.houseId] = clamp((g.campaign.influence[q.houseId] ?? 0) + q.influence, 0, 100)
    notify(g, 'Recompensa', `A ${h.name} agradece: +${q.gold} ouro, relação +${q.relation}, influência +${q.influence}.`, h.seatProvinceId, true)
  }
}

/* ---------- the world's parties, once per turn ---------- */
export function initialParties(g: GameState): Party[] {
  const parties: Party[] = [{ id: PLAYER_PARTY, kind: 'lorde', houseId: g.playerHouseId, leaderId: `ruler-${g.playerHouseId}`, name: 'Comitiva de Irian', men: PT.start, provinceId: playerSeat(g).id, homeId: playerSeat(g).id, goal: null, moves: PT.moves, wounded: 0 }]
  const realm = playerHouse(g).realmId
  for (const h of g.world.houses) if (h.id !== g.playerHouseId && h.realmId === realm && !isVassal(g, h.id) && h.rank !== 'real' && g.world.provinces.find(p => p.id === h.seatProvinceId)!.governingHouseId === h.id)
    parties.push(lordPartyFor(g, h.id))
  return parties
}
const lordPartyFor = (g: GameState, houseId: Id): Party => { const h = house(g, houseId); return { id: `party-${houseId}`, kind: 'lorde', houseId, leaderId: `ruler-${houseId}`, name: `Escolta da ${h.name}`, men: Math.round(h.mobilizable * PT.npcShare) + PT.npcBase, provinceId: h.seatProvinceId, homeId: h.seatProvinceId, goal: null, moves: 1, wounded: 0 } }
function spawnLord(g: GameState, houseId: Id, wounded = false) {
  if (lordParty(g, houseId) || isVassal(g, houseId)) return
  const p = lordPartyFor(g, houseId); if (wounded) { p.wounded = 2; p.men = Math.round(p.men * .5) }
  g.campaign.parties.push(p)
}
/** Next step from `from` towards `to` over the land graph. */
function stepToward(g: GameState, from: Id, to: Id): Id {
  if (from === to) return from
  const prev = new Map<Id, Id>(), queue = [from], seen = new Set([from])
  for (let i = 0; i < queue.length; i++) {
    const id = queue[i]
    if (id === to) { let cur = id; while (prev.get(cur) !== from) cur = prev.get(cur)!; return cur }
    for (const n of prov(g, id).neighbors) if (!seen.has(n)) { seen.add(n); prev.set(n, id); queue.push(n) }
  }
  return from
}
const BAND_NAMES = ['Os Corvos do Vau', 'Os Homens de Sarn', 'Os Lobos da Charneca', 'Os Filhos da Lama', 'Os Ratos de Brenn', 'Os Sem-Bandeira', 'Os Cães de Ferro', 'Os Vultos da Névoa']
function spawnBands(g: GameState) {
  const realm = playerHouse(g).realmId, bands = g.campaign.parties.filter(p => p.kind === 'bandidos')
  const max = Math.min(B.maxBands, B.maxBase + Math.floor(g.campaign.turn / B.perTurns))
  // Outlaws gather every other turn or so, not every week.
  if (bands.length >= max || roll(g, 'gather') % 2 === 1) return
  // Outlaws gather near the player's lands, in rough country and restless provinces.
  const near = new Set(controlled(g).flatMap(p => [p.id, ...p.neighbors]).flatMap(id => [id, ...prov(g, id).neighbors]))
  const options = g.world.provinces.filter(p => near.has(p.id) && p.realmId === realm && p.id !== playerSeat(g).id && !g.campaign.parties.some(x => x.provinceId === p.id))
    .sort((a, b) => (b.terrain === 'floresta' || b.terrain === 'colina' ? 1 : 0) - (a.terrain === 'floresta' || a.terrain === 'colina' ? 1 : 0) || a.loyalty - b.loyalty)
  if (!options.length) return
  const at = options[roll(g, 'band') % Math.min(5, options.length)]
  const name = BAND_NAMES.find(n => !bands.some(b => b.name === n)) ?? 'Salteadores'
  g.campaign.parties.push({ id: nextId(g, 'band'), kind: 'bandidos', houseId: null, leaderId: null, name, men: B.startMen + Math.min(30, g.campaign.turn * 2), provinceId: at.id, homeId: at.id, goal: null, moves: 1, wounded: 0 })
  if (knowledge(g, at.id) >= 1) notify(g, 'Salteadores', `${name} apareceram em ${knowledge(g, at.id) >= 2 ? at.name : 'terras avistadas'}.`, at.id)
}
function moveBands(g: GameState) {
  const me = playerParty(g)
  for (const b of g.campaign.parties.filter(p => p.kind === 'bandidos')) {
    const here = prov(g, b.provinceId)
    // Bands run from a stronger retinue and look for rich, badly guarded land.
    const threat = (id: Id) => (me.provinceId === id && me.men > b.men * B.flee ? 1 : 0)
    const value = (p: Province) => p.population / (1 + (controlled(g).some(c => c.id === p.id) ? g.campaign.garrisons[p.id] ?? 0 : 40)) - threat(p.id) * 1e6 - (g.campaign.parties.some(x => x.id !== b.id && x.provinceId === p.id) ? 1e5 : 0)
    const best = [here, ...here.neighbors.map(n => prov(g, n))].filter(p => p.landmass === here.landmass).sort((x, y) => value(y) - value(x))[0]
    if (best.id !== here.id && (threat(here.id) || roll(g, `wander:${b.id}`) % 3 === 0 || value(best) > value(here) * 1.4)) b.provinceId = best.id
    b.men = Math.min(B.cap, b.men + B.growth)
  }
}
function raid(g: GameState) {
  const mine = new Set(controlled(g).map(p => p.id))
  for (const b of g.campaign.parties.filter(p => p.kind === 'bandidos')) {
    const p = prov(g, b.provinceId)
    if (mine.has(p.id)) {
      const garrison = g.campaign.garrisons[p.id] ?? 0
      if (garrison >= b.men * B.garrisonGuard) {
        const lost = Math.min(garrison, Math.round(b.men * .3)); g.campaign.garrisons[p.id] = garrison - lost
        g.campaign.parties = g.campaign.parties.filter(x => x.id !== b.id)
        notify(g, 'A guarnição venceu', `A guarnição de ${p.name} destroçou ${b.name} (perdeu ${lost} homens).`, p.id); continue
      }
      const gold = Math.min(playerHouse(g).gold, B.raidGold + Math.round(b.men / 2))
      playerHouse(g).gold -= gold; p.loyalty = clamp(p.loyalty - B.raidLoyalty, 0, 100)
      notify(g, `${b.name} saqueiam ${p.name}`, `Levaram ${gold} de ouro e a lealdade caiu ${B.raidLoyalty}. A guarnição (${garrison}) é fraca demais: vá caçá-los com a comitiva ou reforce a província.`, p.id, true)
    } else if (p.governingHouseId !== g.playerHouseId) {
      const owner = house(g, p.occupyingHouseId ?? p.governingHouseId); owner.gold = Math.max(0, owner.gold - 15)
      const known = g.campaign.contacts.some(c => c.houseId === owner.id && c.establishedDay !== null)
      if (known && !isVassal(g, owner.id) && relationWith(g, owner.id) > -20 && !g.campaign.quests.some(q => !q.done && (q.partyId === b.id || q.houseId === owner.id))) {
        g.campaign.quests.push({ id: nextId(g, 'quest'), houseId: owner.id, partyId: b.id, gold: B.rewardGold, influence: B.rewardInfluence, relation: B.rewardRelation, turn: g.campaign.turn, done: false })
        notify(g, `A ${owner.name} pede ajuda`, `${b.name} saqueiam ${knowledge(g, p.id) >= 2 ? p.name : 'as terras deles'}. Quem destruir o bando ganha ${B.rewardGold} ouro, relação +${B.rewardRelation} e influência +${B.rewardInfluence}.`, p.id, true)
      }
    }
  }
  g.campaign.quests = g.campaign.quests.filter(q => q.done ? g.campaign.turn - q.turn < 6 : g.campaign.parties.some(x => x.id === q.partyId))
}
/** Lords ride: to war, after outlaws in their land, to their liege's court, or home. */
function moveLords(g: GameState) {
  for (const h of g.world.houses) if (!lordParty(g, h.id) && !isCaptive(g, h.id) && h.id !== g.playerHouseId && h.realmId === playerHouse(g).realmId && h.rank !== 'real' && !isVassal(g, h.id) && prov(g, h.seatProvinceId).governingHouseId === h.id && roll(g, `ride:${h.id}`) % 4 === 0) spawnLord(g, h.id)
  for (const lord of g.campaign.parties.filter(p => p.kind === 'lorde' && p.id !== PLAYER_PARTY)) {
    const hid = lord.houseId!
    if (isVassal(g, hid)) { lord.men = 0; continue }
    if (lord.wounded > 0) { lord.wounded--; lord.goal = lord.homeId }
    else {
      const war = g.campaign.wars.find(w => w.active && w.attackerId === hid)
      const army = war && g.campaign.armies.find(a => a.houseId === hid)
      const lands = new Set(g.world.provinces.filter(p => p.governingHouseId === hid).map(p => p.id))
      const band = g.campaign.parties.find(b => b.kind === 'bandidos' && lands.has(b.provinceId) && b.men < lord.men)
      const liegeSeat = house(g, prov(g, lord.homeId).liegeHouseId).seatProvinceId
      const n = roll(g, `goal:${hid}`) % 10
      lord.goal = army ? army.targetProvinceId : band ? band.provinceId : lord.goal && lord.goal !== lord.provinceId ? lord.goal : n < 3 && liegeSeat !== lord.homeId ? liegeSeat : n < 5 ? [...lands][n % Math.max(1, lands.size)] ?? lord.homeId : lord.homeId
    }
    lord.provinceId = stepToward(g, lord.provinceId, lord.goal ?? lord.homeId)
    // Lords hunt outlaws in their path.
    const band = g.campaign.parties.find(b => b.kind === 'bandidos' && b.provinceId === lord.provinceId)
    if (band) {
      if (lord.men >= band.men) { lord.men = Math.max(10, lord.men - Math.round(band.men * .3)); g.campaign.parties = g.campaign.parties.filter(x => x.id !== band.id); g.campaign.quests = g.campaign.quests.filter(q => q.partyId !== band.id); if (knowledge(g, lord.provinceId) >= 2) notify(g, 'Bando destruído', `${rulerOf(g, hid).name} da ${house(g, hid).name} destruiu ${band.name} em ${prov(g, lord.provinceId).name}.`, lord.provinceId) }
      else { lord.wounded = 2; lord.men = Math.round(lord.men * .6) }
    }
    // Home again and nothing to do: the lord stays in his hall (and leaves the map).
    if (lord.provinceId === lord.homeId && lord.goal === lord.homeId && !lord.wounded && roll(g, `rest:${hid}`) % 2 === 0) g.campaign.parties = g.campaign.parties.filter(x => x.id !== lord.id)
  }
  g.campaign.parties = g.campaign.parties.filter(p => p.men > 0)
}
/** Captive lords weigh on their houses and on your name. */
function keepPrisoners(g: GameState) {
  for (const pr of g.campaign.prisoners) {
    const c = g.campaign.contacts.find(x => x.houseId === pr.houseId); if (c) c.relation = clamp(c.relation - PR.keepRelation)
    if (g.campaign.turn - pr.askedTurn >= 4 && !g.campaign.decisions.some(d => !d.resolved && d.event?.key === 'prisioneiro')) { pr.askedTurn = g.campaign.turn; askPrisoner(g, pr.houseId) }
  }
}
/** Once per turn, after the week has passed. */
export function processParties(g: GameState) {
  moveLords(g); moveBands(g); spawnBands(g); raid(g); keepPrisoners(g)
  const me = playerParty(g)
  // A hostile lord or a band that ends the turn on Irian's province attacks first.
  const foe = g.campaign.parties.find(x => x.id !== PLAYER_PARTY && x.provinceId === me.provinceId && (x.kind === 'bandidos' ? x.men > me.men : hostile(g, x.houseId!) && x.men > me.men * .8))
  if (foe) { encounter(g, foe, true); notify(g, 'Emboscada', `${foe.kind === 'bandidos' ? foe.name : `A escolta da ${house(g, foe.houseId!).name}`} cercou a comitiva de Irian em ${prov(g, me.provinceId).name}.`, me.provinceId, true) }
}
