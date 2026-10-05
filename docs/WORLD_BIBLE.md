# Mundo de Varedor

Extraído integralmente da Bíblia Oficial 2.0. Os dados canônicos de reinos e feudos estão em `src/engine/worldData.ts`. Conteúdo autoral profundo das 49 casas principais e personagens pertence à Fase 2.

# 1. IDENTIDADE DO JOGO

## 1.1 Conceito

Herdeiros do Juramento é um simulador medieval de poder, dinastias, conquista territorial e relações políticas.

O jogador controla o chefe de uma casa nobre relativamente pequena, subordinada a um grão-lorde de um dos sete reinos.

Inicialmente, ele possui apenas uma província, um castelo, alguns assentamentos, uma família e um exército modesto.

Seu objetivo não é necessariamente conquistar o mapa inteiro.

A finalidade é construir e preservar uma dinastia poderosa, utilizando os meios que desejar.

O jogador poderá:

- Expandir seus territórios militarmente.
- Obter terras por casamento.
- Herdar títulos.
- Manipular sucessões.
- Tornar-se um grande comerciante.
- Construir redes políticas.
- Espionar famílias rivais.
- Conquistar o favor do rei.
- Liderar rebeliões.
- Declarar independência.
- Transformar-se em grão-lorde.
- Disputar a coroa.
- Unificar reinos.
- Preservar uma linhagem durante séculos.

Uma casa poderá se tornar muito influente mesmo sem possuir um grande território.

Outra poderá ser militarmente poderosa, mas politicamente isolada.

Outra poderá dominar o comércio marítimo, controlar alimentos ou monopolizar recursos militares.

## 1.2 Inspirações

Utilizar como referências conceituais:

- Crusader Kings: dinastias, relações e política.
- Total War: estratégia militar e formações.
- The Sims: liberdade de relacionamento.
- Game of Thrones: atmosfera de rivalidade feudal, juramentos e traições.

Essas obras não devem ser copiadas.

O mapa, personagens, casas, brasões, símbolos, interface e histórias precisam ser originais.

## 1.3 Estrutura da experiência

O jogador não controla um personagem andando pelo mundo.

Todas as ações ocorrerão por meio de telas, mapas, painéis, retratos, diálogos e decisões.

As batalhas utilizarão uma interface tática top-down.

## 1.4 Ciclo principal de gameplay

O jogo deverá permitir que o jogador:

1. Observe o mundo e identifique oportunidades ou ameaças.
2. Converse, negocie ou investigue personagens.
3. Administre seus territórios.
4. Faça acordos econômicos e militares.
5. Planeje suas ambições.
6. Deixe o tempo avançar.
7. Reaja aos acontecimentos.
8. Ganhe ou perca poder.
9. Transmita seu legado para a geração seguinte.

Esse ciclo deverá ser contínuo e não depender de missões obrigatórias.

---

# 2. ESTRUTURA GEOGRÁFICA E POLÍTICA

## 2.1 Hierarquia territorial oficial

O sistema deverá utilizar quatro níveis.

### REINO

Maior unidade política da estrutura inicial.

Governado por um rei ou rainha.

Possui diversos feudos.

O soberano recebe obrigações de seus grão-lordes, estabelece políticas gerais e pode convocar forças de seus vassalos.

### FEUDO

Grande território dentro de um reino.

Governado por um grão-lorde.

Contém diversas províncias administradas por casas menores, familiares e governadores.

O grão-lorde responde diretamente ao rei.

Os lordes provinciais normalmente respondem ao grão-lorde.

### PROVÍNCIA

Principal unidade de conquista, administração e disputa territorial.

Governada por um lorde, casa ou representante nomeado.

Uma casa pode controlar várias províncias.

O controle de todas as províncias de um feudo não concede automaticamente o título de grão-lorde. Será necessário obter reconhecimento legítimo, usurpar o título ou impor sua autoridade.

### ASSENTAMENTO

Unidade física presente dentro de uma província.

Tipos:

- Castelo.
- Fortaleza.
- Cidade.
- Vila.
- Aldeia.
- Fazenda.
- Mina.
- Porto.
- Mosteiro.
- Entreposto.
- Serraria.
- Torre de vigia.

Assentamentos possuem produção, população, defesa e importância estratégica.

Algumas províncias terão dois castelos; outras terão apenas uma fortificação menor.

## 2.2 Três conceitos distintos de controle

O motor deverá diferenciar:

**Posse de direito:** quem legalmente possui o título.

**Controle de fato:** quem ocupa e administra o território atualmente.

**Suserania:** a quem o detentor deve obediência.

Exemplo:

A Casa Serraval pode ocupar militarmente uma província pertencente à Casa Hadrin, enquanto o título legal continua com a Casa Hadrin.

Um tratado, uma decisão do soberano ou uma usurpação poderá alterar essa situação.

Não transferir automaticamente a propriedade legal apenas porque um exército venceu uma batalha.

## 2.3 Dimensões iniciais do mundo

Criar:

- 7 reinos.
- 42 feudos, sendo seis por reino.
- 252 províncias, aproximadamente seis por feudo.
- Cerca de 1.008 assentamentos iniciais.
- 133 casas nobres iniciais.
- Aproximadamente 650 a 850 personagens nomeados.

A distribuição de assentamentos por província deve variar conforme o terreno e a riqueza local.

O mapa precisa parecer orgânico, não uma grade artificial de regiões idênticas.

A dimensão efetiva dos territórios deverá variar. Alguns feudos poderão ser geograficamente extensos, mas pouco povoados.

---

# 3. CONSTRUÇÃO ORIGINAL DO MUNDO

Criar o continente de **Varedor**.

Ele deverá conter mares, arquipélagos, planícies, florestas, montanhas, vales, regiões áridas, rios navegáveis e fronteiras naturais.

A geografia deve ter influência real sobre política, comércio e guerra.

## 3.1 Os sete reinos

### 1. Reino de Velária

- Casa real: Trevis.
- Capital: Alvenor.
- Especialização: agricultura, administração e grandes mercados.
- Cultura: nobreza tradicional, fortes obrigações feudais.
- Cor política: dourado envelhecido.
- Brasão real: uma torre branca com três janelas sobre campo dourado.
- Conflito histórico: rivalidades por terras férteis e disputas hereditárias.

Seus seis feudos:

1. Lumeira — Casa Dastel.
2. Campos de Viora — Casa Neravel.
3. Três Pontes — Casa Hadrin.
4. Lago do Sino — Casa Elvaren.
5. Vale Cevado — Casa Mercol.
6. Colinas de Bronze — Casa Traviel.

### 2. Reino de Namaris

- Casa real: Velmare.
- Capital: Sarvona.
- Especialização: comércio marítimo, pesca e construção naval.
- Cultura: comerciantes aristocráticos e cidades portuárias influentes.
- Cor política: azul-petróleo.
- Brasão real: três ondas prateadas atravessadas por um disco de cobre.
- Conflito histórico: rivalidade entre a coroa e famílias mercantes.

Feudos:

1. Arquipélago de Sal — Casa Mardel.
2. Coroa das Marés — Casa Nofel.
3. Falésias Azuis — Casa Dael.
4. Portos Brancos — Casa Selmar.
5. Cabo dos Sinos — Casa Lorena.
6. Ilhas Baixas — Casa Kelto.

### 3. Reino de Cársida

- Casa real: Aurden.
- Capital: Karvoss.
- Especialização: mineração, metalurgia e fortificações.
- Cultura: tradição militar, artesãos e fortalezas montanhosas.
- Cor política: cinza-violeta.
- Brasão real: um cinzel atravessando uma montanha dividida.
- Conflito histórico: disputas pelo controle de passagens e minas.

Feudos:

1. Altas Forjas — Casa Brenvek.
2. Pedra Fria — Casa Malgren.
3. Passo do Ferro — Casa Karden.
4. Vale dos Martelos — Casa Odrik.
5. Cristas Altas — Casa Felvar.
6. Minas Velhas — Casa Drenor.

### 4. Reino de Orvêndia

- Casa real: Halven.
- Capital: Verdoss.
- Especialização: madeira, caça, ervas e rios florestais.
- Cultura: comunidades antigas e lealdades familiares tradicionais.
- Cor política: verde-musgo.
- Brasão real: um galho de sete nós.
- Conflito histórico: tensão entre exploração comercial e costumes locais.

Feudos:

1. Mata dos Ecos — Casa Selver.
2. Bosque de Arna — Casa Deln.
3. Rio dos Cedros — Casa Verdan.
4. Fronteira Verde — Casa Talsen.
5. Vale Nebuloso — Casa Renfal.
6. Colinas do Musgo — Casa Ormen.

### 5. Reino de Surnath

- Casa real: Azeren.
- Capital: Damar.
- Especialização: cavalos, pastagens, rotas terrestres e cereais resistentes.
- Cultura: cavaleiros e famílias com forte tradição de mobilidade militar.
- Cor política: terracota.
- Brasão real: um aro prateado atravessado por três lanças.
- Conflito histórico: rivalidade entre nobres rurais e a autoridade central.

Feudos:

1. Planícies de Damar — Casa Ravel.
2. Campos do Vento — Casa Serkan.
3. Passagem Seca — Casa Belcor.
4. Colinas de Areia — Casa Amrien.
5. Vales de Cobre — Casa Sorven.
6. Prado Longo — Casa Tarev.

### 6. Reino de Dunária

- Casa real: Brevane.
- Capital: Venrath.
- Especialização: agricultura de várzea, rotas fluviais e transporte.
- Cultura: política de alianças, famílias tradicionais e controle de pontes.
- Cor política: verde-azulado.
- Brasão real: um feixe de juncos sobre um arco de pedra.
- Conflito histórico: grandes disputas pelo controle dos rios.

Feudos:

1. Baixo Delta — Casa Nelvar.
2. Ponte dos Reis — Casa Borrel.
3. Charcos de Venn — Casa Ervoss.
4. Campos Alagados — Casa Malten.
5. Rios Gêmeos — Casa Derna.
6. Barrancas Altas — Casa Corvel.

### 7. Reino de Tirâmia

- Casa real: Essaren.
- Capital: Soltir.
- Especialização: comércio de caravanas, pedras raras e artesanato.
- Cultura: diplomacia pragmática, pactos comerciais e nobres urbanos.
- Cor política: ocre-avermelhado.
- Brasão real: um arco de pedra sustentando uma estrela de quatro pontas.
- Conflito histórico: famílias enriquecidas disputam prestígio com a nobreza antiga.

Feudos:

1. Passos de Soltir — Casa Morven.
2. Desfiladeiro Claro — Casa Talrik.
3. Mesa Vermelha — Casa Bralen.
4. Rota dos Sinos — Casa Eldran.
5. Pedra do Sol — Casa Arvel.
6. Vale das Caravanas — Casa Lendor.

## 3.2 Organização política inicial

Cada reino terá:

- Uma casa real.
- Seis casas grão-senhoriais.
- Doze casas provinciais principais.
- Outras ramificações familiares, oficiais e governadores.

Total: sete casas reais, 42 grandes casas feudais e 84 casas provinciais, correspondendo a 133 casas iniciais.

As províncias restantes poderão ser governadas por outros membros dessas casas, em vez de cada província necessariamente possuir uma família diferente.

O chefe de uma casa poderá acumular diferentes títulos.

## 3.3 História e identidade das casas

Todas as casas precisam ter:

- Brasão próprio.
- Lema próprio.
- História de fundação.
- Pelo menos três acontecimentos familiares históricos.
- Uma tradição ou característica marcante.
- Uma ambição atual.
- Pelo menos uma relação política significativa com outra casa.
- Personagens nomeados.
- Árvore genealógica coerente.
- Castelo ancestral ou sede familiar.

Para as 49 casas reais e grão-senhoriais, escrever conteúdo autoral consistente com a história de seu reino.

Para as casas provinciais, gerar histórias determinísticas combinando acontecimentos históricos, personagens e eventos regionais.

Os resultados devem ser únicos, mas coerentes.

**Proibido gerar 84 casas com a mesma história, alterando apenas os nomes.**

Criar verificações para impedir repetição excessiva de lemas, símbolos, nomes e acontecimentos.

Cada reino terá pelo menos três tensões políticas preexistentes, sem obrigatoriedade de virarem guerras.

---

# 4. Reino de Orvêndia

- Casa real: Halven.
- Capital: Verdoss.
- Especialização: madeira, caça, ervas e rios florestais.
- Cultura: comunidades antigas e lealdades familiares tradicionais.
- Cor política: verde-musgo.
- Brasão real: um galho de sete nós.
- Conflito histórico: tensão entre exploração comercial e costumes locais.

Feudos:

1. Mata dos Ecos — Casa Selver.
2. Bosque de Arna — Casa Deln.
3. Rio dos Cedros — Casa Verdan.
4. Fronteira Verde — Casa Talsen.
5. Vale Nebuloso — Casa Renfal.
6. Colinas do Musgo — Casa Ormen.

### 5. Reino de Surnath

- Casa real: Azeren.
- Capital: Damar.
- Especialização: cavalos, pastagens, rotas terrestres e cereais resistentes.
- Cultura: cavaleiros e famílias com forte tradição de mobilidade militar.
- Cor política: terracota.
- Brasão real: um aro prateado atravessado por três lanças.
- Conflito histórico: rivalidade entre nobres rurais e a autoridade central.

Feudos:

1. Planícies de Damar — Casa Ravel.
2. Campos do Vento — Casa Serkan.
3. Passagem Seca — Casa Belcor.
4. Colinas de Areia — Casa Amrien.
5. Vales de Cobre — Casa Sorven.
6. Prado Longo — Casa Tarev.

### 6. Reino de Dunária

- Casa real: Brevane.
- Capital: Venrath.
- Especialização: agricultura de várzea, rotas fluviais e transporte.
- Cultura: política de alianças, famílias tradicionais e controle de pontes.
- Cor política: verde-azulado.
- Brasão real: um feixe de juncos sobre um arco de pedra.
- Conflito histórico: grandes disputas pelo controle dos rios.

Feudos:

1. Baixo Delta — Casa Nelvar.
2. Ponte dos Reis — Casa Borrel.
3. Charcos de Venn — Casa Ervoss.
4. Campos Alagados — Casa Malten.
5. Rios Gêmeos — Casa Derna.
6. Barrancas Altas — Casa Corvel.

### 7. Reino de Tirâmia

- Casa real: Essaren.
- Capital: Soltir.
- Especialização: comércio de caravanas, pedras raras e artesanato.
- Cultura: diplomacia pragmática, pactos comerciais e nobres urbanos.
- Cor política: ocre-avermelhado.
- Brasão real: um arco de pedra sustentando uma estrela de quatro pontas.
- Conflito histórico: famílias enriquecidas disputam prestígio com a nobreza antiga.

Feudos:

1. Passos de Soltir — Casa Morven.
2. Desfiladeiro Claro — Casa Talrik.
3. Mesa Vermelha — Casa Bralen.
4. Rota dos Sinos — Casa Eldran.
5. Pedra do Sol — Casa Arvel.
6. Vale das Caravanas — Casa Lendor.

## 3.2 Organização política inicial

Cada reino terá:

- Uma casa real.
- Seis casas grão-senhoriais.
- Doze casas provinciais principais.
- Outras ramificações familiares, oficiais e governadores.

Total: sete casas reais, 42 grandes casas feudais e 84 casas provinciais, correspondendo a 133 casas iniciais.

As províncias restantes poderão ser governadas por outros membros dessas casas, em vez de cada província necessariamente possuir uma família diferente.

O chefe de uma casa poderá acumular diferentes títulos.

## 3.3 História e identidade das casas

Todas as casas precisam ter:

- Brasão próprio.
- Lema próprio.
- História de fundação.
- Pelo menos três acontecimentos familiares históricos.
- Uma tradição ou característica marcante.
- Uma ambição atual.
- Pelo menos uma relação política significativa com outra casa.
- Personagens nomeados.
- Árvore genealógica coerente.
- Castelo ancestral ou sede familiar.

Para as 49 casas reais e grão-senhoriais, escrever conteúdo autoral consistente com a história de seu reino.

Para as casas provinciais, gerar histórias determinísticas combinando acontecimentos históricos, personagens e eventos regionais.

Os resultados devem ser únicos, mas coerentes.

**Proibido gerar 84 casas com a mesma história, alterando apenas os nomes.**

Criar verificações para impedir repetição excessiva de lemas, símbolos, nomes e acontecimentos.

Cada reino terá pelo menos três tensões políticas preexistentes, sem obrigatoriedade de virarem guerras.

---
