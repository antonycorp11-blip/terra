# ESCOPO DO MVP ATUAL

Este documento descreve **apenas o que está implementado e jogável agora**. A **VISÃO FINAL DO JOGO** continua em `docs/GDD.md` e nos documentos temáticos; nada daquela visão foi descartado, apenas adiado.

> Um mundo gigante. Três formas de jogar. Uma interface simples.

## Interface

- Uma única tela principal: o mapa de Varedor. Na parte inferior há três modos: **Descobrir**, **Influenciar** e **Conquistar**.
- O HUD superior mostra brasão, nome da casa, ouro, alimentos, madeira, ferro, influência, data e velocidade do tempo, além do sino de notificações.
- O painel contextual fica à direita no desktop. No celular em paisagem é uma gaveta lateral recolhível (até 44% da largura); em retrato é uma folha inferior recolhível.
- O zoom é contínuo (roda, pinça, botões). A densidade de detalhes muda com a escala: nomes de reino, depois de feudo, depois de província, ícones de assentamento e por fim os nomes dos assentamentos. Não há mais navegação em quatro páginas.
- A câmera só se move por comando do jogador, por um clique numa notificação ou para impedir que a seleção fique escondida sob o painel. O avanço do calendário nunca reposiciona a câmera.

## Criação da casa

- Nova Campanha → Sua Casa (nome) → Seu Brasão (8 divisões, 16 símbolos, 12 cores, principal e secundária) → Iniciar → **Fundar Minha Casa**.
- Nome: 2 a 24 letras, espaços, apóstrofo ou hífen; o prefixo "Casa" é automático; nomes de casas existentes são recusados (comparação sem acento nem maiúsculas).
- O jogador é sempre humano, governa como Irian, e começa em Velária › Três Pontes › Pontevela, no Castelo da Ponte Alta.
- A casa é identificada por `playerHouseId` e `seatProvinceId`; nenhum sistema busca a casa pelo nome.

## Conhecimento e névoa

| Nível | Mapa | Informação |
|---|---|---|
| Desconhecida | Névoa texturizada, mesclada numa única forma | Nada |
| Avistada | Terreno visível sob véu leve | Terreno; pode receber expedição se houver rota |
| Explorada | Cores políticas, nome, assentamentos | Casa governante, governante, suserano, população e riqueza aproximadas |
| Investigada | Idem | Personagens, população exata, relações; alcançada por contato, conversa ou espionagem bem-sucedida |

Início: Pontevela investigada; vizinhas avistadas; o resto desconhecido.

## Valores de balanceamento (`src/engine/balance.ts`)

| Sistema | Valores |
|---|---|
| Economia mensal de Pontevela | +120 ouro de tributos, −40 de administração, +240 alimentos, −150 de consumo, +45 madeira, +15 ferro (saldo +80 / +90 / +45 / +15) |
| Expedição | 60 ouro e 80 alimentos; 10 dias + 2 por etapa extra de rota + terreno (floresta +3, colina +2, montanha +6, várzea +1); no máximo 2 simultâneas |
| Investimentos (um nível cada) | Fazendas 150 ouro + 80 madeira, 20 dias, +60 alimentos/mês · Mercado 220 + 100, 25 dias, +45 ouro/mês · Mina 180 + 80, 30 dias, +30 ferro/mês |
| Emissário | 40 ouro; 8 dias + 2 por etapa extra |
| Presente | 50 ouro; relação +10; intervalo de 30 dias |
| Aproximação | 12 dias; +8 (ou +2 se a relação estiver abaixo de −25); intervalo de 30 dias |
| Audiência | 6 dias; concedida se a relação for ≥ −15; dura 30 dias e dá +1 de respeito por conversa |
| Comércio | Exige contato, relação ≥ 0 e rota terrestre conhecida; +18 ouro/mês enquanto as condições valerem |
| Espiões | 90 ouro para contratar, 6 ouro/mês de manutenção, até 3; missão de 15 ouro e 14 dias + 1 por etapa; relatório válido por 60 dias |
| Conversas | Cada assunto tem intervalo de 7 dias por personagem; pedir favor, 30 dias |

## Regras dos sistemas

- **Alcance**: expedições, emissários e espiões só seguem por províncias terrestres já exploradas. Uma província avistada é explorável quando faz fronteira com terra conhecida.
- **Resultado da expedição**: lido dos dados reais da província (castelos e cidades, vilas, estradas, recursos de minas, serrarias, fazendas, portos e entrepostos, casa governante, governante e seu temperamento, rumor de descontentamento quando a lealdade está abaixo de 60, oportunidade de contato). Ruínas não aparecem, porque o mundo ainda não as registra.
- **Relação inicial** (de −100 a +100): temperamento do governante, rivalidade tradicional determinística, juramento à mesma coroa, interesses, ambição, prestígio do jogador, distância e eventual espião identificado. Todas as parcelas aparecem no painel em "Por que esta relação?". Faixas: Amigável (≥ 20), Neutra (≥ 0), Desconfiada (≥ −25), Hostil.
- **Espionagem**: pontuação determinística = sorteio (hash da missão) + intriga do agente + lealdade do agente − intriga do governante − lealdade local. Resultado: sucesso (tesouro, guarnição, lealdade, juramento e rumor marcado como não confirmado), parcial (guarnição), nada, ou identificado (relação −15 e lealdade do agente −5). Os relatórios guardam data, fonte, confiança e validade.
- **Conversas**: Cumprimentar, Perguntar sobre sua casa, Perguntar sobre a região, Conversar sobre política, Elogiar e Solicitar favor. Personagens desconfiados ou de casas com relação negativa respondem com frieza e rendem menos. As interações alteram confiança, respeito e amizade, revelam informações e ficam na memória do personagem.
- **Tempo**: cada dia processa obras, expedições, diplomacia, espionagem, economia (a cada 30 dias) e eventos locais (a cada 60 dias). O jogo pausa sozinho apenas para expedição concluída, primeiro contato, resposta a audiência e relatório de espionagem.
- **Determinismo**: avançar N dias de uma vez equivale a N avanços de um dia, e salvar e carregar não altera nenhum resultado futuro.

## Conquistar

O modo mostra tropas mobilizáveis, cavalos, ferro, guarnições próprias e guarnições estrangeiras conhecidas por espionagem. **Batalhas, cercos e conquistas militares estão em desenvolvimento**, e o modo não oferece nenhuma ordem militar.

## Fora deste MVP

Guerras, batalhas táticas, cercos, casamentos, nascimentos, sucessão, magia, raças jogáveis, monstros, construção manual, economia comercial global, IA política para todos os reinos e árvores genealógicas completas. A arquitetura já permite essas expansões: os personagens têm IDs persistentes e a casa mantém `memberIds`; posse legal, administração, ocupação e suserania continuam distintas por província.
