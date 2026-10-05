# Plano de testes

A bateria atual valida os invariantes territoriais e a navegação fundamental da Fase 1. Os testes das fases 2–10 permanecem pendentes até que os sistemas correspondentes existam.

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
