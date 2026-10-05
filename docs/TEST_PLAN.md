# Plano de testes

A bateria atual valida os invariantes territoriais da Fase 1 e o ciclo jogável do MVP (`docs/MVP_SCOPE.md`). Os testes dos sistemas ainda não implementados das fases 2–10 permanecem pendentes.

## Cobertura atual

`src/engine/world.test.ts` (Vitest) cobre a geografia: 7 reinos, 42 feudos, 252 províncias, 1.008 assentamentos, 133 casas, cobertura sem lacunas, vizinhança recíproca e conectada, ilhas, rotas marítimas, rios descendentes, determinismo, calendário, migração geográfica e a audiência de Pontevela.

`src/engine/mvp.test.ts` (Vitest) cobre:

- **Criação da casa**: nome, brasão, cores, persistência, IDs estáveis, validações e bloqueio após o dia 0.
- **Exploração**: névoa inicial, alcance, custos, duração, limite de duas expedições, revelação, achados reais e persistência.
- **Economia**: saldo mensal de +80/+90/+45/+15, desconto dos investimentos, conclusão, benefícios permanentes e falta de recursos.
- **Diplomacia**: pré-requisito de exploração, primeiro contato com as razões da relação, personalidades distintas entre vizinhos, presente com intervalo, aproximação, comércio e recusa quando hostil.
- **Espionagem**: custo, limite de três, manutenção, alcance, resultados de sucesso e de falha, e relatórios com fonte, confiança e validade.
- **Personagens**: contato obrigatório, efeitos na relação, memória, intervalo de repetição e respostas conforme o temperamento.
- **Persistência e determinismo**: expedições, obras e missões em andamento recuperadas com o mesmo resultado futuro; N dias de uma vez iguais a N avanços de um dia; migração da versão 1.
- **Campanha de 180 dias**: recursos finitos e não negativos, 6 balanços, obras concluídas, ações sem atraso, relações dentro dos limites e ida e volta pelo salvamento.

`tests/e2e/map.spec.ts` (Playwright) cobre:

- Criação da casa em três etapas, com validação e prévia do brasão.
- Mapa com 252 províncias, névoa, bordas de reino e de feudo, destaque da sede e das fronteiras exploráveis, ícones de todos os tipos de assentamento, zoom pela roda, arraste e câmera estável enquanto o tempo corre.
- Ciclo completo do MVP (investir, explorar, revelar, enviar emissário, dar presente, conversar, contratar espião, receber relatório, salvar, recarregar e carregar).
- Cena da audiência no castelo e guarnição de Pontevela.
- Modo Conquistar sem ações militares.
- Celular em paisagem (844×390) com painel compacto recolhível e sem rolagem horizontal.
- Arte do atlas e barcos animados respeitando o movimento reduzido.

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
