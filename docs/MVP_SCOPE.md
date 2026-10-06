# ESCOPO DO MVP ATUAL

Este documento descreve **apenas o que está implementado e jogável agora**. A **VISÃO FINAL DO JOGO** continua em `docs/GDD.md` e nos documentos temáticos; as raças estão em `docs/RACES.md`. Nada da visão foi descartado, apenas adiado.

> Um mundo vivo. Três caminhos para conquistar. Uma interface simples.

## A tela

- Uma única tela: o mapa de Varedor em tela cheia, com zoom (roda, pinça, botões) e arraste. A câmera só se move por comando do jogador ou ao tocar numa notificação.
- **Topo**: brasão e nome da casa (abre o menu), ambição (lorde → grão-lorde → rei → unificação) com o apoio atual, botão **Casas**, ouro, **renome**, os seis recursos (em vermelho quando zerados), data e velocidade.
- **Base**: linha do tempo com o que está chegando nos próximos 36 dias (batedores, emissários, respostas, exércitos, assaltos, balanço, tributo, inverno) e as **quatro visões**.
- **Carta**: ao tocar uma província aparece uma carta de pergaminho à direita com a casa em destaque (brasão, nome, lema, lorde, raça, idade, traços, relação, personalidade) e o lorde de corpo inteiro ao lado. O conteúdo muda com a visão e com quem governa a província.
- **Lordes no mapa**: cada casa conhecida tem seu lorde de corpo inteiro de pé sobre a sede. Tocar o lorde abre a carta da casa; o selecionado cresce e brilha. 60 figuras provisórias em `public/assets/lords` (cada uma usada por um único personagem; quem não tem figura aparece pelo brasão).

## As quatro visões

| Visão | O mapa inteiro mostra | Na sua província | Numa província estrangeira |
|---|---|---|---|
| Território | Cores das casas sobre o relevo; névoa | População, lealdade, saldo mensal, produção, obras, corte | Casa, produz/falta, **caminhos para tomar**, emissário, conversa |
| Diplomacia | Recursos produzidos, rotas reais (comércio, tributo, compras), o que falta; filtro por recurso | O que falta e quem vende, pactos ativos | Razões da relação, comércio → aliança → vassalagem, presente, compra de recursos |
| Militar | Guarnições e defensores estimados, forças do feudo, exércitos em marcha | Recrutar, muralhas, deslocar tropas (estilo War) | Defensores, muralha, dias de marcha e cerco, justificativa, marchar |
| Influência | Sua influência em cada casa, laços (◆), apoio para grão-lorde | Contratar agentes | Banquete, patrocínio, casamento, dívida, segredo, juramento |

## Mapa realista

- O relevo nasce da costa oficial (campo de distância assinado), ruído, três cordilheiras e umidade (`terrain.ts`). Uma malha de ~8.300 células (`mesh.ts`) calcula drenagem e rios.
- As 252 províncias crescem sobre a malha a partir de sementes mais densas em planícies férteis e esparsas em montanhas; atravessar serras e rios custa caro, então as fronteiras param neles. Tamanhos vão de ~100 a ~5.800 unidades de área; litorais formam faixas e o nome segue o eixo da província.
- Ilhas com tamanho suficiente são províncias próprias, ligadas ao continente por vínculo administrativo marítimo.
- Desconhecida: hachura cinza sobre o relevo. Avistada: véu leve. Conhecida: cores da casa. O seu feudo começa conhecido; as fronteiras dele, avistadas.
- Terras suas e de vassalos usam a cor da sua casa; a fronteira entre elas quase desaparece; vassalos têm listras finas.

## Recursos e economia

Seis recursos: **grãos, madeira, pedra, ferro, sal, prata**; ouro é moeda e **renome** é a moeda política (recrutar, casar, ousar e atacar sem motivo custam renome). Cada província produz um ou dois recursos conforme o terreno. A produção mensal sai de uma fórmula única e é guardada nos assentamentos, de onde a economia lê.

| Item | Valor |
|---|---|
| Pontevela | +120 ouro, −40 administração, +240 grãos, −150 consumo, +45 madeira, +15 ferro; não produz pedra, sal nem prata |
| Estoque inicial | 700 ouro, 32 renome, 1.240 grãos, 420 madeira, 0 pedra, 180 ferro, 35 sal, 20 prata |
| Manutenção do exército | 1 ouro por 10 homens acima de 325; exércitos em marcha comem 1 grão por 10 homens por dia |
| Inverno | No 1º dia do inverno, sal para salgar os celeiros (pop/200); sem sal, 15% dos grãos estragam |
| Compra | lotes de 50; preço base grãos 1, madeira 1,5, pedra 2,5, ferro 3, sal 2, prata 6 (+20% se relação < 10); casas com relação < −10 recusam |
| Vassalos | pagam 15% (termos generosos) ou 30% (firmes) da produção; +1 renome/mês por vassalo |

## Exploração

- **Batedores**: 60 ouro e 80 grãos; 10 dias + 2 por etapa de rota + terreno; até 2 simultâneas; achados lidos dos dados reais.
- **Viagem pessoal de Irian**: 60% do tempo, 20 ouro, risco de emboscada (9% a 26% pelo terreno, +10% fora do reino); ao chegar, revela tudo, estabelece contato e dá +10 de confiança; emboscada custa 40 ouro, 3 de renome e 3 dias. Enquanto Irian viaja, Pontevela perde 1 de lealdade a cada 10 dias.

## Conquista em etapas (`plans.ts`)

Cada província estrangeira mostra os três caminhos e o nível em cada um.

- **Militar**: justificativa (reivindicação por espião em 30 dias, ou ofensa real — Ardesh) → exército (homens recomendados, caminho conhecido) → marcha visível e cerco (4 + 4×muralha dias) → **assalto com escolha de tática** (assalto direto; ao amanhecer +14% por 4 de renome; cercar e esfomear +8 dias, −32% dos defensores) → **batalha animada** → rendição com escolha de termos. Atacar sem justificativa custa 25 de renome, +15 de ameaça e piora todas as relações. Uma sede vencida vira vassala; terras do grão-lorde ficam **ocupadas** (a posse legal não muda).
- **Diplomacia**: contato → pacto comercial → aliança → tratado de vassalagem. Cada etapa é uma **negociação com balança**: o jogador escolhe ofertas (ouro, prata, comércio, proteção, casamento, perdão de dívida) e a casa pesa relação, influência, temperamento e o que teme. A proposta viaja com o emissário; a resposta chega dias depois, com contraproposta. 3 rodadas; recusa final bloqueia por 60 dias. Limiares: 16, 40 e 80.
- **Influência**: acesso à corte → 60% de influência (banquete +6%, patrocínio +10%, presente +4%) → um **laço** (comprar dívida, segredo descoberto por espião ou promessa de casamento) → **cerimônia de juramento** com escolha de termos.

## O mundo reage (`politics.ts`, `vassals.ts`)

- **Ameaça aos olhos do grão-lorde** (0–100): sobe com vassalos (militar +30, diplomacia +18, influência +15), ocupações (+30), ataques sem motivo; cai com tributo em dia e com o tempo. 40 → advertência; 60 → ultimato (pagar 200 ou recusar); 80 ou recusa → **guerra**: o exército do grão-lorde marcha e cerca sua província mais fraca; a muralha e a guarnição decidem.
- **Convocação** no dia 25: Hadrin pede 100 homens contra Ardesh. Enviar reduz a ameaça; inventar uma desculpa aumenta.
- **Coroa**: a simpatia cresce com seus vassalos; acima de 30 a rainha oferece proteção por 200 ouro. Com o pacto, a coroa impede a guerra do grão-lorde.
- **Ascensão**: com 4 das casas do feudo (você incluído) e o reconhecimento da coroa ou a queda do grão-lorde, você vira **grão-lorde** de Três Pontes; o antigo grão-lorde vira seu vassalo.
- **Vassalos** têm lealdade; termos firmes a corroem; abaixo de 15 param de pagar; abaixo de 5 renunciam ao juramento.
- **Tributo trimestral** de 60 ouro ao suserano.

## Raças no MVP

O jogador é humano. As casas vizinhas mostram outras raças sem bônus fixos: Isolde Morvane (salmária), Bertram Quellan (duário — a segunda consciência, Bram, tem relação própria e fala nas conversas), Varo Ardesh (vitrânio, 212 anos), Mirela Vasterre (aurena). Demais lordes recebem raça coerente com sua figura.

## Fora deste MVP

Batalhas táticas em tempo real, IA autônoma das outras casas (elas reagem ao jogador, mas não guerreiam entre si), casamentos com filhos e sucessão, magia, raças jogáveis, construção manual, economia global de mercadorias, rei de Velária e unificação (a escada mostra o objetivo, mas o degrau ainda não é jogável), navegação e transporte por portos.
