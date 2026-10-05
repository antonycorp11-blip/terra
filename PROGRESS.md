# Progresso real

## MVP jogável — Descobrir · Influenciar · Conquistar: concluído em 05/10/2026

Escopo detalhado e valores em `docs/MVP_SCOPE.md`. A visão final continua em `docs/GDD.md`.

### Implementado

- **Fundação da casa**: Nova Campanha em três etapas (nome com prefixo "Casa" e validações; brasão SVG com 8 divisões, 16 símbolos originais, 12 cores e prévia ao vivo; resumo inicial). A casa é personalizada mantendo Velária › Três Pontes › Pontevela › Castelo da Ponte Alta. As buscas por "Casa Serraval" foram trocadas por `playerHouseId` e `seatProvinceId`.
- **Interface única**: mapa, HUD com recursos e saldos mensais, três modos na base, painel contextual (lateral no desktop; gaveta recolhível em paisagem; folha inferior em retrato), sino de notificações com clique que leva ao local, menu com salvar, carregar, crônica e ajuda. Tela de título com Continuar, Nova Campanha e Carregar.
- **Mapa**: zoom contínuo (roda, pinça e botões) com nível de detalhe progressivo; bordas de reino grossas na cor do reino, de feudo intermediárias e tracejadas, de província finas; destaque da sede e da seleção; realce ao passar o mouse; ícones para todos os tipos de assentamento (minas, serrarias, fazendas e entrepostos ganharam ícones vetoriais); marcadores de expedição com progresso e caminhante na rota, emissários, selos diplomáticos coloridos pela relação, espiões e guarnições; mini-mapa com névoa.
- **Correções do mapa**: a geometria fica memorizada por semente (os contornos fundidos não são mais recalculados a cada dia); o tick do calendário não move a câmera; a roda do mouse usa ouvinte não passivo; o arraste não seleciona províncias.
- **Névoa**: quatro níveis (desconhecida, avistada, explorada, investigada); névoa texturizada fundida por união de polígonos, com bordas suaves; véu leve sobre as terras avistadas; animação de revelação quando uma província é explorada.
- **Expedições**: custos, duração por rota e terreno, alcance só por terra conhecida, até duas simultâneas, achados determinísticos extraídos dos dados reais e novas fronteiras avistadas.
- **Economia e investimentos**: balanço mensal (+80 ouro, +90 alimentos, +45 madeira, +15 ferro), manutenção de espiões, receita de comércio, eventos locais a cada 60 dias; Fazendas, Mercado e Mina com custo, prazo, andamento, benefício permanente e registro na história.
- **Diplomacia**: emissário com relação inicial explicada (temperamento, rivalidade, coroa, interesses, ambição, reputação, distância, espionagem descoberta); presente, aproximação, audiência e comércio com intervalos e condições reais.
- **Personagens**: governante e conselheiro para cada uma das 133 casas, corte de Pontevela e quatro candidatos a agente, todos com IDs persistentes, atributos, traços, retratos SVG modulares, confiança, respeito, amizade e memória. Conversas com seis assuntos, respostas conforme o temperamento, a relação e a memória, intervalos e consequências.
- **Espionagem**: contratação (90 ouro, 6/mês, até 3), missões de investigação com resultado determinístico (sucesso, parcial, nada, identificado) e relatórios com data, fonte, confiança e validade, visíveis nos painéis e no arquivo.
- **Conquistar**: forças, cavalos, ferro, guarnições próprias e conhecidas, com aviso explícito de que batalhas estão em desenvolvimento e nenhuma ação falsa.
- **Tempo e notificações**: cada dia processa todos os sistemas; o jogo pausa sozinho só para resultados que abrem decisões; simulação determinística (vários dias de uma vez equivalem a dias um a um).
- **Persistência**: `GameState` versão 2 com `campaign`; migração de salvamentos da versão 1; autosave na fundação e a cada 30 dias.

### Validação em 05/10/2026

- `npm test`: 26 testes (8 de geografia, 18 do MVP, incluindo a campanha de 180 dias).
- `npm run test:ui`: 7 fluxos Playwright, incluindo o ciclo completo com salvar e carregar e o celular em paisagem a 844×390.
- `npm run build`: sem erros.
- Inspeção visual a 1440×860, 844×390 e 390×844.

### Limitações conhecidas

- Expedições não encontram ruínas, porque o mundo ainda não as registra; o resultado nunca é inventado.
- As outras casas não agem por conta própria; relações só mudam por ações do jogador ou eventos ligados a ele.
- Cada investimento tem um único nível.
- O retrato no celular é usável, mas a experiência foi otimizada para paisagem.
- Na criação, a geração do mundo leva cerca de 1 s no navegador.


## Fase 1 — Fundação e mapa: em andamento

### Implementado

- Projeto React + TypeScript + Vite, CSS modular, Zustand, IndexedDB, Vitest e Playwright.
- Geração determinística de um continente com 7 reinos, 42 feudos, 252 províncias, 1.008 assentamentos e 133 casas. Reinos e feudos recebem quantidades variáveis de províncias. As áreas continentais são contíguas e as ilhas possuem vínculos administrativos marítimos explícitos.
- Continente com golfo central aberto ao oceano, penínsulas e 16 ilhas tituladas; polígonos provinciais por Voronoi recortado ao litoral, sem lacunas de cobertura; vizinhança, rios descendentes e rede de estradas; busca de caminhos territorial com custo de terreno.
- Separação explícita entre casa titular, governante, ocupante e suserano.
- Casa Serraval em Pontevela, com capital, população, tesouro, estoques e força mobilizável iniciais.
- Direção visual de mapa político de grande estratégia: cores uniformes dos reinos, nomes cartográficos curvos, fronteiras finas, textura discreta e capitais/portos menores. Vegetação e montanhas ilustradas foram retiradas conforme a orientação de 05/10/2026. O atlas fornece apenas construções e embarcações; há reservas espaciais para os rótulos.
- Oito barcos animados em trajetos navegáveis sobre água, com redução de movimento. Ambientação visual, sem transporte comercial simulado.
- Mapa SVG navegável (na Fase 1 em quatro escalas por cliques; substituído pelo zoom contínuo do MVP).
- Cores políticas, fronteiras contínuas, brasões, capitais, castelos e mini-mapa (a tela inicial foi substituída pela tela de título e pela criação da casa do MVP).
- Vista móvel em tela cheia, com arraste por toque, mini-mapa e painel contextual inferior.
- Entrada em Pontevela com dados reais do domínio, crônica local e uma audiência inicial com duas escolhas que alteram alimentos, ouro, prestígio e lealdade.
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
- Conteúdo autoral das 49 casas principais e histórias individualizadas (os personagens básicos já existem no MVP).
- Simulação política autônoma: as outras casas ainda não tomam decisões. A economia do jogador já é simulada pelo MVP.
- Validação visual extensa em outras resoluções e dispositivos, e testes completos de persistência após recarga.

## Fases 2–10

O MVP antecipou versões iniciais de personagens, economia do domínio, diplomacia e espionagem; os demais itens de cada fase não foram iniciados. Ver `docs/GDD.md` para os critérios de cada fase.
