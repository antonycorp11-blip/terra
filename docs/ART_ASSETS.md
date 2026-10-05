# Atlas cartográfico de Varedor

- Arquivo do projeto: `public/assets/varedor-map-atlas.png`.
- Gerado com a ferramenta `imagegen` integrada em 04/10/2026, com transparência real (canal alfa).
- Dimensão: 1536×1024; grade 3×2 de células 512×512.
- Linha superior: pinheiros, carvalhos, montanhas. Linha inferior: castelo, porto, navio.
- Uso atual em 05/10/2026: apenas castelo, porto, navio e uma janela das casas do porto para vilas. A vegetação foi retirada da interface; o arquivo original é preservado. As janelas SVG ficam em `src/ui/MapSprites.tsx`, sem criar cópias recortadas.
- Arte original inspirada na direção visual solicitada. Não contém partes copiadas das referências.

## Prompt final

Use case: stylized-concept. Asset type: production sprite atlas for an original medieval grand strategy map, Herdeiros do Juramento. Make ONE transparent PNG sprite sheet on a precise 3-column by 2-row regular grid, landscape 1536x1024 ratio. Each of the six equal cells contains exactly one isolated illustration, with generous transparent padding on every side; objects never cross into another cell. Top row left: compact grove of 5 lush varied evergreen pine trees. Top row middle: compact grove of 4 lush broadleaf oak trees. Top row right: dramatic rocky mountain group, 3 peaks, snow on highest peak. Bottom row left: detailed small medieval blue-roof stone castle, round towers, tiny blue flags, stone base, no surrounding trees. Bottom row middle: small terracotta-roof riverside medieval harbor village with wooden jetty, timber houses, lighthouse, no water background. Bottom row right: a single elegant medieval merchant sailing ship in three-quarter view, cream sails, wooden hull, blue pennant; no water background. Style: exquisite readable 16/32-bit fantasy strategy pixel art, crisp pixel clusters, richly shaded, hand-painted miniature terrain sprites, Age of Empires style map asset quality, warm sunlight from upper left and coherent perspective. Vivid forest green, moss green, warm stone, dark slate, blue and amber accents. Objects must read well at small size. No text, letters, labels, grid lines, UI, frames, background scenery, drop shadow rectangles, or watermark. True transparent background everywhere outside each object. Keep all six sprites clearly separated and centered in their own exact grid cell.
