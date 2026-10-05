# HERDEIROS DO JURAMENTO
## BÍBLIA OFICIAL DE DESENVOLVIMENTO — VERSÃO 2.0
### Simulador de dinastias, política e conquista medieval

# 0. INSTRUÇÕES FUNDAMENTAIS PARA O CODEX

Você é o programador principal, arquiteto de software, game designer e diretor técnico de um jogo medieval de grande estratégia para navegador.

Este documento contém a especificação oficial do jogo. Sua responsabilidade é implementar todos os sistemas descritos, preservando a integridade das regras, a qualidade visual e a profundidade da simulação.

**Este projeto não é um MVP.**

A implementação ocorrerá progressivamente, mas o produto final deverá conter integralmente os sistemas definidos nesta documentação.

As fases são etapas de desenvolvimento, não justificativas para eliminar recursos ou transformar o projeto em uma demonstração superficial.

## Princípios inegociáveis

1. Todas as mecânicas devem interagir entre si.
2. O mundo deve continuar evoluindo independentemente do jogador.
3. Todos os personagens nomeados e vivos devem ter identidade própria e possibilidades reais de interação.
4. Não existirão histórias obrigatórias ou campanhas lineares.
5. Conquistas territoriais deverão respeitar as regras militares, políticas e hereditárias.
6. As decisões deverão produzir consequências imediatas e de longo prazo.
7. A interface deve ser bonita e relativamente simples de compreender.
8. Todos os elementos visuais devem priorizar CSS e SVG procedural.
9. Não utilizar botões falsos, sistemas decorativos ou números aleatórios que simulem funcionalidades inexistentes.
10. Não transformar a experiência num jogo exclusivamente de gerenciamento de recursos.
11. Salvar e carregar deve preservar todo o estado do mundo.
12. Não criar mecânicas que exijam microgerenciamento desnecessário.
13. Todos os sete reinos precisam permanecer ativos, com personagens, economia, política e guerras próprias.
14. O mundo precisa ter uma memória histórica.
15. Uma sessão de jogo deverá poder durar várias gerações, potencialmente centenas de anos.

**A principal regra de design é: profundidade nas consequências, simplicidade nas ações.**

---

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

# 4. COMEÇO DA CAMPANHA

O jogo deverá iniciar no ano 128 da Era do Pacto.

O jogador controlará inicialmente a **Casa Serraval**.

## 4.1 Situação inicial

- Reino: Velária.
- Feudo: Três Pontes.
- Suserano: grão-lorde da Casa Hadrin.
- Província: Pontevela.
- Capital: Castelo da Ponte Alta.
- Economia: agricultura, pedágios fluviais e comércio local.
- Condição política: casa provincial de influência moderada.
- Situação militar: relativamente fraca.
- Brasão: ponte prateada sobre fundo verde-petróleo.
- Lema: "O que construímos permanece."

O jogador começará com:

- Um castelo.
- Duas pequenas vilas.
- Um entreposto fluvial.
- População aproximada de 6.200 pessoas.
- 700 moedas de ouro.
- Estoques modestos de alimentos, madeira, ferro e cavalos.
- Aproximadamente 325 soldados mobilizáveis.
- Obrigações tributárias e militares com seu grão-lorde.

## 4.2 Personagem inicial

Lorde Irian Serraval.

- Idade: 29 anos.
- Estado civil: solteiro.
- Formação: administração provincial e experiência militar limitada.
- Personalidade inicial: configurável dentro de limites equilibrados.
- Família: mãe viva, irmão mais jovem e irmã adulta.
- Herdeiro provisório: irmão mais jovem.
- Prestígio moderado.
- Poucos aliados externos.

Permitir ao jogador personalizar nome, aparência, características iniciais limitadas e identidade de seu lorde, mantendo a situação política da campanha.

Também poderá manter o personagem padrão.

## 4.3 Contexto inicial

O reino atravessa um período de relativa estabilidade, mas existem:

- Uma disputa comercial entre duas casas.
- Rivalidades locais por fronteiras provinciais.
- Descontentamento com impostos.
- Rumores de uma possível campanha militar.
- Oportunidades de casamento.
- Rivalidades entre possíveis herdeiros de títulos.

Esses elementos devem existir como condições iniciais do mundo.

**Não transformar esses acontecimentos em missões obrigatórias ou eventos com resultados previamente escritos.**

O jogador deverá escolher livremente como agir.

---

# 5. O MAPA E SUAS CAMADAS

O mapa é uma das principais interfaces do jogo.

Desenvolver um sistema geográfico navegável, bonito e capaz de representar centenas de regiões simultaneamente.

## 5.1 Geografia procedural

Usar uma semente fixa para criar um mapa inicial persistente.

A geração deverá utilizar:

- Máscara continental orgânica.
- Elevação.
- Umidade.
- Temperatura.
- Hidrografia.
- Distribuição de biomas.
- Áreas habitáveis.
- Regiões produtivas.
- Fronteiras políticas.
- Malha de caminhos.

Não utilizar simples blocos retangulares ou hexágonos visíveis como geografia definitiva.

A construção pode combinar ruído procedural, triangulações, diagramas de Voronoi adaptados, suavização de polígonos e regras geográficas.

Rios precisam seguir desníveis coerentes.

Montanhas devem influenciar passagens e fronteiras.

Os mares precisam separar efetivamente regiões.

Armazenar polígonos e relações de vizinhança para garantir persistência.

## 5.2 Camadas de visualização

### Mapa dos Reinos

Mostrar o continente inteiro.

Exibir os sete reinos, capitais, fronteiras políticas, rotas importantes e regiões em conflito.

### Mapa dos Feudos

Ao aproximar ou selecionar um reino, exibir os seis feudos desse reino.

Mostrar seus grão-lordes, capitais e relações de fidelidade.

### Mapa das Províncias

Esta é a visualização estratégica principal.

Mostrar as províncias, seus lordes, castelos, exércitos, estradas e locais economicamente relevantes.

As províncias precisam de fronteiras individuais claramente identificáveis.

### Mapa de Assentamentos

Mostrar as unidades internas de uma província.

O jogador poderá selecionar castelos, vilas, minas, fazendas e outros pontos de interesse.

## 5.3 Modos políticos do mapa

Criar filtros para:

1. Reinos.
2. Feudos.
3. Casas governantes.
4. Vassalagem.
5. Alianças.
6. Guerras.
7. Lealdade.
8. Economia e recursos.
9. Cultura.
10. Religiões e tradições locais.
11. Reivindicações.
12. Inteligência militar.
13. Rotas comerciais.
14. Fortificações.
15. Ocupação militar.

As camadas devem alterar efetivamente a representação do mapa.

## 5.4 Interatividade

Implementar zoom, arraste, seleção, destaque, mini-mapa, centralização, busca territorial e indicação de fronteiras.

No zoom distante, renderizar apenas informações importantes.

No zoom próximo, mostrar assentamentos e detalhes geográficos.

Exércitos deverão ser visíveis como marcadores posicionados espacialmente.

Não renderizar milhares de construções detalhadas quando o jogador estiver visualizando o continente inteiro.

## 5.5 Movimentação

Criar uma malha de deslocamento baseada em:

- Províncias vizinhas.
- Estradas.
- Passagens de montanha.
- Pontes.
- Rios navegáveis.
- Portos.
- Travessias marítimas.
- Controle militar.
- Terreno e clima.

Utilizar busca de caminhos com custos diferentes.

Um exército não poderá atravessar livremente montanhas, mares ou territórios bloqueados.

---

# 6. CASAS NOBRES E ADMINISTRAÇÃO

Cada casa terá sua própria gestão interna.

## 6.1 Dados fundamentais

Cada casa possuirá:

- Identificador persistente.
- Nome.
- Fundação.
- Brasão.
- Lema.
- História.
- Membros.
- Chefe atual.
- Herdeiros.
- Sede.
- Títulos.
- Territórios.
- Tesouro.
- Produção.
- Exército.
- Prestígio.
- Influência.
- Reputação.
- Alianças.
- Rivalidades.
- Obrigações.
- Planos.
- Memórias históricas.

## 6.2 Conselheiros

O jogador poderá nomear personagens para cargos como:

- Chanceler.
- Tesoureiro.
- Mestre de armas.
- Mestre dos espiões.
- Administrador do domínio.
- Diplomata.
- Tutor dos herdeiros.

Cada conselheiro terá habilidades, ambições e lealdade.

Conselheiros competentes melhoram seus respectivos sistemas.

Entretanto, personagens com interesses conflitantes podem manipular informações, favorecer familiares, enriquecer ilicitamente ou conspirar.

Um conselheiro não é apenas um modificador numérico.

Ele permanece um personagem completo e pode ser abordado, demitido, promovido, investigado ou recompensado.

## 6.3 Corte e cargos familiares

Permitir nomear familiares para posições administrativas e militares.

Um parente poderá desejar determinado território ou título.

Distribuir terras pode aumentar lealdade, mas também criar novas concentrações de poder.

## 6.4 Autoridade e legitimidade

Separar:

- Prestígio pessoal.
- Reputação da casa.
- Influência política.
- Legitimidade de títulos.
- Autoridade sobre vassalos.

Esses valores têm efeitos distintos.

Um governante prestigiado pode ter pouca influência na corte real.

Um usurpador poderoso pode controlar militarmente o território, mas sofrer forte resistência política.

---

# 7. PERSONAGENS VIVOS

Todos os personagens deverão existir no sistema de simulação, mesmo quando não estiverem em primeiro plano.

## 7.1 Dados pessoais

Cada personagem terá:

- Nome e sobrenome.
- Idade e data de nascimento.
- Aparência.
- Família.
- Pai e mãe reconhecidos.
- Filiação biológica, quando relevante.
- Legitimidade.
- Localização.
- Cultura.
- Saúde.
- Estado civil.
- Cônjuge.
- Histórico de casamentos.
- Filhos.
- Traços.
- Habilidades.
- Ambições.
- Medos.
- Relações.
- Memórias.
- Segredos.
- Títulos.
- Ocupação.
- Estado de vida.

Personagens morrerão, nascerão, mudarão de residência e poderão ascender socialmente.

## 7.2 Atributos

Escala inicial de 0 a 100:

- Diplomacia.
- Carisma.
- Administração.
- Comando.
- Estratégia.
- Intriga.
- Inteligência.
- Coragem.

Atributos devem evoluir lentamente mediante experiência, educação e acontecimentos.

Não criar um sistema em que o jogador simplesmente compra pontos de habilidade com dinheiro.

## 7.3 Personalidade

Cada personagem terá de dois a cinco traços de personalidade predominantes.

Exemplos:

- Ambicioso.
- Leal.
- Honrado.
- Cruel.
- Generoso.
- Egoísta.
- Vingativo.
- Romântico.
- Ganancioso.
- Prudente.
- Corajoso.
- Covarde.
- Manipulador.
- Devoto.
- Orgulhoso.
- Ciumento.

Traços podem entrar em conflito.

Um personagem poderá ser honrado, mas extremamente ambicioso.

A inteligência artificial deverá considerar esses conflitos.

## 7.4 Ambições pessoais

Personagens poderão desejar:

- Casar.
- Ter filhos.
- Tornar-se herdeiros.
- Conquistar terras.
- Vingar um familiar.
- Obter um cargo.
- Enriquecer.
- Conseguir independência.
- Ganhar prestígio militar.
- Proteger seus filhos.
- Destruir uma família rival.

Ambições podem surgir, desaparecer ou mudar.

## 7.5 Localização e acesso

O jogador poderá interagir com qualquer personagem nomeado, respeitando sua condição atual.

Personagens próximos poderão participar de audiências diretas.

Personagens distantes poderão receber cartas, convites ou enviados.

Viagens e mensagens terão duração.

Um personagem preso, desaparecido ou em campanha militar terá possibilidades de interação limitadas pelo contexto.

---

# 8. SISTEMA DE RELACIONAMENTO SOCIAL

Este sistema deverá ter profundidade semelhante a um simulador social, mas funcionar por cards e menus.

## 8.1 Dimensões de relacionamento

Cada relação entre dois personagens deverá armazenar separadamente:

- Amizade: -100 a 100.
- Confiança: -100 a 100.
- Respeito: -100 a 100.
- Atração: 0 a 100.
- Amor: 0 a 100.
- Medo: 0 a 100.
- Ressentimento: 0 a 100.
- Lealdade política: -100 a 100.

Relações não devem ser necessariamente simétricas.

Exemplo:

O lorde respeita um cavaleiro, mas esse cavaleiro o despreza.

## 8.2 Interações

Menu social:

- Cumprimentar.
- Conversar.
- Perguntar sobre a família.
- Perguntar sobre política.
- Discutir acontecimentos.
- Elogiar.
- Provocar.
- Consolar.
- Presentear.
- Fazer um favor.
- Solicitar favor.
- Negociar.
- Flertar.
- Cortejar.
- Propor relacionamento.
- Propor casamento.
- Confessar segredo.
- Revelar informação.
- Chantagear.
- Ameaçar.
- Subornar.
- Recrutar como informante.
- Convidar para a corte.
- Solicitar apoio político.
- Romper relação.

A disponibilidade deverá variar conforme idade adulta, personalidade, posição política, localização, estado civil, confiança e contexto.

## 8.3 Resolução das ações

Criar uma função central de avaliação.

A chance de sucesso deverá considerar:

- Habilidade do agente.
- Habilidade e personalidade do alvo.
- Relações existentes.
- Prestígio.
- Diferença de status.
- Interesses políticos.
- Circunstâncias.
- Segredos ou favores disponíveis.

A fórmula inicial deve produzir uma probabilidade limitada entre 5% e 95%, quando a ação for admissível e depender de incerteza.

Algumas decisões serão determinísticas, especialmente quando existirem obrigações legais ou condições objetivas.

Evitar exploração por repetição infinita de ações sociais.

Introduzir limites contextuais, tempo entre encontros, saturação de assuntos e consequências por insistência excessiva.

## 8.4 Conversas

Criar um sistema de diálogo dinâmico baseado em:

- Personalidade.
- Relação atual.
- Localização.
- Contexto.
- Acontecimentos recentes.
- Segredos.
- Objetivos políticos.
- Humor momentâneo.

As respostas deverão possuir variações significativas.

Não usar sempre o mesmo diálogo genérico.

Os personagens precisam mencionar acontecimentos que realmente ocorreram.

Não depender de API de linguagem artificial para gerar falas durante a execução do jogo.

---

# 9. AMOR, CASAMENTO E FAMÍLIA

## 9.1 Romance

Personagens adultos poderão desenvolver interesse romântico, estabelecer relacionamentos e formar famílias.

Atração, confiança e amor serão dimensões diferentes.

Uma união pode nascer de interesses políticos, de afeto genuíno ou de uma combinação dos dois.

## 9.2 Casamentos

Permitir:

- Casamento por amor.
- Casamento diplomático.
- Casamento entre herdeiros.
- Negociação de dote.
- Acordos territoriais.
- Promessas hereditárias.
- Pactos militares.
- Casamento com objetivos econômicos.

Um casamento não cria obrigatoriamente uma aliança militar permanente.

É necessário considerar contratos, interesses das casas e mudanças políticas.

## 9.3 Amantes e bastardos

Implementar:

- Relacionamentos extraconjugais.
- Amantes secretos.
- Gravidezes.
- Filhos legítimos.
- Filhos bastardos.
- Reconhecimento voluntário de filiação.
- Paternidade contestada.
- Segredos familiares.
- Disputas sucessórias.
- Escândalos.
- Chantagem.

O sistema funcionará narrativamente, sem conteúdo sexual explícito.

Personagens menores de idade não participarão de mecânicas sexuais ou românticas.

## 9.4 Infância e educação

Crianças precisam envelhecer e desenvolver características.

Permitir selecionar tutores e focos educacionais:

- Política.
- Administração.
- Guerra.
- Diplomacia.
- Intriga.
- Cultura.

O desenvolvimento deverá considerar:

- Influência familiar.
- Traços herdados.
- Educação.
- Saúde.
- Acontecimentos.
- Relações pessoais.

Os filhos não devem ser cópias dos pais.

## 9.5 Mortalidade

Personagens poderão morrer por:

- Envelhecimento.
- Doença.
- Acidente.
- Combate.
- Ferimentos.
- Assassinato.
- Envenenamento.
- Execução.

A mortalidade precisa considerar circunstâncias e saúde, em vez de ser puramente aleatória.

---

# 10. HERANÇA E SUCESSÃO

O jogador controla uma dinastia, não um personagem imortal.

Quando o personagem controlado morrer, o jogo continuará com um sucessor elegível.

## 10.1 Leis de sucessão

Implementar pelo menos:

- Primogenitura.
- Primogenitura com preferência de gênero.
- Partilha entre herdeiros.
- Sucessão por escolha do soberano.
- Sucessão eletiva entre membros elegíveis.

Cada reino terá uma legislação inicial própria, modificável por meios políticos válidos.

## 10.2 Legitimidade hereditária

A sucessão deve verificar:

1. Parentesco.
2. Filiação reconhecida.
3. Legitimidade.
4. Lei aplicável.
5. Direitos do cônjuge.
6. Títulos envolvidos.
7. Reivindicações.
8. Pactos existentes.

Filhos bastardos não serão automaticamente excluídos de todas as situações, mas deverão respeitar as leis e decisões políticas vigentes.

## 10.3 Crises

Uma morte poderá provocar:

- Divisão territorial.
- Guerra civil.
- Contestação de herdeiros.
- Intervenção do soberano.
- Alianças familiares.
- Assassinatos.
- Usurpação.
- Mudança de lealdade dos vassalos.

## 10.4 Continuidade

Se o personagem principal morrer, escolher o sucessor dinástico legalmente controlável.

Se a casa perder todas as terras, permitir uma situação de exílio político, mantendo oportunidades de recuperar títulos.

A campanha terminará definitivamente apenas quando não existir sucessor dinástico elegível nem possibilidade de continuidade da linhagem.

---

# 11. POLÍTICA FEUDAL E TÍTULOS

Criar um sistema real de relações hierárquicas.

## 11.1 Obrigações dos vassalos

Os contratos feudais poderão prever:

- Tributação.
- Tropas.
- Participação em campanhas.
- Respeito à autoridade do soberano.
- Limites de autonomia.
- Direitos de herança.
- Proteção territorial.
- Convocação ao conselho.
- Deveres extraordinários.

Cada obrigação precisa produzir consequências quando descumprida.

## 11.2 Ações políticas

Permitir:

- Solicitar terras.
- Pedir proteção.
- Solicitar privilégios.
- Negociar tributos.
- Solicitar títulos.
- Convocar aliados.
- Criar facções.
- Organizar uma rebelião.
- Exigir independência.
- Apoiar um pretendente.
- Acusar um lorde.
- Solicitar julgamento.
- Pedir intervenção do rei.
- Alterar contratos.
- Conceder títulos a vassalos.

## 11.3 Favores e promessas

Criar registros explícitos de:

- Promessas feitas.
- Promessas cumpridas.
- Promessas quebradas.
- Dívidas de favor.
- Obrigações familiares.
- Juramentos.
- Recompensas esperadas.

Exemplo:

O jogador atende uma convocação militar e seu soberano promete uma província.

Se a recompensa não for entregue, o jogador poderá cobrar, perdoar, negociar ou retaliar.

Outros personagens poderão interpretar esse acontecimento como traição ou injustiça.

## 11.4 Títulos e ascensão

O jogador inicia com um título provincial.

Poderá conquistar ou receber novos títulos por:

- Herança.
- Concessão.
- Tratado.
- Casamento.
- Eleição.
- Usurpação.
- Independência reconhecida.

Não conceder automaticamente um título superior apenas por atingir certo número de províncias.

A evolução precisa fazer sentido político.

---

# 12. DIPLOMACIA ENTRE CASAS

Cada casa possuirá uma relação diplomática com as demais.

Estados possíveis:

- Aliada.
- Amigável.
- Neutra.
- Desconfiada.
- Rival.
- Hostil.
- Em guerra.
- Subordinada.
- Em rebelião.

Essas classificações são resultados de relações e tratados, não substituem os dados políticos individuais.

## 12.1 Acordos

Implementar:

- Alianças.
- Pactos de não agressão.
- Garantias de proteção.
- Acordos de comércio.
- Acordos matrimoniais.
- Trocas territoriais.
- Tributos.
- Garantias de passagem.
- Apoio militar.
- Neutralidade.
- Tratados de paz.

Tratados deverão ter duração, condições, participantes, obrigações e cláusulas de rompimento.

## 12.2 Traição

Acordos poderão ser quebrados.

Consequências possíveis:

- Perda de prestígio.
- Desconfiança diplomática.
- Retaliação.
- Sanções econômicas.
- Reivindicações.
- Guerras.
- Reações de outros aliados.

Não bloquear arbitrariamente a possibilidade de traição.

O jogo deve permitir escolhas moralmente questionáveis, com consequências políticas reais.

---

# 13. ESPIONAGEM E GUERRA SECRETA

Espionagem deverá funcionar como um sistema estratégico contínuo.

## 13.1 Agentes

Permitir recrutar:

- Informantes locais.
- Funcionários de cortes rivais.
- Mensageiros.
- Comerciantes.
- Conselheiros.
- Nobres descontentes.

Agentes terão habilidades, lealdade, custo e risco de exposição.

## 13.2 Operações

- Observar movimentações militares.
- Descobrir planos de invasão.
- Investigar sucessões.
- Espionar acordos.
- Roubar informações políticas.
- Descobrir segredos.
- Criar redes de informantes.
- Plantar informações falsas.
- Sabotar recursos.
- Apoiar rebeldes.
- Chantagear personagens.
- Preparar atentados políticos abstratos.
- Investigar conspirações internas.

## 13.3 Informação imperfeita

Informações obtidas deverão possuir:

- Origem.
- Data.
- Grau de confiança.
- Atualidade.
- Possível contaminação por desinformação.

Exemplo:

O espião informa que uma casa está reunindo 2.000 soldados.

Entretanto, não sabe exatamente se o alvo será a província do jogador ou uma região vizinha.

A confiança da informação pode aumentar por meio de novas fontes.

## 13.4 Contraespionagem

Outras casas também deverão infiltrar agentes.

O jogador poderá detectar, prender, expulsar, converter ou interrogar suspeitos por meio de ações narrativas e políticas.

---

# 14. ECONOMIA TERRITORIAL

A economia deve ser simples de administrar, mas profundamente integrada à simulação.

## 14.1 Recursos

Recursos fundamentais:

- Ouro.
- Alimentos.
- Madeira.
- Ferro.
- Cavalos.
- População.
- Equipamento militar.

Prestígio, influência, legitimidade e favores serão recursos políticos separados dos estoques materiais.

## 14.2 Produção

A produção será mensal.

Cada província terá:

- Produção-base.
- Especialização.
- Infraestrutura.
- Mão de obra.
- Estabilidade.
- Fertilidade ou riqueza natural.
- Tributação.
- Estoques.
- Consumo.

Produção e população precisam responder a guerras, prosperidade, fome e instabilidade.

## 14.3 Especialização

Uma província poderá favorecer:

- Agricultura.
- Mineração.
- Comércio.
- Portos.
- Madeira.
- Pecuária.
- Oficinas.
- Administração.

Permitir investir em infraestrutura para aumentar a eficiência.

O jogador não deve gerenciar trabalhadores individualmente.

## 14.4 Gestão simplificada

A tela econômica mostrará:

- Renda mensal.
- Despesa mensal.
- Saldo.
- Recursos produzidos.
- Recursos consumidos.
- Principais fontes de riqueza.
- Riscos e gargalos.
- Construções em desenvolvimento.

Implementar melhorias por botões claros, com custos, benefícios e duração.

Criar possibilidade de delegar tarefas econômicas a um administrador.

## 14.5 Comércio

Rotas comerciais reais precisam ligar assentamentos.

Mercadorias deverão circular entre regiões produtoras e consumidoras.

Contratos e comércio automático devem respeitar:

- Acessibilidade.
- Distância.
- Segurança.
- Capacidade da rota.
- Impostos.
- Oferta.
- Demanda.
- Bloqueios.
- Estações do ano.

Criar preços dinâmicos moderados, evitando oscilações irracionais.

Uma província comercial pode prosperar sem possuir minas ou grandes plantações.

## 14.6 Guerra econômica

Permitir:

- Bloquear rotas.
- Impor embargos.
- Aumentar tributos.
- Negociar exclusividade.
- Interromper suprimentos.
- Financiar terceiros.
- Apoiar economicamente aliados.

Exércitos deverão consumir recursos.

Uma guerra prolongada precisa prejudicar economias e populações.

---

# 15. CONSTRUÇÕES E DESENVOLVIMENTO

Cada assentamento deverá possuir infraestrutura.

## Construções possíveis

- Muralhas.
- Torres.
- Quartéis.
- Estábulos.
- Campos agrícolas.
- Moinhos.
- Minas.
- Serrarias.
- Mercados.
- Estradas.
- Pontes.
- Portos.
- Armazéns.
- Oficinas.
- Fortes.
- Hospitais rudimentares.
- Edifícios administrativos.

As construções precisam ter:

- Custo.
- Tempo de execução.
- Pré-requisitos.
- Limite territorial.
- Benefício.
- Manutenção, quando aplicável.

Criar níveis de desenvolvimento.

Evitar exigir que o jogador construa manualmente cada pequena instalação de suas dezenas de províncias.

Permitir modelos administrativos e prioridades gerais.

---

# 16. RECRUTAMENTO E EXÉRCITOS

O jogo terá uma camada militar estratégica.

## 16.1 Tipos de tropas

- Milícia.
- Infantaria leve.
- Infantaria pesada.
- Lanceiros.
- Arqueiros.
- Besteiros.
- Cavalaria leve.
- Cavalaria pesada.
- Tropas regionais.

Cada companhia armazenará:

- Número de soldados.
- Equipamento.
- Experiência.
- Disciplina.
- Moral.
- Ataque.
- Defesa.
- Velocidade.
- Alcance.
- Suprimento.
- Custo de manutenção.
- Comandante responsável.

## 16.2 Recrutamento

A quantidade de tropas deve depender de população mobilizável, economia, infraestrutura, contratos e lealdade.

Recrutar muitos soldados reduz mão de obra disponível.

Mobilizações prolongadas terão custo econômico.

## 16.3 Comandantes

Cada exército terá um comandante e poderá possuir oficiais subordinados.

Habilidades militares influenciarão:

- Organização.
- Disciplina.
- Movimentação.
- Moral.
- Flanqueamento.
- Reconhecimento.
- Retirada.

Comandantes poderão morrer, ser capturados ou desertar.

## 16.4 Deslocamento no mapa

O jogador deverá selecionar um exército e ordenar movimentações.

Viagens possuem duração.

O deslocamento deverá considerar terreno, clima, estradas, tamanho do exército, suprimentos e acesso diplomático.

Grandes exércitos serão mais difíceis de abastecer.

---

# 17. DECLARAÇÃO DE GUERRA E CONQUISTA

## 17.1 Causas de guerra

Implementar:

- Reivindicação hereditária.
- Disputa de fronteira.
- Rebelião.
- Independência.
- Contestação sucessória.
- Intervenção militar.
- Retaliação por quebra de tratado.
- Conquista sem legitimidade.

Iniciar uma guerra sem justificativa reconhecida será possível, mas trará consequências políticas e diplomáticas maiores.

## 17.2 Objetivos

Toda guerra deverá registrar:

- Agressor.
- Defensor.
- Participantes.
- Objetivo principal.
- Reivindicações.
- Territórios disputados.
- Condições de encerramento.

## 17.3 Tomada de assentamentos

A ocupação será progressiva.

Um invasor poderá conquistar uma vila antes de chegar ao castelo provincial.

Castelos deverão oferecer resistência.

Uma província poderá estar parcialmente ocupada.

O controle de fortalezas e rotas será importante para consolidar ocupações.

## 17.4 Cercos

Criar sistema de cerco com:

- Guarnição.
- Estoques de alimentos.
- Fortificações.
- Moral.
- Bloqueio.
- Equipamento de cerco.
- Duração.
- Tentativas de ataque.
- Rendição.
- Reforços.

O defensor poderá negociar rendição.

O atacante poderá tentar um assalto, aguardar ou abandonar o cerco.

## 17.5 Tratados de paz

Permitir exigir:

- Províncias.
- Castelos.
- Ouro.
- Reparações.
- Libertação de prisioneiros.
- Reconhecimento de títulos.
- Independência.
- Mudança de soberano.
- Casamento político.
- Renúncia a reivindicações.

O resultado precisa ser proporcional ao contexto militar e político.

Não premiar automaticamente toda vitória de batalha com território.

---

# 18. BATALHAS TÁTICAS TOP-DOWN

Construir um sistema de batalha realmente jogável.

A câmera será fixa em visão superior ou levemente inclinada, mantendo leitura tática clara.

O campo deverá apresentar terreno, obstáculos, vegetação, elevação simplificada e locais estratégicos.

## 18.1 Escala visual

Não representar necessariamente um elemento HTML por soldado real.

Os exércitos deverão ser divididos em companhias.

Cada companhia terá representações visuais de vários soldados estilizados.

A quantidade de personagens desenhados será proporcional à força da companhia, com limites para preservar desempenho.

## 18.2 Preparação

Antes do combate, permitir:

- Selecionar comandante.
- Posicionar unidades.
- Escolher formação.
- Definir reservas.
- Distribuir arqueiros.
- Organizar cavalaria.
- Definir estratégia inicial.

Formações obrigatórias:

- Linha.
- Coluna.
- Cunha.
- Quadrado.
- Defesa concentrada.
- Flancos reforçados.

## 18.3 Comandos

Durante a batalha:

- Avançar.
- Atacar.
- Defender.
- Disparar.
- Flanquear.
- Recuar.
- Reagrupar.
- Mover.
- Manter posição.
- Enviar reserva.
- Retirada geral.

Permitir pausar e emitir ordens.

## 18.4 Simulação

Resolver combate considerando:

- Força efetiva.
- Equipamento.
- Experiência.
- Moral.
- Disciplina.
- Fadiga.
- Tipo de tropa.
- Terreno.
- Formação.
- Flancos.
- Comando.
- Alcance.
- Condições ambientais.

Lanceiros devem ser fortes contra cargas frontais de cavalaria.

Arqueiros devem depender de alcance e linha de visão.

Terreno elevado deve oferecer vantagem defensiva adequada.

Unidades cercadas podem perder moral rapidamente.

## 18.5 Inteligência militar

A IA adversária deverá:

- Defender posições.
- Identificar flancos frágeis.
- Evitar cargas claramente suicidas.
- Proteger unidades frágeis.
- Usar reservas.
- Recuar quando necessário.

Evitar um combate em que dois blocos apenas avançam automaticamente até se encostarem.

## 18.6 Resultado

Registrar:

- Mortos.
- Feridos.
- Fugitivos.
- Capturados.
- Comandantes mortos.
- Equipamentos perdidos.
- Mudanças de moral.
- Prestígio.
- Consequências territoriais.

Sobreviventes preservarão parte de sua experiência.

O resultado poderá afetar personagens e relações políticas.

---

# 19. INTELIGÊNCIA ARTIFICIAL ESTRATÉGICA

**A IA deverá ser construída como um motor de decisões baseado em objetivos.**

Não utilizar exclusivamente eventos aleatórios.

## 19.1 Objetivos de uma casa

Cada casa deverá avaliar continuamente:

- Segurança.
- Expansão.
- Sobrevivência.
- Prestígio.
- Economia.
- Sucessão.
- Estabilidade.
- Rivalidades.
- Compromissos.
- Ambições individuais.

Os pesos variam conforme a personalidade do governante e a situação.

## 19.2 Planejamento em estágios

Exemplo de tentativa de conquista:

1. Identificar território desejado.
2. Avaliar valor econômico e estratégico.
3. Investigar força militar.
4. Verificar alianças do alvo.
5. Analisar obrigações feudais.
6. Buscar justificativa.
7. Preparar recursos.
8. Mobilizar tropas.
9. Considerar alternativas diplomáticas.
10. Executar ou abandonar o plano.

Planos deverão ser armazenados.

Não fazer a IA escolher uma estratégia inteiramente diferente a cada atualização sem motivo.

## 19.3 Imperfeição

A IA não deverá conhecer informações secretas automaticamente.

Cada casa trabalhará com informações disponíveis, suspeitas e estimativas.

A inteligência artificial pode interpretar mal uma situação.

Também poderá detectar oportunidades que o jogador não percebeu.

## 19.4 Planejamento político

Casas poderão:

- Formar alianças.
- Tentar casamentos.
- Atrair vassalos.
- Enfraquecer rivais.
- Subornar funcionários.
- Conspirar.
- Financiar rebeliões.
- Abandonar guerras.
- Negociar rendição.
- Construir influência na corte real.

## 19.5 Planejamento dinástico

Governantes deverão considerar:

- Idade.
- Herdeiros.
- Segurança da linhagem.
- Casamentos.
- Pretendentes.
- Legitimidade.
- Rivalidades entre filhos.
- Interesses familiares.

## 19.6 Frequência das decisões

Adotar diferentes ciclos:

- Diário: acontecimentos imediatos e movimentações.
- Semanal: decisões táticas e sociais relevantes.
- Mensal: economia, administração e planejamento.
- Sazonal: estratégia política e comercial.
- Anual: revisão de ambições e planejamento dinástico.

Usar processamento escalonado para evitar que centenas de personagens realizem cálculos pesados ao mesmo tempo.

## 19.7 Simulação distante

Casas distantes poderão ter decisões e movimentações calculadas de forma simplificada.

Entretanto, todas deverão respeitar as mesmas regras políticas e econômicas.

Não criar tropas ou riquezas gratuitas para favorecer a IA.

---

# 20. TEMPO E CALENDÁRIO

Usar um calendário fictício de 360 dias.

- Quatro estações.
- 90 dias por estação.
- Anos progressivos.

A progressão deverá ser contínua e pausável.

Velocidades iniciais:

- Pausado.
- Normal: 1 dia a cada 3 segundos.
- Rápido: 1 dia por segundo.
- Muito rápido: aproximadamente 10 dias a cada 3 segundos.

Permitir interromper automaticamente o avanço diante de:

- Declaração de guerra.
- Morte importante.
- Proposta diplomática relevante.
- Nascimento de herdeiro.
- Crise de sucessão.
- Descoberta de conspiração.
- Cerco iniciado contra território do jogador.

As velocidades devem ser configuráveis.

Durante batalhas táticas, o relógio estratégico será suspenso e o combate terá seu próprio sistema de tempo. O resultado será sincronizado com a campanha, sem avançar o mundo duas vezes.

---

# 21. EVENTOS E HISTÓRIA EMERGENTE

Criar um motor de eventos fundamentado em causas reais.

Categorias:

- Família.
- Romance.
- Conselho.
- Economia.
- Guerra.
- Sucessão.
- Espionagem.
- Política.
- Comércio.
- Doença.
- Rebelião.
- Administração.
- Acidentes.
- História regional.

## 21.1 Funcionamento

Cada evento deverá possuir:

- Identificador.
- Origem.
- Causa.
- Condições.
- Personagens envolvidos.
- Possíveis decisões.
- Efeitos.
- Continuidade.
- Relevância histórica.

Exemplo:

Um lorde perde uma batalha.

Sua reputação militar cai.

Um vassalo ambicioso percebe fragilidade.

Esse vassalo inicia uma conspiração.

Um espião obtém indícios.

O jogador decide investigar.

O vassalo descobre que está sendo investigado e procura proteção em uma casa rival.

Tudo isso deve nascer de sistemas interconectados.

## 21.2 Memória histórica

Criar registros pesquisáveis de:

- Guerras.
- Casamentos.
- Nascimentos.
- Mortes.
- Conquistas.
- Tratados.
- Traições.
- Rebeliões.
- Dinastias extintas.
- Mudanças territoriais.
- Grandes crises.

Permitir consultar a história de personagens, casas, províncias, feudos e reinos.

Os personagens deverão se lembrar dos acontecimentos relevantes para suas relações.

---

# 22. INTERFACE E DIREÇÃO VISUAL

A interface é parte central da qualidade do jogo.

Não criar aparência de dashboard corporativo.

Construir um visual medieval de grande estratégia, com acabamento de jogo comercial 2D.

## 22.1 Estilo

Direção artística:

- Pixel art estilizada em 16/32-bit.
- Fundos escuros.
- Molduras discretamente ornamentadas.
- Pergaminhos claros.
- Dourado envelhecido.
- Brasões vibrantes.
- Contraste elevado.
- Ícones bem definidos.
- Mapas com cores territoriais legíveis.

Paleta inicial:

- Fundo principal: `#101923`.
- Painéis: `#172431`.
- Dourado: `#BE9855`.
- Pergaminho: `#E4D0AA`.
- Texto claro: `#EDE4D3`.
- Texto secundário: `#A9A597`.
- Vermelho de alerta: `#B6534F`.
- Verde positivo: `#719D79`.

Criar tokens de design reutilizáveis.

## 22.2 HUD principal

Parte superior:

- Casa do jogador.
- Brasão.
- Ouro.
- Alimentos.
- Madeira.
- Ferro.
- Efetivo militar.
- Influência.
- Data.
- Controles do tempo.

Navegação:

- Mapa.
- Casa.
- Corte.
- Diplomacia.
- Economia.
- Exército.
- Espionagem.
- História.

Painéis laterais contextuais.

O mapa deverá ocupar a maior área disponível.

## 22.3 Resolução

Interface principal em desktop, otimizada inicialmente para 16:9.

Adaptar a 1366×768 e 1920×1080.

Criar layout responsivo para celular.

Em dispositivos móveis, priorizar navegação por painéis, zoom por gestos e batalhas em orientação horizontal.

## 22.4 Telas obrigatórias

1. Menu principal.
2. Nova campanha.
3. Carregar campanha.
4. Mapa dos reinos.
5. Mapa dos feudos.
6. Mapa das províncias.
7. Mapa dos assentamentos.
8. Detalhes territoriais.
9. Gestão da casa.
10. História da casa.
11. Personagem.
12. Conversa.
13. Corte.
14. Conselho.
15. Árvore genealógica.
16. Casamentos.
17. Sucessão.
18. Diplomacia.
19. Tratados.
20. Comércio.
21. Gestão econômica.
22. Construções.
23. Espionagem.
24. Informações militares.
25. Recrutamento.
26. Organização de exército.
27. Batalha tática.
28. Cerco.
29. Negociação de paz.
30. Registro histórico.
31. Notícias e eventos.
32. Configurações.

---

# 23. ASSETS GERADOS POR CÓDIGO

Priorizar elementos visuais procedurais e reutilizáveis.

## 23.1 CSS

CSS deverá construir:

- Painéis.
- Molduras.
- Botões.
- Indicadores.
- Cartas.
- Barras.
- Texturas simples.
- Elementos decorativos.
- Transições.
- Animações.

## 23.2 SVG

SVG deverá construir:

- Brasões.
- Bandeiras.
- Fronteiras.
- Rios.
- Estradas.
- Elementos geográficos.
- Ícones de assentamentos.
- Construções estilizadas.
- Componentes de retratos.

## 23.3 Soldados

Criar um sistema modular de unidades militares estilizadas.

Cada unidade utilizará um conjunto pequeno de peças visuais:

- Corpo.
- Cabeça.
- Capacete.
- Escudo.
- Arma.
- Capa.
- Bandeira.

Permitir animações simples:

- Parado.
- Marchando.
- Atacando.
- Defendendo.
- Recuando.
- Fugindo.

## 23.4 Retratos

Criar personagens visuais por composição.

Variações:

- Formato de rosto.
- Tons de pele.
- Cabelo.
- Barba.
- Olhos.
- Nariz.
- Roupas.
- Coroas.
- Joias.
- Cicatrizes.
- Expressões.

Expressões mínimas:

- Neutro.
- Feliz.
- Irritado.
- Triste.
- Desconfiado.
- Assustado.

Gerar a aparência por semente para que não mude entre carregamentos.

## 23.5 Fidelidade visual

As imagens conceituais fornecidas devem orientar composição, paleta, atmosfera e organização.

Entretanto, não tentar replicar detalhes pictóricos impossíveis usando CSS puro.

O resultado deverá ser uma estética procedural própria, bonita e coerente.

Se houver necessidade futura de assets externos, a arquitetura deverá permitir substituí-los sem reescrever as regras do jogo.

Não depender de centenas de arquivos gráficos na primeira versão.

---

# 24. COMPLEXIDADE SEM MICROGERENCIAMENTO

Uma regra fundamental:

O jogador deve tomar decisões estratégicas, não executar tarefas administrativas repetitivas.

Criar:

- Gerenciamento automático por conselheiros.
- Construções em fila.
- Prioridades econômicas provinciais.
- Comércio automático configurável.
- Recrutamento organizado.
- Pausa em eventos importantes.
- Filtros de notificações.
- Visões resumidas dos domínios.

O jogador deverá conseguir cuidar de dezenas de províncias sem precisar clicar individualmente em todas a cada mês.

A inteligência artificial dos administradores pode cometer erros ou agir de acordo com seus interesses, mas tarefas delegadas devem continuar funcionando.

---

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

# 27. EQUILÍBRIO E PROGRESSÃO

O jogador não deve crescer facilmente apenas por repetir ações.

Criar obstáculos coerentes:

- Exércitos custam dinheiro.
- Impostos excessivos reduzem lealdade.
- Expansionismo gera desconfiança.
- Casamentos podem produzir obrigações.
- Títulos disputados provocam crises.
- Grandes domínios são difíceis de administrar.
- Vassalos poderosos podem se rebelar.
- Guerras prolongadas esgotam populações.
- Rivalidades familiares podem prejudicar sucessões.

Evitar vantagens artificiais permanentes para o jogador.

Também evitar penalizações arbitrárias apenas para criar dificuldade.

A dificuldade deverá emergir das situações.

Criar configurações de campanha para ajustar agressividade política, pressão econômica e tolerância a erros administrativos, mantendo as regras centrais iguais para jogador e IA.

---

# 28. CENÁRIOS DE COMPORTAMENTO OBRIGATÓRIOS

Os seguintes cenários devem ser possíveis mediante as regras, sem eventos rigidamente roteirizados.

### Cenário A — Guerra oportunista

Uma casa percebe a fragilidade militar de outra.

Começa a mobilizar tropas.

O jogador obtém indícios por espionagem.

Pode reforçar a fronteira, convocar aliados ou negociar.

A casa atacante reavalia o risco.

### Cenário B — Casamento estratégico

O jogador casa seu irmão com a filha de uma casa vizinha.

A união melhora relações, mas cria obrigações.

O chefe dessa família morre.

Surge uma disputa sucessória.

A dinastia do jogador passa a possuir reivindicações legítimas.

### Cenário C — Bastardo desconhecido

Um nobre tem um filho fora do casamento.

O segredo permanece oculto durante anos.

Um informante descobre a origem.

A informação pode ser revelada, utilizada em chantagem ou permanecer secreta.

### Cenário D — Traição de conselheiro

Um administrador desonesto desvia recursos.

Uma casa rival oferece proteção.

O jogador pode descobrir a conspiração ou continuar sendo prejudicado.

### Cenário E — Convocação militar

O soberano declara guerra.

Convoca os vassalos.

O jogador atende, participa de batalhas e presta auxílio.

Após a guerra, pede recompensa.

O soberano considera suas contribuições e interesses políticos.

### Cenário F — Herdeiro impopular

Um lorde respeitado morre.

Seu filho assume.

Alguns vassalos passam a questionar sua autoridade.

Uma facção tenta substituí-lo.

### Cenário G — Bloqueio econômico

Uma província rica depende de uma rota marítima.

Um reino rival bloqueia o porto.

A economia enfraquece.

O jogador pode negociar, mudar rotas ou combater o bloqueio.

### Cenário H — Conquista incompleta

O jogador captura duas vilas, mas não consegue tomar o castelo.

A província permanece dividida entre ocupação militar e autoridade legal.

O conflito continua.

### Cenário I — Crise dinástica distante

Um rei de outro território morre sem herdeiro incontestável.

Duas casas iniciam uma disputa.

O conflito altera alianças comerciais e militares em outros reinos.

O jogador poderá participar, ignorar ou explorar a instabilidade.

---

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

# 31. CRITÉRIOS DE QUALIDADE VISUAL

A qualidade gráfica deverá ser avaliada desde a primeira fase.

Não criar uma interface provisória feia com a intenção de melhorá-la apenas no fim.

O estilo visual deverá amadurecer sem mudanças radicais de direção.

Verificar em cada tela:

- Hierarquia visual clara.
- Brasões legíveis.
- Cores consistentes.
- Informações bem organizadas.
- Fontes adequadas.
- Contraste.
- Ícones padronizados.
- Espaçamento.
- Alinhamento.
- Animações.
- Estados de interação.
- Responsividade.
- Coerência entre painéis.

Os mapas devem possuir variedade geográfica suficiente para parecerem um continente real.

As batalhas devem apresentar formações legíveis.

Os personagens devem ter identidade visual individual.

Evitar visual infantil, cartunesco exagerado, genérico ou excessivamente realista.

---

# 32. DOCUMENTAÇÃO INTERNA

Criar os arquivos:

- `docs/GDD.md` — especificação integral.
- `docs/WORLD_BIBLE.md` — reinos, casas, geografia, história e culturas.
- `docs/SYSTEMS.md` — regras detalhadas dos sistemas.
- `docs/UI_ART.md` — direção visual e componentes.
- `docs/AI_DESIGN.md` — tomada de decisão e objetivos.
- `docs/TECHNICAL_ARCHITECTURE.md` — arquitetura.
- `docs/TEST_PLAN.md` — validações e testes.
- `PROGRESS.md` — progresso real.
- `AGENTS.md` — instruções operacionais curtas.

Este documento mestre deverá ser distribuído entre os arquivos correspondentes, sem descartar informações.

O arquivo `AGENTS.md` não deverá repetir a Bíblia inteira.

Ele deverá orientar o agente a consultar os documentos corretos conforme a tarefa.

Quando o projeto evoluir, atualizar a documentação mantendo o histórico de decisões relevantes.

---

# 33. INSTRUÇÕES FINAIS DE IMPLEMENTAÇÃO

Leia esta especificação integralmente.

Inspecione primeiro o repositório.

Preserve código útil que já existir.

Não invente regras conflitantes com este documento.

Quando um detalhe técnico não estiver explicitado, escolha uma solução coerente com a arquitetura, registre-a na documentação e mantenha a possibilidade de ajuste.

Não altere sozinho os fundamentos do design.

Não reduza silenciosamente o número de reinos, feudos, províncias, casas ou personagens.

Não substitua a IA política por ações aleatórias sem memória.

Não transforme guerras em comparações simples de números.

Não simplifique relacionamentos para uma única barra de amizade.

Não transforme casamento e sucessão em modificadores econômicos superficiais.

Não construa um mapa meramente ilustrativo.

Não deixe botões sem função. Recursos ainda não implementados deverão ser identificados como pendentes e não apresentados como sistemas completos.

Não declarar uma fase concluída se seus critérios não forem atendidos.

## Primeira execução

Agora comece a Fase 1.

Sua execução inicial deverá:

1. Estruturar o repositório.
2. Criar a documentação.
3. Implementar o modelo territorial.
4. Criar os sete reinos e respectivos feudos.
5. Gerar as 252 províncias e assentamentos.
6. Criar as casas nobres iniciais.
7. Construir os mapas políticos interativos.
8. Implementar navegação e seleção.
9. Criar HUD e identidade visual.
10. Implementar calendário e estado persistente.
11. Criar testes de integridade.
12. Executar build e validar funcionamento.
13. Registrar corretamente o progresso.

Ao concluir a execução, informar quais arquivos foram alterados, quais testes passaram, quais decisões técnicas foram tomadas e quais requisitos permanecem pendentes.

**Objetivo final:** criar um simulador medieval vivo, no qual uma casa nobre possa atravessar gerações de guerras, casamentos, traições, conspirações e conquistas territoriais, em um mundo complexo, coerente, bonito e divertido.

Construa sistemas reais. Construa um mundo que não dependa do jogador para existir.
