# Arquitetura técnica

React, TypeScript, Vite e CSS modular; motor em `src/engine`, independente de React; Zustand apenas para estado transitório da interface; IndexedDB para salvamentos; um Web Worker pinta o relevo.

## Geografia (revisão 4)

| Módulo | Responsabilidade |
|---|---|
| `terrain.ts` | Ruído de valor, `terrainField` (distância assinada à costa oficial numa grade de 8 px, por baldes de segmentos), `elevationAt` (costa + ruído + relevo interior + três cordilheiras) e `moistureAt`. Usado pelo motor e pelo worker do relevo, então costa, rios e fronteiras coincidem. |
| `mesh.ts` | Malha de Voronoi (~8.300 células, espaçamento 10,5) memorizada por semente; ilhotas com menos de 7 células voltam ao mar; drenagem por *priority flood* (`parent`, `flow`); `partitionProvinces` gera exatamente 252 províncias (uma por ilha, o restante por amostragem do ponto mais distante ponderada pela fertilidade, depois Dijkstra multifonte com custo de serra e de travessia de rio); `traceLabelRings` traça contornos; `traceRivers` extrai os rios. |
| `world.ts` | Monta províncias (contorno incluindo um anel de células de mar, para o recorte pela costa pintada; centro = polo de inacessibilidade; ângulo do rótulo pela elongação), reinos e feudos com `allocateConnected` penalizando montanhas, 133 casas (Três Pontes com cinco casas autorais), 1.008 assentamentos posicionados nas células da província e produção apportionada pelos tipos de assentamento. |
| `names.ts`, `portraits.ts` | Nomes curados de províncias e casas; catálogo das figuras de lordes com raça e sexo do desenho. |

Invariantes: contagens canônicas; toda célula de terra pertence a uma província; vizinhança só por terra; `maritimeLinks` liga ilhas sem permitir marcha; rios seguem `parent`; `labelAngle` nunca é `-0` (JSON). Salvamentos com geografia 3 são regenerados (`migrateGeography`): preservam identidade da casa, ouro, estoques, renome, calendário e crônica; a campanha recomeça no mapa novo.

## Estado persistente

`GameState` versão 3 = `world` + `campaign: CampaignData` revisão 2 (`mvpTypes.ts`). Além de conhecimento, expedições, obras, personagens, contatos, agentes, relatórios, conversas e notificações, a campanha guarda `garrisons`, `armies`, `battles`, `claims`, `bonds`, `vassals`, `influence`, `influenceCooldowns`, `negotiations`, `decisions`, `politics`, `travel` e `purchases`. `House.stock` tem os seis recursos; `House.prestige` é o renome; `Province.resources`, `area` e `labelAngle` são novos.

## Regras

| Módulo | Responsabilidade |
|---|---|
| `balance.ts` | Única fonte de valores |
| `stateUtils.ts` | `editGame` (cópia do estado mutável, geometria compartilhada), `pay` e `missing` (custos com mensagem do que falta), `controlled`, `isVassal`, `inPlayerRealm` |
| `economy.ts` | Produção lida dos assentamentos, administração e consumo por população, tributo de vassalos, manutenção de tropas e agentes, inverno e sal |
| `military.ts` | Muralhas, defensores, recrutamento, muralhas, deslocamento, rotas, marcha, cerco, `resolveBattle` determinístico (hash), assalto com tática, defesa contra exércitos inimigos, posição interpolada para o mapa |
| `negotiation.ts` | Ofertas com custo e valor por casa, pontuação, rodadas, resposta após a viagem do emissário, devolução do custo na recusa |
| `influence.ts` | Influência por casa, banquete, patrocínio, casamento, compra de dívida, laços, cerimônia de juramento |
| `vassals.ts` | `makeVassal` (suserania das províncias, cor, ameaça, coroa, renome), lealdade e renúncia |
| `politics.ts` | Tributo, convocação, advertência, ultimato, guerra, oferta da coroa, ascensão a grão-lorde |
| `travel.ts` | Viagem pessoal do lorde e compra de recursos |
| `decisions.ts` | Decisões que pausam o tempo, com opções e consequências descritas, e `resolveDecision` |
| `plans.ts` | Etapas reais dos três caminhos de conquista |
| `characters.ts`, `dialogue.ts` | Raça, figura, segunda consciência dos duários (responde e tem relação própria) |

`advanceGame` processa por dia: obras, expedições, viagem, diplomacia, negociações, espionagem, exército, política, vassalos, influência, economia, estações, eventos locais. Sorteios usam `hash` sobre IDs e dias; N dias de uma vez equivalem a N passos.

## Interface

- `App.tsx`: telas (título, criação, jogo), relógio (pausa automática em notificação importante ou decisão aberta), autosave a cada 30 dias, ações via `act`.
- `MapView.tsx`: renderizador em canvas na resolução nativa (até 3×, limite de ~6,5 Mpx). O `map/terrainWorker.ts` entrega o relevo em duas passadas e as listas vetoriais de árvores, picos e rios; o mundo é gerado em `worldWorker.ts`. Cada quadro completo desenha relevo, estradas, rios, árvores, picos, camada política (névoa em padrão, cores das casas, faixa interna, listras de vassalo, fronteiras classificadas por `map/geometry.ts`, visões) recortada pela máscara da costa, contornos e nomes em espaço de tela. Durante arraste e pinça a imagem anterior é transformada por CSS; o redesenho ocorre 120 ms após o fim do gesto ou quando a assinatura visual muda (conhecimento, suserania, ocupação, seleção, visão e dados da visão), nunca a cada dia. Toques usam `isPointInPath`. Lordes, exércitos e a viagem são elementos HTML posicionados pelo último quadro.
- `game/GameScreen.tsx` (HUD, linha do tempo, visões, avisos), `game/ProvinceCard.tsx` (carta por visão e situação), `game/LensSummary.tsx`, `game/Sheets.tsx` (Casas, conversa, plano, negociação, menu, crônica), `game/Scenes.tsx` (decisões e batalha animada).
- Em desenvolvimento, `window.__terra` expõe `{ game, setGame }` para os testes de interface; não existe no build de produção.

# 25. ARQUITETURA DE SOFTWARE

## Stack obrigatória

- React.
- TypeScript.
- Vite.
- CSS modular.
- SVG procedural.
- Zustand para estado de interface.
- IndexedDB para persistência.
- Vitest para testes.
- Playwright para testes de navegação e interface.

Motor de simulação separado da interface React.

Usar Web Workers quando necessário.

Não depender de backend para a campanha individual.

## 25.1 Módulos

Criar módulos específicos:

- `world`
- `geography`
- `territories`
- `titles`
- `houses`
- `characters`
- `relationships`
- `dynasties`
- `diplomacy`
- `economy`
- `trade`
- `espionage`
- `warfare`
- `battle`
- `sieges`
- `events`
- `history`
- `ai`
- `time`
- `persistence`
- `ui`
- `art`

Não concentrar todo o sistema em um único arquivo.

## 25.2 Contratos de dados

Criar entidades tipadas, incluindo:

**House:** identificador, identidade, brasão, histórico, membros, títulos, recursos, reputação, relações, ambições e memórias.

**Character:** identificador, família, pais, estado civil, saúde, habilidades, traços, localização, objetivos, relações, títulos, informações conhecidas e memórias.

**Realm:** identificador, nome, capital, governante, feudos, legislação, cultura e relações externas.

**Fief:** identificador, nome, províncias, senhor legítimo e estrutura de vassalagem.

**Province:** identificador, polígono, território legal, governante, controlador militar, população, recursos, estruturas e assentamentos.

**Settlement:** identificador, posição, tipo, população, guarnição, produção, infraestrutura e proprietário.

**Title:** identificador, categoria, detentor legítimo, regras hereditárias, reivindicações e vínculos feudais.

**Army:** identificador, comandante, companhias, localização, rota, objetivos, suprimentos e moral.

**War:** identificador, participantes, reivindicações, objetivos, ocupações e situação diplomática.

**Relationship:** participantes, valores sociais, memórias e compromissos.

**Plot:** conspiradores, objetivo, progresso, exposição, financiamento e condições.

**Event:** origem, condições, participantes, opções e efeitos.

**HistoricalRecord:** data, envolvidos, descrição, categoria e referências.

**GameState:** relógio, mundo, casas, personagens, territórios, exércitos, conflitos, registros históricos e configurações.

Todas as referências devem utilizar identificadores persistentes.

## 25.3 Invariantes

Impedir:

- Personagens mortos realizando ações.
- Filhos mais velhos que seus pais.
- Casamentos inválidos.
- Títulos com múltiplos detentores legais simultâneos.
- Assentamentos associados a províncias inexistentes.
- Feudos sem reino de direito.
- Exércitos sem localização válida.
- Recursos negativos inválidos.
- Guerras sem participantes.
- Sucessões circulares.
- Aliados participando dos dois lados de uma guerra sem uma mudança diplomática explícita.
- Mudanças territoriais não registradas historicamente.

---

# 26. SALVAMENTO E CONTINUIDADE

Criar autosave configurável e salvamento manual.

Permitir vários espaços de campanha.

Persistir:

- Semente do mundo.
- Tempo.
- Estado político.
- Casas.
- Personagens.
- Genealogias.
- Relações.
- Segredos.
- Conhecimento de inteligência.
- Conspirações.
- Produção.
- Estoques.
- Construções.
- Exércitos.
- Rotas.
- Guerras.
- Tratados.
- Promessas.
- Títulos.
- Ocupações.
- Eventos pendentes.
- Memórias históricas.
- Objetivos da IA.

Criar versionamento de saves e migrações de dados quando o projeto evoluir.

Uma campanha carregada deverá continuar coerentemente com o mesmo estado político, econômico e familiar.

---
