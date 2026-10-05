# Progresso real

## Fase 1 — Fundação e mapa: em andamento

### Implementado

- Projeto React + TypeScript + Vite, CSS modular, Zustand, IndexedDB, Vitest e Playwright.
- Geração determinística de um continente com 7 reinos, 42 feudos, 252 províncias, 1.008 assentamentos e 133 casas. Reinos e feudos recebem quantidades variáveis de províncias. As áreas continentais são contíguas e as ilhas possuem vínculos administrativos marítimos explícitos.
- Continente com golfo central aberto ao oceano, penínsulas e 16 ilhas tituladas; polígonos provinciais por Voronoi recortado ao litoral, sem lacunas de cobertura; vizinhança, rios descendentes e rede de estradas; busca de caminhos territorial com custo de terreno.
- Separação explícita entre casa titular, governante, ocupante e suserano.
- Casa Serraval em Pontevela, com capital, população, tesouro, estoques e força mobilizável iniciais.
- Direção visual de mapa político de grande estratégia: cores uniformes dos reinos, nomes cartográficos curvos, fronteiras finas, textura discreta e capitais/portos menores. Vegetação e montanhas ilustradas foram retiradas conforme a orientação de 05/10/2026. O atlas fornece apenas construções e embarcações; há reservas espaciais para os rótulos.
- Oito barcos animados em trajetos navegáveis sobre água, com redução de movimento. Ambientação visual, sem transporte comercial simulado.
- Mapa SVG navegável em quatro escalas por cliques sucessivos em reino, feudo, província e assentamento; camadas político/casas/terreno, zoom e arraste.
- Tela inicial com apenas a cartografia e um pequeno acesso ao menu oculto. O painel contextual aparece somente após selecionar um território. Cores políticas mais vivas, fronteiras contínuas, brasões, capitais, castelos e mini-mapa durante a exploração.
- Vista móvel em tela cheia, com arraste por toque, mini-mapa e painel contextual inferior.
- Entrada em Pontevela com dados reais do domínio, crônica local e uma audiência inicial com duas escolhas que alteram alimentos, ouro, prestígio e lealdade. O sistema amplo de personagens e conversas continua pendente.
- Cena original em pixel art para a audiência de Pontevela em `public/assets/pontevela-audience.png`.
- HUD, calendário de 360 dias, três velocidades e pausa; registro histórico das estações.
- Salvamento manual, carregamento, espaços múltiplos e autosave a cada 30 dias no IndexedDB.
- Migração do mapa antigo ao carregar um salvamento, preservando calendário, história, recursos das casas e população/lealdade da sede do jogador.
- Testes de contagens, vínculos, conectividade, determinismo, rios, rotas, calendário e navegação básica.

### Validação em 05/10/2026

- `npm test`: 8 testes cobrem também cobertura territorial, contiguidade terrestre/marítima, rotas aquáticas, ilhas, tamanhos variados, migração do mapa anterior e consequências da audiência.
- `npm run test:ui`: 5 fluxos cobrem a tela inicial, a navegação territorial, a audiência, carregamento da arte, separação entre construções e rótulos, movimento dos barcos e acessibilidade, o menu oculto, salvamento, arraste e a vista móvel.
- `npm run build`: concluído sem erros de TypeScript ou Vite.
- Prévia visual conferida em 1600×900, 1366×768 e 390×844; capturas em `screenshots/` (arquivos locais ignorados pelo Git).

### Pendente para concluir a Fase 1

- Transporte naval por portos, embarque, comércio e consequências econômicas dos trajetos. Ilhas e mar interior já existem como geografia e ambientação navegada.
- Hidrografia e elevação mais sofisticadas, estradas com passagens e pontes explícitas. O mini-mapa já permite centralizar a vista por clique ou toque.
- Migrações de salvamentos para mudanças estruturais futuras. A revisão geográfica anterior já é migrada; versões de formato incompatíveis continuam rejeitadas com mensagem clara.
- Conteúdo autoral das 49 casas principais, histórias individualizadas e personagens, planejados na Fase 2 da Bíblia.
- Simulação econômica e política autônoma. O relógio avança e registra as estações, mas o mundo ainda não toma decisões nem altera recursos ao longo do tempo.
- Validação visual extensa em outras resoluções e dispositivos, e testes completos de persistência após recarga.

## Fases 2–10

Não iniciadas. Ver `docs/GDD.md` para os critérios de cada fase.
