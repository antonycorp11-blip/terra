# Arquitetura técnica

Decisões da Fase 1: React, TypeScript, Vite e CSS modular; motor em `src/engine`, separado de `src/ui`; IndexedDB e Zustand apenas para estado transitório da interface.

A revisão geográfica 3 usa `landPolygons` (continente e 16 ilhas), preservando `landPolygon` como contorno principal. Cada província expõe `polygons` para conservar todos os fragmentos de recorte e `polygon` como polígono principal que contém o centro. `landmass` identifica sua massa terrestre. As 252 províncias cobrem todas as terras, mantendo 7 reinos, 42 feudos, 1.008 assentamentos e 133 casas. A alocação cresce pela malha com pesos desiguais; as áreas dos reinos variam. As províncias têm nomes únicos mesmo com feudos de quantidades variáveis.

`neighbors` representa apenas adjacência terrestre, com segmentos verificados dentro da terra. `maritimeLinks` registra os vínculos administrativos das ilhas ao continente para alocação territorial; não permite caminhada nem cria estradas marítimas. A busca terrestre retorna rota vazia para ilhas. Transporte de tropas e cargas por portos ainda depende do sistema naval.

`src/engine/seafaring.ts` calcula oito trajetos de ambientação em uma grade navegável sobre água com margem do litoral. `MapShips` percorre esses trajetos com um relógio visual independente da simulação, usando um único ciclo de animação e respeitando redução de movimento. Os navios não representam recursos ou comércio persistente. Os portos têm posições próximas à costa dentro da própria província. `routes.ts` mantém as estradas, a busca ponderada e rios descendentes com foz na costa.

`src/ui/mapArt.ts` monta reservas espaciais para nomes e assentamentos. A direção atual é cartografia política, sem decoração de vegetação. `MapSprites` reutiliza apenas construções e barcos do atlas; nomes curvos usam SVG `textPath`, e limites/rios usam `vector-effect` para manter espessuras legíveis no zoom. Cores políticas não são misturadas com biomas. Os dados territoriais e cliques permanecem SVG.

Salvamentos anteriores a `geographyRevision: 3` são regenerados com a nova geografia, preservando calendário, história, recursos das casas e população/lealdade da sede do jogador. A titularidade inicial segue a nova hierarquia. Hidrografia física detalhada, pontes, transporte naval, simulação econômica e IA permanecem para fases posteriores.

A audiência inicial de Pontevela fica em `src/engine/audience.ts`: aplica uma escolha uma única vez, modifica recursos e lealdade em estado imutável e acrescenta um registro histórico persistente. A apresentação da conversa fica em `src/ui/App.tsx`.

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
