# ESCOPO DO MVP ATUAL

Este documento descreve **apenas o que está implementado e jogável agora**. A **VISÃO FINAL DO JOGO** continua em `docs/GDD.md` e nos documentos temáticos; as raças estão em `docs/RACES.md`. Nada da visão foi descartado, apenas adiado.

> Um mundo vivo. Três caminhos para conquistar. Uma interface simples.

## Como se joga: turnos e comitiva (`turns.ts`, `party.ts`)

- O jogo é **por turnos**. Cada turno é uma semana. O jogador age e depois toca em **Encerrar turno**: o mundo anda 7 dias (economia, exércitos, diplomacia, acontecimentos), lordes e bandos se movem com animação, e aparecem as cenas e o **relatório do turno**.
- **Irian é uma peça no mapa** com a sua comitiva (começa com 45 homens). Tocar nele mostra marcadores dourados nas províncias ao alcance: **2 movimentos por turno**, montanha custa 2. Para destinos longe, "Seguir para cá" avança o máximo possível no caminho. Andar descobre a terra (vira explorada) e, ao chegar onde um lorde está, abre contato.
- **Tamanho da comitiva**: 60 + 30 por província sua. Numa província sua, homens passam da guarnição para a comitiva e vice-versa (lotes de 25).
- **Ordens**: 3 por turno, para ações à distância (batedores, emissário, obras, muralhas, deslocar tropas, marchar, espião, compras). O que Irian faz **em pessoa** não gasta ordem: conversar (só em pessoa), banquete, patrocínio, presente, proposta de negociação e juramento ficam de graça quando ele está com o lorde.
- **Lordes na estrada**: os lordes do reino saem com escoltas (20% dos homens + 25), caçam bandos nas próprias terras, visitam o suserano, vão à guerra e voltam para casa. A figura deles anda pelo mapa.
- **Bandos de salteadores** surgem perto das suas terras (no máximo 2 + 1 a cada 8 turnos, até 6), crescem 3 homens por turno, fogem de uma comitiva 1,3× mais forte e saqueiam: nas suas terras levam ouro e lealdade, a menos que a guarnição tenha o dobro deles. Nas terras de uma casa com quem você tem contato, ela **pede ajuda**: 80 ouro, relação +10 e influência +10 para quem destruir o bando.
- **Combate em campo** quando Irian alcança um bando ou ataca uma escolta (ou é emboscado no fim do turno): Carga (+12% de força, mais perdas), Segurar a linha (menos perdas; +15% em colinas, montanhas ou se defendendo), Emboscada (em floresta, colina ou montanha, +30% por 3 de renome) ou Recuar (perde 12% e volta para a terra sua mais próxima). Vencer bandidos dá 2 ouro por bandido, renome e cativos libertados que entram na comitiva. Perder devolve Irian para a sede com 15% dos homens.
- **Prisioneiros**: vencer a escolta de um lorde captura-o com 55% de chance (mais com vantagem). Escolhas: exigir juramento (aceita se a casa é provincial e você tem 25 de influência ou relação +10; as terras passam a ser suas), resgate (100 + 25% do tesouro dela), libertar com honra (relação +20, influência +10, renome +3) ou manter preso (a casa se defende 25% pior; relação −2 por turno). Atacar uma escolta em paz custa renome, relação −30 e ameaça.
- **Diário**: os objetivos do momento, do mais urgente ao mais distante (expulsar bandos das suas terras, defender províncias, recompensas, reforçar a comitiva, visitar casas, a casa mais perto de jurar).
- **Abertura e marcos**: uma cena de abertura conta quem é Irian e como jogar; virar grão-lorde abre a cena de conquista.

## A tela

- Uma única tela: o mapa de Varedor em tela cheia, com zoom (roda, pinça, botões) e arraste. A câmera só se move por comando do jogador ou ao tocar numa notificação.
- **Topo**: brasão e nome da casa (abre o menu), ambição (lorde → grão-lorde → rei → unificação) com o apoio atual, botão **Casas**, ouro, **renome**, os seis recursos (em vermelho quando zerados; cada ganho ou perda sobe da barra), turno, data e as **3 ordens**.
- **Base**: **Diário**, botão da **Comitiva**, as **quatro visões** e **Encerrar turno**.
- **Carta**: ao tocar uma província aparece uma carta de pergaminho à direita com a casa em destaque (brasão, nome, lema, lorde, raça, idade, traços, relação, personalidade) e o lorde de corpo inteiro **dentro da carta**, numa coluna nas cores da casa. Nas suas terras aparece Irian ou o governador nomeado. O conteúdo muda com a visão e com quem governa a província.
- **Lordes no mapa**: cada casa conhecida tem seu lorde de corpo inteiro de pé sobre a sede. Tocar o lorde abre a carta da casa; enquanto a carta está aberta, a figura sai do mapa para não duplicar a imagem. Toda província sua que não é a sede mostra o **estandarte com o seu brasão**.
- **Audiência**: conversas e negociações abrem uma cena em tela cheia, com o lorde de corpo inteiro à esquerda e a troca à direita (falas de Irian, respostas no balão, consequências, corte da casa). 60 figuras provisórias em `public/assets/lords` (cada uma usada por um único personagem; quem não tem figura aparece pelo brasão).

## As quatro visões

| Visão | O mapa inteiro mostra | Na sua província | Numa província estrangeira |
|---|---|---|---|
| Território | Cores das casas sobre o relevo; névoa | População e **crescimento mensal com os motivos**, lealdade, saldo, **imposto**, **governador**, **obras em 3 níveis**, antiga casa, corte | Casa, produz/falta, **caminhos para tomar**, emissário, conversa |
| Diplomacia | Recursos produzidos, rotas reais (comércio, tributo, compras), o que falta; filtro por recurso | O que falta e quem vende, pactos ativos | Razões da relação, comércio → aliança → vassalagem, presente, compra de recursos |
| Militar | Guarnições e defensores estimados, forças do feudo, exércitos em marcha | Recrutar (limite explicado), muralhas, deslocar tropas (estilo War) | Defensores, muralha, dias de marcha e cerco, justificativa, marchar |
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
| Terras conquistadas | toda a produção vai para o seu tesouro; você recruta, cobra imposto e constrói nelas; +1 renome/mês por casa jurada |
| Imposto por província | baixo: ouro ×0,6, +2 lealdade/mês, +0,3% de crescimento; normal; alto: ouro ×1,4, −3 lealdade/mês, −0,3% de crescimento |
| Governador | sem governador fora da sede: −1 lealdade/mês; com governador: +1 (+1 se diplomacia > 60). Candidatos: a corte e os antigos lordes jurados |
| População | cresce todo mês: +0,4% natural, +0,3% com celeiros cheios, +0,3% com lealdade ≥ 70, +0,2% por nível de fazendas; −0,5% com lealdade < 40, −1,5% com fome, −0,2% no inverno, −2% com febre |
| Recrutamento | até 8% da população em armas, +3% por nível de quartel |
| Obras | Fazendas (+60 grãos), Mercado (+45 ouro), Mina (+30 ferro ou pedra, ou +15 prata, conforme a terra), Quartel (+3% recrutável); 3 níveis em qualquer província sua; cada nível custa 60% a mais e leva 5 dias a mais |

## Exploração

- **Batedores**: 60 ouro e 80 grãos; 10 dias + 2 por etapa de rota + terreno; até 2 simultâneas; achados lidos dos dados reais.
- **Viagem pessoal de Irian**: 60% do tempo, 20 ouro, risco de emboscada (9% a 26% pelo terreno, +10% fora do reino); ao chegar, revela tudo, estabelece contato e dá +10 de confiança; emboscada custa 40 ouro, 3 de renome e 3 dias. Enquanto Irian viaja, Pontevela perde 1 de lealdade a cada 10 dias.

## Conquista em etapas (`plans.ts`)

Cada província estrangeira mostra os três caminhos e o nível em cada um.

- **Militar**: justificativa (reivindicação por espião em 30 dias, ou ofensa real — Ardesh) → exército (homens recomendados, caminho conhecido) → marcha visível e cerco (4 + 4×muralha dias) → **assalto com escolha de tática** (assalto direto; ao amanhecer +14% por 4 de renome; cercar e esfomear +8 dias, −32% dos defensores) → **batalha animada** → rendição com escolha de termos. Atacar sem justificativa custa 25 de renome, +15 de ameaça e piora todas as relações. Uma sede vencida faz a casa jurar: **as terras dela passam a ser suas** (governo, posse e produção), um terço do exército fica de guarnição e a família vira vassala sem governo — com termos generosos o antigo lorde governa a sede em seu nome. Terras do grão-lorde ficam **ocupadas** (a posse legal não muda). O cerco desgasta o sitiante (0,6% ao dia, o dobro no inverno) e o **suserano da casa sitiada manda socorro** com 35% dos homens dele: se chegar antes do assalto, a batalha é em campo aberto.
- **Diplomacia**: contato → pacto comercial → aliança → tratado de vassalagem. Cada etapa é uma **negociação com balança**: o jogador escolhe ofertas (ouro, prata, comércio, proteção, casamento, perdão de dívida) e a casa pesa relação, influência, temperamento e o que teme. A proposta viaja com o emissário; a resposta chega dias depois, com contraproposta. 3 rodadas; recusa final bloqueia por 60 dias. Limiares: 18, 45 e 90. O tratado de vassalagem só pode ser proposto se a casa teme algo (vizinho forte, guerra, dívida com você, poucos homens) e se você tem **1,5× os defensores dela em armas**.
- **Influência**: acesso à corte → 60% de influência e relação +15 → um **laço** (comprar dívida, segredo descoberto por espião ou promessa de casamento) → **cerimônia de juramento** com escolha de termos. Cada ação rende conforme a relação (×0,5 a ×1), o temperamento (desconfiado ×0,7, orgulhoso ×0,8, acolhedor ou generoso ×1,2, duário ×0,75) e quanto já se tem (×0,7 acima de 40%, ×0,5 acima de 60%). Influência sem cuidado por 45 dias cai 3 por mês.

## O mundo reage (`politics.ts`, `vassals.ts`)

- **Ameaça aos olhos do grão-lorde** (0–100): sobe com vassalos (militar +30, diplomacia +18, influência +15), ocupações (+30), ataques sem motivo; cai com tributo em dia e com o tempo. 40 → advertência; 60 → ultimato (pagar 200 ou recusar); 80 ou recusa → **guerra**: o exército do grão-lorde marcha e cerca sua província mais fraca; a muralha e a guarnição decidem.
- **Convocação** no dia 25: Hadrin pede 100 homens contra Ardesh. Enviar reduz a ameaça; inventar uma desculpa aumenta.
- **Coroa**: a simpatia cresce com seus vassalos; acima de 30 a rainha oferece proteção por 200 ouro. Com o pacto, a coroa impede a guerra do grão-lorde.
- **Ascensão**: com 4 das casas do feudo (você incluído) e o reconhecimento da coroa ou a queda do grão-lorde, você vira **grão-lorde** de Três Pontes; o antigo grão-lorde vira seu vassalo.
- **Casas juradas** têm lealdade: termos firmes a corroem (−2/mês); generosos ou com governo a sustentam (+1/mês). Abaixo de 15 a família **se revolta** na antiga sede: fazer concessões (150 ouro, ela volta a governar) ou esmagar (sua guarnição contra os rebeldes; perdendo, a província volta para ela e a casa vira inimiga).
- **Tributo trimestral** de 60 ouro ao suserano.

## Mundo vivo (`events.ts`)

- **Acontecimentos** a cada 6 a 11 dias, sempre com escolha e consequência real: petição de aldeias, motim (lealdade < 30), bandidos, seca, febre, mercador estrangeiro, refugiados de guerra, espião capturado, intriga contra a sua influência, torneio, pedido de empréstimo (devolvido com juros ou vira laço de dívida), proposta de casamento. Um mesmo tipo não se repete em 45 dias.
- **Guerras entre casas**: no dia 40 Ardesh ataca uma terra de Hadrin; depois, a cada 24 dias, uma casa do reino ataca um vizinho. Os cercos são resolvidos de verdade (a terra pode ser tomada); trégua após 90 dias. Casas em guerra ficam fracas em casa e passam a temer, o que abre a vassalagem por tratado.
- **Sucessão**: no dia 170 o velho grão-lorde morre; o herdeiro, jovem e ambicioso, assume, e um pretendente contesta. Apoiar o herdeiro (100 ouro, ameaça −25), apoiar o pretendente (10 renome, a casa perde quase metade dos homens) ou ficar neutro.

## Conversas (`dialogue.ts`)

Cada lorde fala pela própria voz: a abertura depende do temperamento e do humor em relação a Irian (frio, neutro, caloroso), o assunto puxa o interesse dele (zeloso, mercantil, tradicional, erudito, belicoso) e a raça dá as imagens (salmários falam de marés, aurenos de vento, vitrânios de gerações, náveos das estrelas; duários respondem com as duas consciências). Assuntos: cumprimentar, a casa dele, as terras, o suserano, **do que precisam** (revela o que pesa numa negociação), **que notícias correm** (guerras, muralhas fracas, dívidas, humor do grão-lorde, com revelação no mapa), elogiar, pedir um favor e **intimidar** (funciona com 1,2× os defensores dele em armas).

## Raças no MVP

O jogador é humano. As casas vizinhas mostram outras raças sem bônus fixos: Isolde Morvane (salmária), Bertram Quellan (duário — a segunda consciência, Bram, tem relação própria e fala nas conversas), Varo Ardesh (vitrânio, 212 anos), Mirela Vasterre (aurena). Demais lordes recebem raça coerente com sua figura.

## Fora deste MVP

Batalhas táticas em tempo real, IA estratégica completa das outras casas (as guerras entre elas seguem regras simples), casamentos com filhos e árvores de sucessão, magia, raças jogáveis, construção manual, economia global de mercadorias, rei de Velária e unificação (a escada mostra o objetivo, mas o degrau ainda não é jogável), navegação e transporte por portos.
