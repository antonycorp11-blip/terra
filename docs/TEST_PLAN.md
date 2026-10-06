# Plano de testes

A bateria valida a geografia realista, o ciclo jogável do MVP (`docs/MVP_SCOPE.md`) e os três caminhos de conquista.

## Cobertura atual

`src/engine/world.test.ts` (Vitest): 7 reinos, 42 feudos, 252 províncias, 1.008 assentamentos, 133 casas; toda célula de terra pertence a uma província; assentamentos dentro da província; vizinhança recíproca e conectada; reinos e feudos contíguos; rios seguindo a drenagem; ilhas sem vizinhos terrestres; rotas marítimas sobre água; tamanhos variados (maior/menor > 15) e províncias alongadas; determinismo; calendário; migração da geografia 3; audiência de Pontevela.

`src/engine/mvp.test.ts` (Vitest): criação da casa; conhecimento inicial (feudo conhecido, fronteiras avistadas); expedições; economia (+80/+90/+45/+15); obras; diplomacia; espionagem; conversas; persistência e determinismo; campanha de 180 dias com ida e volta pelo salvamento.

`src/engine/conquest.test.ts` (Vitest):

- **Militar**: recrutamento com custo e limite de população; marcha, cerco, decisão de assalto, cerco prolongado, vitória com três fases, rendição e juramento (as terras passam ao jogador, guarnição, governo, renda maior, recrutamento na terra nova, ameaça), ida e volta pelo salvamento; ataque sem justificativa custa renome e ameaça; tropas só se deslocam no próprio território.
- **Diplomacia**: comércio recusado sem ofertas com contraproposta e devolução; comércio, aliança e vassalagem por tratado com proteção a quem se sente ameaçado; vassalagem bloqueada sem força em armas; a proposta só passa depois de meses de corte.
- **Influência**: banquete com intervalo, compra de dívida como laço, patrocínio, ganho decrescente perto do juramento, cerimônia de juramento.
- **Reações**: convocação, advertência, ultimato, guerra e defesa decidida pela muralha; oferta da coroa e proteção contra a guerra; ascensão a grão-lorde com quatro casas e o reconhecimento.
- **Viagem e comércio**: viagem pessoal revela e estabelece contato; Ardesh recusa vender pedra; compra de prata; inverno sem sal estraga grãos.

`src/engine/depth.test.ts` (Vitest): acontecimentos a cada poucos dias com consequência (8+ em 120 dias); guerra de Ardesh contra Hadrin no dia 40 e sucessão do grão-lorde; crescimento mensal da população com fatores; imposto alto rende mais e custa lealdade; governador; obras em níveis com custo crescente e quartel aumentando o recrutamento; desgaste do cerco e socorro do suserano; migração da revisão 2.

`src/engine/party.test.ts` (Vitest): comitiva inicial e escoltas do reino; bando e pedido de ajuda no primeiro turno; alcance de 2 movimentos e revelação; viagem em vários turnos; `endTurn` (7 dias, ordens, movimentos, bloqueio com decisão aberta); ordens esgotadas; troca de homens com a guarnição; conversa só em pessoa; combate com bando, saque e recompensa; derrota e volta para casa; saque de terra mal guardada; captura de lorde e juramento do prisioneiro; cerco com a comitiva, levantar o cerco e volta dos sobreviventes; movimento determinístico de lordes e bandos.

`tests/e2e/map.spec.ts` (Playwright):

- Criação da casa em três etapas e cena de abertura.
- Comitiva: tocar em Irian mostra os marcadores, mover gasta movimentos, encerrar o turno renova.
- Lordes de corpo inteiro no mapa; carta da casa com figura; as quatro visões mudam o mapa e a carta; filtro de recurso; zoom sem recentralizar.
- Conquista militar completa na interface, respondendo acontecimentos e cartas pelo caminho: marcha, cerco, tática, batalha animada, rendição, o lorde vencido sai do mapa, o estandarte do jogador aparece e a terra nova aceita imposto.
- Conversa com o duário mostrando a segunda consciência, o intervalo de repetição e o assunto "Do que precisam".
- Um acontecimento pausa o tempo e é resolvido.
- Convocação pausando o tempo.
- Salvar e carregar.
- Celular em paisagem (844×390) sem rolagem horizontal e com HUD sem sobreposição.

# 29. TESTES OBRIGATÓRIOS

Criar testes automatizados para:

## Mundo

- Geração das 252 províncias.
- Associação das províncias aos 42 feudos.
- Associação dos feudos aos sete reinos.
- Criação coerente de assentamentos.
- Conectividade geográfica.
- Persistência dos identificadores.

## Personagens

- Envelhecimento.
- Nascimento.
- Casamento.
- Filiação.
- Morte.
- Herança.
- Mudança de relações.
- Memórias históricas.

## Política

- Vassalagem.
- Contratos.
- Títulos.
- Alianças.
- Traições.
- Rebeliões.
- Sucessão.
- Mudança de soberano.

## Economia

- Produção.
- Consumo.
- Comércio.
- Construções.
- Bloqueios.
- Custos militares.
- Escassez.

## Guerra

- Recrutamento.
- Movimentação.
- Batalhas.
- Moral.
- Fadiga.
- Fuga.
- Cercos.
- Ocupação.
- Rendição.
- Tratados.

## Inteligência artificial

- Planejamento.
- Avaliação de risco.
- Reação a ameaças.
- Diplomacia.
- Casamentos.
- Espionagem.
- Reorganização após derrotas.
- Mudança de objetivos.

## Simulação prolongada

Executar testes automáticos de campanhas de:

- 1 ano.
- 10 anos.
- 25 anos.
- 50 anos.
- 100 anos.

As campanhas não deverão produzir estados políticos ou genealógicos impossíveis.

Implementar testes de estabilidade, desempenho e determinismo.

---

# 30. FASES DE IMPLEMENTAÇÃO

O jogo completo será desenvolvido em dez fases.

Cada fase deverá possuir critérios de conclusão verificáveis.

## FASE 1 — FUNDAÇÃO E MAPA

Construir:

- Estrutura do projeto.
- Motor básico de simulação.
- Calendário.
- Sete reinos.
- 42 feudos.
- 252 províncias.
- Assentamentos.
- Casas iniciais.
- Geografia.
- Fronteiras.
- Mapa interativo.
- Navegação territorial.
- HUD definitivo.
- Sistema inicial de save.

**Critério de conclusão:** abrir o jogo, navegar pelo mundo, selecionar qualquer província, visualizar corretamente sua hierarquia e avançar o tempo sem inconsistências.

## FASE 2 — PERSONAGENS E CASAS

Implementar:

- Personagens.
- Brasões.
- Retratos.
- História das casas.
- Membros familiares.
- Atributos.
- Traços.
- Ambições.
- Relações.
- Localizações.
- Memórias.

**Critério:** cada casa poderá ser inspecionada e seus personagens possuirão estados persistentes e coerentes.

## FASE 3 — ECONOMIA E DOMÍNIOS

Implementar:

- Recursos.
- Produção.
- Construções.
- População.
- Comércio.
- Infraestrutura.
- Impostos.
- Administração.
- Despesas.

**Critério:** avançar vários anos produzirá alterações econômicas consistentes, permitindo melhorias e consequências.

## FASE 4 — VIDA SOCIAL E FAMÍLIA

Implementar:

- Conversas.
- Interações.
- Romance adulto.
- Casamentos.
- Filhos.
- Educação.
- Árvore genealógica.
- Envelhecimento.
- Sucessão.

**Critério:** uma linhagem deverá conseguir atravessar gerações completas.

## FASE 5 — POLÍTICA E DIPLOMACIA

Implementar:

- Contratos feudais.
- Favores.
- Promessas.
- Tratados.
- Alianças.
- Títulos.
- Reivindicações.
- Facções.
- Rebeliões.
- Concessão de terras.

**Critério:** permitir ampliar o domínio por meios políticos e hereditários, além de meios militares.

## FASE 6 — ESPIONAGEM

Implementar:

- Agentes.
- Redes.
- Operações.
- Informações.
- Segredos.
- Conspirações.
- Contraespionagem.

**Critério:** permitir descobrir ou ocultar planos políticos e militares com efeitos reais na simulação.

## FASE 7 — GUERRAS E CAMPANHAS

Implementar:

- Exércitos.
- Recrutamento.
- Comandantes.
- Suprimentos.
- Deslocamentos.
- Declarações de guerra.
- Ocupações.
- Cercos.
- Tratados de paz.

**Critério:** uma guerra poderá começar, evoluir e terminar alterando legalmente territórios ou relações políticas.

## FASE 8 — BATALHAS TÁTICAS

Implementar:

- Campo top-down.
- Formações.
- Soldados procedurais.
- Comandos.
- Inteligência tática.
- Moral.
- Combate.
- Retirada.
- Resultados persistentes.

**Critério:** permitir disputar batalhas manuais completas, com resultados sincronizados à campanha.

## FASE 9 — IA COMPLETA E EVENTOS

Aprimorar:

- Objetivos das casas.
- Planejamento de longo prazo.
- Intrigas.
- Decisões diplomáticas.
- Economia autônoma.
- Guerras entre terceiros.
- História emergente.
- Memória histórica.

**Critério:** o mundo continuará produzindo acontecimentos relevantes sem depender do jogador.

## FASE 10 — POLIMENTO FINAL

Executar:

- Revisão completa da interface.
- Refinamento visual.
- Responsividade.
- Animações.
- Otimização.
- Equilíbrio.
- Correções.
- Testes de campanhas longas.
- Melhorias de usabilidade.
- Revisão de conteúdo.
- Validação do salvamento.

**Critério:** todas as funcionalidades descritas nesta Bíblia estarão implementadas, conectadas, testadas e utilizáveis.

---
