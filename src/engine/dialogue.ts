import type { GameState, House, Id } from './types'
import type { Character, DialogueTopic } from './mvpTypes'
import { BALANCE } from './balance'
import { editGame, requireRule, nextId, clamp, playerHouse, isVassal } from './stateUtils'
import { canConverse, characterName } from './characters'
import { knowledge, reveal, sightNeighbors } from './knowledge'
import { notify } from './notifications'
import { hash } from './random'
import { menUnderArms } from './economy'
import { defenders } from './military'
import { offersFor, threatTo } from './negotiation'
import { debtOf } from './influence'
import { presentWith } from './party'

/** What Irian can say. The label is the player's own line in the conversation. */
export const TOPICS: Record<DialogueTopic, string> = {
  greet: 'Cumprimentar', house: 'Sobre a casa dele', region: 'Sobre as terras', politics: 'Sobre o suserano',
  needs: 'Do que precisam', rumors: 'Que notícias correm', compliment: 'Elogiar', favor: 'Pedir um favor', threaten: 'Intimidar',
}
/** The line Irian speaks for each topic, adapted to whom he addresses. */
export function playerLine(g: GameState, c: Character, topic: DialogueTopic) {
  const house = g.world.houses.find(h => h.id === c.houseId)!, liege = g.world.houses.find(h => h.id === g.world.provinces.find(p => p.id === c.provinceId)!.liegeHouseId)
  const own = c.houseId === g.playerHouseId
  switch (topic) {
    case 'greet': return own ? `Como está, ${c.name}?` : `Saudações, ${c.name}. Venho em paz.`
    case 'house': return own ? 'O que dizem de nós lá fora?' : `Conte-me sobre a ${house.name}.`
    case 'region': return own ? 'Como estão as nossas terras?' : 'Como vão as suas terras?'
    case 'politics': return own ? `O que acha da ${liege?.name ?? 'coroa'}?` : liege && liege.id !== c.houseId ? `O que pensa da ${liege.name}?` : 'O que pensa do reino?'
    case 'needs': return own ? 'Do que precisamos agora?' : 'Do que sua casa precisa?'
    case 'rumors': return 'Que notícias correm pelas estradas?'
    case 'compliment': return own ? 'Você tem sido essencial para esta casa.' : `Sua casa honra ${house.name.replace('Casa ', '')}, ${c.name}.`
    case 'favor': return 'Posso contar com uma palavra sua no conselho?'
    case 'threaten': return 'Lembre-se de quem tem mais lanças neste vale.'
  }
}
/** Topics a character can be asked about: the court talks business, foreign lords can be threatened. */
export function topicsFor(g: GameState, c: Character): DialogueTopic[] {
  const own = c.houseId === g.playerHouseId
  return own ? ['greet', 'house', 'region', 'politics', 'needs', 'rumors', 'compliment'] : ['greet', 'house', 'region', 'politics', 'needs', 'rumors', 'compliment', 'favor', 'threaten']
}
export function dialogueWait(g: GameState, id: Id, topic: DialogueTopic) {
  const last = g.campaign.conversations.filter(c => c.characterId === id && c.topic === topic).at(-1)
  return last ? Math.max(0, last.day + (topic === 'favor' || topic === 'threaten' ? BALANCE.dialogue.favorCooldown : BALANCE.dialogue.cooldown) - g.day) : 0
}

type Tone = 'frio' | 'neutro' | 'caloroso'
const pick = <T,>(list: T[], seed: string) => list[hash(seed) % list.length]
/** How a character feels about Irian right now. */
function toneOf(g: GameState, c: Character): Tone {
  const relation = g.campaign.contacts.find(d => d.houseId === c.houseId)?.relation ?? 0
  const score = relation / 2 + c.relationship.trust + c.relationship.friendship + (c.houseId === g.playerHouseId ? 20 : 0)
  return score >= 18 ? 'caloroso' : score <= -6 ? 'frio' : 'neutro'
}
/** Openings by temperament and mood: the first thing that tells lords apart. */
const OPEN: Record<string, Record<Tone, string[]>> = {
  acolhedor: { caloroso: ['Irian! Sente-se, mandem vir pão quente.', 'Que bom ver você outra vez.'], neutro: ['Seja bem-vindo à nossa mesa.', 'Entre, a estrada foi longa.'], frio: ['Ainda o recebo, Serraval, por educação.', 'Sente-se. Mas não espere festa.'] },
  desconfiado: { caloroso: ['Começo a acreditar em você. Começo.', 'Você cumpriu o que disse. Isso eu noto.'], neutro: ['Fale. Estou ouvindo, e anotando.', 'O que quer, exatamente?'], frio: ['Cada palavra sua tem um preço escondido.', 'Seja breve. Meus guardas estão inquietos.'] },
  ambicioso: { caloroso: ['Juntos, podemos ir longe. Muito longe.', 'Ah, o homem que faz o feudo falar.'], neutro: ['Tempo é poder. Não desperdice o meu.', 'Diga o que ganho com essa visita.'], frio: ['Você cresce depressa demais para o meu gosto.', 'Você está no meu caminho, Serraval.'] },
  pragmático: { caloroso: ['Bons negócios fazem bons vizinhos.', 'Vamos direto ao que importa, amigo.'], neutro: ['Vamos ao ponto.', 'Fale de números e eu escuto.'], frio: ['Não temos nada a tratar que valha meu tempo.', 'Promessas não enchem celeiros.'] },
  orgulhoso: { caloroso: ['Você sabe tratar com sangue antigo. Raro.', 'Irian. Você aprendeu a se curvar com elegância.'], neutro: ['Você fala com uma casa que já era velha quando Serraval nasceu.', 'Pois bem. Fale com respeito.'], frio: ['Um lorde de barqueiros na minha sala. Que tempos.', 'Não me lembro de ter chamado você.'] },
  generoso: { caloroso: ['Para você, a porta está sempre aberta.', 'Amigo! Tudo o que temos é seu para ver.'], neutro: ['Seja bem-vindo. Há lugar para mais um.', 'Fique, coma conosco.'], frio: ['Até a generosidade tem limites, Irian.', 'Recebo você, mas meu povo não esquece.'] },
}
/** Flavour by interest: what each lord brings up on his own. */
const INTEREST: Record<string, string[]> = {
  zeloso: ['Os santos observam cada juramento.', 'Rezo para que suas intenções sejam limpas.'],
  mercantil: ['Tudo tem preço, até a lealdade.', 'O sal subiu de novo; alguém está lucrando.'],
  tradicional: ['Os juramentos antigos ainda valem nesta sala.', 'Meu avô fazia diferente, e fazia melhor.'],
  erudito: ['Os arquivos guardam o que os homens esquecem.', 'Li sobre uma guerra assim, há dois séculos.'],
  belicoso: ['Lanças decidem o que a tinta não resolve.', 'Meus homens estão ficando moles sem uma boa luta.'],
}
/** Each people speaks with its own images (docs/RACES.md). */
const RACE: Record<string, string[]> = {
  humano: ['', ''],
  'náveo': ['Os antigos da nave diziam: as estrelas não esperam ninguém.', 'Meu povo veio de longe; aprendemos a ler quem chega.'],
  'vitrânio': ['Já vi três gerações cometerem esse erro.', 'Para mim, sua casa ainda é uma promessa jovem.'],
  'salmário': ['A maré sobe para todos, Irian; afunda quem não nada.', 'Nas duas águas, quem hesita se afoga.'],
  'duário': ['', ''],
  aureno: ['Sinto o vento mudar antes de todos.', 'O ar deste vale anda pesado.'],
}

/** Something true about the world a character can tell: wars, weak walls, debts, the liege's mood. */
function rumor(g: GameState, c: Character): { text: string; reveal?: Id } {
  const known = g.world.houses.filter(h => h.id !== g.playerHouseId && h.id !== c.houseId && h.rank !== 'real')
  const near = known.filter(h => { const s = g.world.provinces.find(p => p.id === h.seatProvinceId)!; return s.fiefId === g.world.provinces.find(p => p.id === c.provinceId)!.fiefId })
  const options: { text: string; reveal?: Id }[] = []
  const war = g.campaign.wars.find(w => w.active)
  if (war) { const a = g.world.houses.find(h => h.id === war.attackerId)!, d = g.world.houses.find(h => h.id === war.defenderId)!; options.push({ text: `A ${a.name} está em guerra com a ${d.name}. Quem marcha deixa a casa mal guardada.`, reveal: a.seatProvinceId }) }
  const weak = near.map(h => ({ h, d: defenders(g, g.world.provinces.find(p => p.id === h.seatProvinceId)!) })).sort((a, b) => a.d - b.d)[0]
  if (weak) options.push({ text: `A ${weak.h.name} mal tem ${Math.round(weak.d / 50) * 50} homens nas muralhas.`, reveal: weak.h.seatProvinceId })
  const indebted = near.map(h => ({ h, debt: debtOf(g, h.id) })).find(x => x.debt)
  if (indebted) options.push({ text: `A ${indebted.h.name} deve ${indebted.debt!.amount} de ouro à ${indebted.debt!.creditor}. Quem comprar essa dívida manda nela.` })
  const pol = g.campaign.politics
  options.push({ text: pol.liegeThreat >= 60 ? 'No salão do grão-lorde, seu nome já é dito como o de um inimigo.' : pol.liegeThreat >= 30 ? 'O grão-lorde pergunta muito sobre você. Não é bom sinal.' : 'O grão-lorde ainda vê você como um vassalo útil.' })
  return options[hash(`${c.id}:${g.day}:rumor`) % options.length]
}
function needs(g: GameState, house: House) {
  if (house.id === g.playerHouseId) {
    const h = playerHouse(g)
    return h.stock.food < 400 ? 'Grãos, senhor. Os celeiros estão baixos.' : h.stock.salt < 40 ? 'Sal antes do inverno, ou perderemos a colheita.' : h.gold < 200 ? 'Ouro. Os homens precisam ser pagos.' : 'Mais terras, se quer minha opinião sincera.'
  }
  const threat = threatTo(g, house.id)
  const best = offersFor(g, house.id).filter(o => o.available && o.value >= 15).sort((a, b) => b.value - a.value).slice(0, 2)
  return `${threat ? `Não vou mentir: nossa casa ${threat}.` : 'Nada nos falta que você possa dar.'}${best.length ? ` Se um dia negociarmos, ${best.map(o => o.label.toLowerCase()).join(' e ')} pesariam muito.` : ''}`
}

export function converse(game: GameState, id: Id, topic: DialogueTopic) {
  const original = game.campaign.characters.find(c => c.id === id)
  requireRule(original && canConverse(game, original), 'Estabeleça contato antes de conversar com este personagem.')
  requireRule(TOPICS[topic], 'Conversa inválida.')
  requireRule(topicsFor(game, original).includes(topic), 'Esse assunto não cabe aqui.')
  requireRule(dialogueWait(game, id, topic) === 0, 'Aguarde antes de repetir este assunto.')
  requireRule(original.houseId === game.playerHouseId || presentWith(game, original.houseId), 'Para conversar, leve a comitiva de Irian até onde esse lorde está.')
  const g = editGame(game), c = g.campaign.characters.find(c => c.id === id)!
  const p = g.world.provinces.find(p => p.id === c.provinceId)!, h = g.world.houses.find(h => h.id === c.houseId)!
  const contact = g.campaign.contacts.find(d => d.houseId === c.houseId)
  const tone = toneOf(g, c), temper = c.traits[0], interest = c.traits[1] ?? 'tradicional'
  const cold = temper === 'desconfiado' || (contact?.relation ?? 0) < 0
  const seed = `${c.id}:${g.day}:${topic}`
  const line = playerLine(g, c, topic)
  const opening = pick(OPEN[temper]?.[tone] ?? OPEN.pragmático[tone], seed)
  const flavor = hash(seed + 'f') % 3 === 0 ? ' ' + pick(INTEREST[interest] ?? INTEREST.tradicional, seed + 'i') : ''
  const race = pick(RACE[c.race] ?? [''], seed + 'r')
  const rel = (k: 'trust' | 'respect' | 'friendship', n: number) => { c.relationship[k] = clamp(c.relationship[k] + n) }
  const memory = c.memory.at(-1)
  let body = '', consequence = ''
  switch (topic) {
    case 'greet': {
      const conquered = g.campaign.vassals.filter(v => g.day - v.since < 120).map(v => g.world.houses.find(x => x.id === v.houseId)!.name)
      body = memory ? `Lembro-me da nossa última conversa, ${g.day - memory.day > 1 ? `há ${g.day - memory.day} dias` : 'ainda ontem'}.` : `Sou ${characterName(g, c)}, ${c.role.toLowerCase()}.`
      if (conquered.length && c.houseId !== g.playerHouseId) body += ` Soube da ${conquered[0]}. ${temper === 'ambicioso' || temper === 'belicoso' ? 'Admiro quem age.' : 'O feudo inteiro está de olho em você.'}`
      const n = cold ? 1 : 3; rel('friendship', n); consequence = `Amizade +${n}.`; break
    }
    case 'house': {
      const seat = g.world.provinces.find(x => x.id === h.seatProvinceId)!
      body = h.id === g.playerHouseId ? `Dizem que a ${h.name} ${g.campaign.vassals.length ? `já tem ${g.campaign.vassals.length} casa(s) jurada(s), e isso assusta os velhos lordes` : 'é pequena, mas tem rio e ponte, e isso vale ouro'}.` : `Nossa sede é ${seat.name}. Nosso lema: “${h.motto}”. ${h.memory.at(-1) ?? ''}`
      reveal(g, h.seatProvinceId, 'explorada', 'Conversa com a casa'); sightNeighbors(g, h.seatProvinceId); rel('trust', 2); consequence = 'Sede revelada; confiança +2.'; break
    }
    case 'region': {
      const towns = g.world.settlements.filter(s => s.provinceId === p.id).slice(0, 2).map(s => s.name).join(' e ')
      body = `${p.name} é terra de ${p.terrain}; vivemos de ${p.resources.join(' e ')}. ${towns} sustentam a gente daqui.${p.loyalty < 50 ? ' O povo anda inquieto.' : ''}`
      reveal(g, p.id, 'investigada', `Conversa com ${c.name}`); sightNeighbors(g, p.id); consequence = 'Terras investigadas, fronteiras avistadas.'; break
    }
    case 'politics': {
      const liege = g.world.houses.find(x => x.id === p.liegeHouseId)!
      const view = temper === 'ambicioso' ? `A ${liege.name} envelhece no trono. Alguém vai ocupar o lugar.` : temper === 'orgulhoso' || temper === 'tradicional' ? `Juramos à ${liege.name} e juramento não se quebra.` : cold ? 'Não falo do meu suserano com estranhos.' : `A ${liege.name} mantém a paz, e paz é boa para o comércio.`
      body = c.houseId === g.playerHouseId ? `O grão-lorde ${g.campaign.politics.liegeThreat >= 40 ? 'desconfia de nós. Cuidado com cada passo.' : 'ainda confia em nós. Use isso enquanto dura.'}` : view
      rel('respect', 2); playerHouse(g).influence += 1; consequence = 'Respeito +2.'; break
    }
    case 'needs': body = needs(g, h); rel('trust', 1); consequence = 'Você sabe o que pesaria numa negociação. Confiança +1.'; break
    case 'rumors': {
      const r = rumor(g, c); body = r.text
      if (r.reveal && knowledge(g, r.reveal) < 2) reveal(g, r.reveal, 'explorada', `Notícia de ${c.name}`)
      consequence = r.reveal ? 'Informação nova no mapa.' : 'Informação nova.'; break
    }
    case 'compliment': {
      const n = temper === 'orgulhoso' ? 6 : cold ? 1 : 5
      body = temper === 'orgulhoso' ? 'Finalmente alguém reconhece o que é óbvio.' : cold ? 'Bela retórica. Prefiro julgar seus atos.' : temper === 'ambicioso' ? 'Seu reconhecimento chegará longe, se vier acompanhado de ações.' : 'Recebo suas palavras com gratidão.'
      rel('friendship', n); if (!cold) rel('trust', 2); consequence = `Amizade +${n}${cold ? '' : '; confiança +2'}.`; break
    }
    case 'favor': {
      const yes = c.relationship.trust + c.relationship.friendship + (contact?.relation ?? 10) >= 25
      body = yes ? 'Falarei a seu favor no conselho. Honre essa confiança.' : 'Ainda não nos conhecemos o suficiente para isso.'
      if (yes) { g.campaign.influence[h.id] = clamp((g.campaign.influence[h.id] ?? 0) + 4, 0, 100); rel('respect', 2) } else rel('trust', -1)
      consequence = yes ? 'Favor aceito: influência +4, respeito +2.' : 'Pedido recusado: confiança −1.'; break
    }
    case 'threaten': {
      const theirs = defenders(g, g.world.provinces.find(x => x.id === h.seatProvinceId)!), mine = menUnderArms(g)
      const works = mine >= theirs * 1.2 && !isVassal(g, h.id)
      body = works ? (temper === 'orgulhoso' || temper === 'belicoso' ? 'Você ousa... (ele cala, mas os olhos dizem que entendeu).' : 'Entendi o recado. Não há necessidade de chegar a tanto.') : `Com ${mine} homens? Volte quando tiver um exército de verdade.`
      if (works) { rel('respect', 6); rel('friendship', -6); g.campaign.influence[h.id] = clamp((g.campaign.influence[h.id] ?? 0) + 4, 0, 100); consequence = 'Respeito +6, amizade −6, influência +4.' }
      else { rel('respect', -4); if (contact) contact.relation = clamp(contact.relation - 5); consequence = 'Ameaça vazia: respeito −4, relação −5.' }
      break
    }
  }
  if (contact && contact.audienceUntil >= g.day) { rel('respect', 1); consequence += ' Audiência formal: respeito +1.' }
  let response = `${opening} ${body}${flavor}${race ? ' ' + race : ''}`.replace(/\s+/g, ' ').trim()
  // A Duário answers with two minds: the second consciousness reacts on its own terms.
  if (c.second) {
    const wary = c.second.traits.includes('desconfiado') || c.second.relationship.trust < 0
    const d = topic === 'compliment' || topic === 'greet' ? (wary ? 0 : 2) : topic === 'politics' || topic === 'house' || topic === 'needs' ? 2 : 1
    c.second.relationship.trust = clamp(c.second.relationship.trust + (wary ? 0 : 1)); c.second.relationship.friendship = clamp(c.second.relationship.friendship + d)
    response += wary ? ` — Então o olhar muda: é ${c.second.name} quem fala agora. “${pick(['Palavras gentis não pagam dívidas, Serraval.', 'Eu não concordei com nada disso.', 'Ele acredita em você. Eu, não.'], seed + 's')}”` : ` — ${c.second.name}, a outra consciência, assente em silêncio.`
    consequence += ` ${c.second.name}: amizade +${d}.`
  }
  c.memory.push({ day: g.day, text: `${TOPICS[topic]}: ${consequence}` }); c.memory = c.memory.slice(-30)
  g.campaign.conversations.push({ id: nextId(g, 'conversation'), characterId: id, day: g.day, topic, prompt: line, response, consequence })
  notify(g, `Conversa com ${c.name}`, consequence, p.id)
  return g
}
