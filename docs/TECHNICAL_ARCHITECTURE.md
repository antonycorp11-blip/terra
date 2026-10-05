# Arquitetura técnica

Decisões da Fase 1: React, TypeScript, Vite e CSS modular; motor em `src/engine`, separado de `src/ui`; IndexedDB e Zustand apenas para estado transitório da interface.

A revisão geográfica 3 usa `landPolygons` (continente e 16 ilhas), preservando `landPolygon` como contorno principal. Cada província expõe `polygons` para conservar todos os fragmentos de recorte e `polygon` como polígono principal que contém o centro. `landmass` identifica sua massa terrestre. As 252 províncias cobrem todas as terras, mantendo 7 reinos, 42 feudos, 1.008 assentamentos e 133 casas. A alocação cresce pela malha com pesos desiguais; as áreas dos reinos variam. As províncias têm nomes únicos mesmo com feudos de quantidades variáveis.

`neighbors` representa apenas adjacência terrestre, com segmentos verificados dentro da terra. `maritimeLinks` registra os vínculos administrativos das ilhas ao continente para alocação territorial; não permite caminhada nem cria estradas marítimas. A busca terrestre retorna rota vazia para ilhas. Transporte de tropas e cargas por portos ainda depende do sistema naval.

`src/engine/seafaring.ts` calcula oito trajetos de ambientação em uma grade navegável sobre água com margem do litoral. `MapShips` percorre esses trajetos com um relógio visual independente da simulação, usando um único ciclo de animação e respeitando redução de movimento. Os navios não representam recursos ou comércio persistente. Os portos têm posições próximas à costa dentro da própria província. `routes.ts` mantém as estradas, a busca ponderada e rios descendentes com foz na costa.

`src/ui/mapArt.ts` monta reservas espaciais para nomes e assentamentos. A direção atual é cartografia política, sem decoração de vegetação. `MapSprites` reutiliza apenas construções e barcos do atlas; nomes curvos usam SVG `textPath`, e limites/rios usam `vector-effect` para manter espessuras legíveis no zoom. Cores políticas não são misturadas com biomas. Os dados territoriais e cliques permanecem SVG.

Salvamentos anteriores a `geographyRevision: 3` são regenerados com a nova geografia, preservando calendário, história, recursos das casas e população/lealdade da sede do jogador. A titularidade inicial segue a nova hierarquia. Hidrografia física detalhada, pontes, transporte naval, economia entre casas e IA permanecem para fases posteriores.

A audiência inicial de Pontevela fica em `src/engine/audience.ts`: aplica uma escolha uma única vez, modifica recursos e lealdade em estado imutável e acrescenta um registro histórico persistente. A apresentação da conversa fica na cena do castelo, em `src/ui/App.tsx`.

## Arquitetura do MVP (Descobrir · Influenciar · Conquistar)

O estado persistente é `GameState` versão 2: `world` (geografia e domínio político) mais `campaign: CampaignData` (`src/engine/mvpTypes.ts`), que contém `customization`, `knowledge`, `expeditions`, `investments`, `ledger`, `characters`, `contacts`, `diplomacy`, `agents`, `spyMissions`, `reports`, `conversations`, `notifications` e o contador `nextId`. As regras ficam em módulos puros do motor:

| Módulo | Responsabilidade |
|---|---|
| `balance.ts` | Única fonte dos valores de balanceamento |
| `stateUtils.ts` | `editGame` (cópia rasa da geometria imutável e clonagem do estado mutável), `spend`, `nextId`, `record` |
| `campaign.ts` | Cria `CampaignData` para jogos novos e para salvamentos da versão 1 |
| `heraldry.ts`, `houseCustomization.ts` | Opções de brasão, validação do nome, fundação da casa (só no dia 0) |
| `knowledge.ts` | Níveis de conhecimento, avistamento de vizinhos, `knownRoute` (BFS só por terra conhecida) |
| `exploration.ts` | Orçamento, envio e resolução de expedições; achados lidos dos dados reais |
| `economy.ts`, `investments.ts` | Balanço mensal calculado só a partir de `BALANCE`, obras concluídas e acordos; eventos locais |
| `characters.ts`, `relationships.ts`, `dialogue.ts` | Personagens determinísticos com IDs persistentes (`ruler-<casa>`, `counsel-<casa>`, `court-n`, `candidate-n`), relação inicial explicada, conversas com intervalos e memória |
| `diplomacy.ts`, `espionage.ts` | Emissário, presente, aproximação, audiência, comércio; contratação, missões e relatórios |
| `notifications.ts` | Fila de acontecimentos; `important` marca o que pausa o tempo |
| `simulation.ts` | `advanceGame` processa um dia por vez, na mesma ordem, de forma determinística |

Invariantes:

- Nenhuma regra procura a casa do jogador pelo nome; usam-se `playerHouseId` e `seatProvinceId`.
- `advanceGame(g, n)` equivale a n chamadas de `advanceGame(g, 1)`. Os sorteios usam `hash` sobre IDs e dias, nunca `Math.random` nem o relógio do sistema. `updatedAt` só muda no envelope de persistência.
- Toda ação valida o custo e o pré-requisito com `requireRule` e lança uma mensagem legível, que a interface mostra.
- `migrateGame` aceita as versões 1 e 2: aplica a migração geográfica e cria `campaign` quando ausente.

### Interface

- `src/ui/store.ts` guarda apenas estado transitório: modo, seleção, aba, painel recolhido e pedidos de foco de câmera.
- `App.tsx` mantém `gameRef` como fonte única para sequenciar ações do jogador e ticks do relógio sem perder nenhum dos dois.
- `MapView.tsx` memoriza toda a geometria por `world.seed`, então caminhos, contornos fundidos de reinos e feudos, rótulos e centros nunca são recalculados por avanço de calendário. A camada de províncias é um `memo` que só se redesenha quando muda o conhecimento, o modo ou as relações. A névoa usa uniões de polígonos (`unionPath`, com buracos e `evenodd`) por nível de conhecimento, para que nenhuma fronteira interna vaze. Fronteiras de reino, feudo e província têm espessuras distintas, com `vector-effect: non-scaling-stroke`. O nível de detalhe depende da escala; a roda do mouse usa um ouvinte nativo não passivo; há suporte a pinça.
- `DiscoverPanel`, `InfluencePanel` e `ConquerPanel` apenas leem o estado e chamam ações do motor por meio de `act`.

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
