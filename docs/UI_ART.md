# Interface e direção de arte

Referências de composição: as cinco imagens fornecidas para o projeto. A implementação usa molduras escuras, dourado envelhecido, pergaminho e geografia SVG procedural, sem reutilizar a propriedade visual das imagens.

## Composição implementada na Fase 1

- A tela inicial contém apenas o mapa, a rosa dos ventos, controles discretos de zoom e o brasão que abre o menu. Recursos, calendário, salvamentos e camadas ficam nessa gaveta fechada.
- Clicar no mapa aprofunda a navegação Reino → Feudo → Província → Assentamento. O painel de dados surge apenas depois da seleção e pode ser fechado para voltar ao continente.
- Direção atualizada em 05/10/2026: mapa político de grande estratégia inspirado na leitura de jogos como Crusader Kings. Vegetação e montanhas ilustradas foram retiradas. Os territórios usam cores uniformes, sem mistura com os biomas. Nomes dos reinos em serifas curvas e tinta escura, fronteiras finas, textura discreta e capitais/portos reduzidos formam a hierarquia visual. As fronteiras mantêm a espessura ao aproximar o mapa.
- Castelos, portos, vilas e navios reutilizam o atlas original `public/assets/varedor-map-atlas.png`. As células de vegetação permanecem no arquivo de origem, mas não são definidas nem renderizadas. Os rótulos reservam espaço; assentamentos usam chamadas laterais e linhas de ligação para evitar sobreposição. A câmera enquadra os territórios na área livre ao lado do painel contextual.
- A geografia possui um golfo central aberto ao oceano (Mar de Safira), penínsulas e 16 ilhas com títulos definidos. Os sete reinos possuem áreas diferentes. Contornos detalhados em três escalas, faixas de águas rasas e rios com foz tornam a geografia legível. O mini-mapa mantém a orientação durante o zoom e no celular.
- Oito navios percorrem rotas calculadas apenas sobre água e balançam suavemente. São ambientação marítima, sem transporte econômico simulado. `prefers-reduced-motion` interrompe ambos os movimentos.
- Em celular, o mapa ocupa a tela; o painel de território abre como folha inferior. Em Pontevela, a entrada territorial mostra os dados, a crônica e uma audiência inicial com consequências persistentes.
- O salão da audiência usa uma ilustração original em pixel art em `public/assets/pontevela-audience.png`; a cartografia política permanece SVG interativo.
- As imagens conceituais orientam o acabamento. Retratos e o sistema amplo de diálogos dependem da fase de personagens; transporte naval, comércio e clima continuam pendentes. Proveniência e prompt do atlas estão em `docs/ART_ASSETS.md`.

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
