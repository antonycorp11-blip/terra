import { expect, test, type Page } from '@playwright/test'

const map = (page: Page) => page.getByRole('application', { name: 'Mapa de Varedor' })
const card = (page: Page) => page.locator('aside[aria-label^="Província"]')
const lens = (page: Page, name: string) => page.getByRole('tab', { name })
const lord = (page: Page, house: string) => page.locator(`button[aria-label$="${house}"]`).first()

async function foundHouse(page: Page, name = 'Ravencor') {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: 'Nova Campanha' }).click()
  await page.getByLabel('Nome da casa').fill(name)
  await page.getByRole('button', { name: 'Continuar ›' }).click()
  await page.getByRole('button', { name: 'Continuar ›' }).click()
  await page.getByRole('button', { name: 'Fundar Minha Casa' }).click()
  await expect(map(page)).toBeVisible({ timeout: 30_000 })
}
/** Development-only handle (src/ui/game/GameScreen.tsx) used to fast-forward a campaign. */
async function edit(page: Page, script: string) {
  await page.evaluate(script => {
    const t = (window as unknown as { __terra: { game: unknown; setGame: (g: unknown) => void } }).__terra
    const g = structuredClone(t.game) as Record<string, any>
    new Function('g', script)(g)
    t.setGame(g)
  }, script)
}

test('cria uma casa personalizada em três etapas com brasão ao vivo', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: 'Nova Campanha' }).click()
  const input = page.getByLabel('Nome da casa')
  await input.fill('Hadrin')
  await expect(page.getByText('Esta casa já existe em Varedor.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Continuar ›' })).toBeDisabled()
  await input.fill('Santiago')
  await expect(page.getByText('Prévia: Casa Santiago')).toBeVisible()
  await page.getByRole('button', { name: 'Continuar ›' }).click()
  await page.getByRole('button', { name: 'Coroa' }).click()
  await page.getByRole('button', { name: 'Partido' }).click()
  await page.getByRole('button', { name: 'Principal: Azul real' }).click()
  await page.getByRole('button', { name: 'Secundária: Azul real' }).click()
  await expect(page.getByText('As cores principal e secundária precisam ser diferentes.')).toBeVisible()
  await page.getByRole('button', { name: 'Secundária: Ouro' }).click()
  await expect(page.getByRole('img', { name: 'Brasão da Casa Santiago' })).toBeVisible()
  await page.getByRole('button', { name: 'Continuar ›' }).click()
  for (const text of ['Velária', 'Três Pontes', 'Pontevela', 'Castelo da Ponte Alta', '700', '1.240']) await expect(page.getByText(text, { exact: true }).first()).toBeVisible()
  await page.getByRole('button', { name: 'Fundar Minha Casa' }).click()
  await expect(page.getByRole('button', { name: 'Abrir menu' })).toContainText('Casa Santiago')
  await expect(page.getByRole('tablist', { name: 'Visões do mapa' }).getByRole('tab')).toHaveText(['Território', 'Diplomacia', 'Militar', 'Influência'])
})

test('o mapa mostra lordes de corpo inteiro; tocar abre a carta da casa e as visões mudam o mapa', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 })
  await foundHouse(page)
  // The houses of Três Pontes stand on their seats, full body.
  for (const house of ['Casa Hadrin', 'Casa Morvane', 'Casa Quellan', 'Casa Ardesh', 'Casa Vasterre']) await expect(lord(page, house)).toBeVisible()
  await expect(lord(page, 'Casa Hadrin').locator('img')).toHaveAttribute('src', /lord-\d+\.webp$/)
  await lord(page, 'Casa Hadrin').click()
  await expect(card(page)).toBeVisible()
  await expect(card(page).getByRole('heading', { name: 'Casa Hadrin' })).toBeVisible()
  await expect(card(page).getByRole('img', { name: /Aldric, Casa Hadrin/ })).toBeVisible()
  await expect(card(page).getByText('caminhos para tomar')).toBeVisible()
  // Each lens recolours the map and changes the card's actions.
  await lens(page, 'Militar').click()
  await expect(page.getByText('Forças do feudo')).toBeVisible()
  await expect(card(page).getByText('defensores')).toBeVisible()
  await lens(page, 'Diplomacia').click()
  await expect(page.getByText('Comércio e acordos')).toBeVisible()
  await page.getByRole('button', { name: 'pedra', exact: true }).click()
  await expect(page.getByText(/Quem produz pedra:.*Ardesh/)).toBeVisible()
  await lens(page, 'Influência').click()
  await expect(page.getByText('Seu peso no feudo')).toBeVisible()
  await expect(card(page).getByText('influência', { exact: true })).toBeVisible()
  // Camera moves only by command: zoom buttons work and time does not recentre the map.
  const before = await lord(page, 'Casa Hadrin').getAttribute('style')
  await page.getByRole('button', { name: 'Aproximar' }).click()
  await expect.poll(() => lord(page, 'Casa Hadrin').getAttribute('style')).not.toBe(before)
  // Tapping the map itself selects the province under the finger.
  await page.getByRole('button', { name: 'Fechar' }).first().click()
  const box = await lord(page, 'Casa Morvane').boundingBox()
  await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height + 6)
  await expect(card(page)).toBeVisible()
})

test('conquista militar: marcha, cerco, tática, batalha animada e juramento mudam o mapa', async ({ page }) => {
  test.setTimeout(120_000)
  await page.setViewportSize({ width: 1366, height: 768 })
  await foundHouse(page)
  await edit(page, `const h=g.world.houses.find(h=>h.id===g.playerHouseId);h.gold=4000;h.prestige=150;h.stock.iron=900;h.stock.food=6000;g.campaign.garrisons[h.seatProvinceId]=1500`)
  await lord(page, 'Casa Ardesh').click()
  await lens(page, 'Militar').click()
  await expect(card(page).getByText('Você tem justificativa para esta guerra.')).toBeVisible()
  await card(page).getByLabel('Homens para a campanha').fill('1450')
  await card(page).getByRole('button', { name: /Marchar contra/ }).click()
  await expect(page.getByText(/Seu exército de \d+ homens está a caminho/)).toBeVisible()
  await page.getByRole('button', { name: 'Velocidade 3' }).click()
  // The liege's summons may interrupt the siege: answer it and keep time running.
  const levy = page.getByRole('dialog', { name: 'Convocação da Casa Hadrin' })
  const decision = page.getByRole('dialog', { name: /As muralhas de/ })
  await expect(levy.or(decision)).toBeVisible({ timeout: 40_000 })
  if (await levy.isVisible()) { await levy.getByRole('button', { name: /Inventar uma desculpa/ }).click(); await page.getByRole('button', { name: 'Velocidade 3' }).click() }
  await expect(decision).toBeVisible({ timeout: 40_000 })
  await expect(decision.getByText('o tempo parou')).toBeVisible()
  await decision.getByRole('button', { name: /Ataque ao amanhecer/ }).click()
  const battle = page.getByRole('dialog', { name: /Batalha de/ })
  await expect(battle).toBeVisible()
  await expect(battle.getByRole('heading', { name: 'Vitória' })).toBeVisible({ timeout: 10_000 })
  await battle.getByRole('button', { name: 'Continuar' }).click()
  const oath = page.getByRole('dialog', { name: 'Casa Ardesh se rende' })
  await expect(oath).toBeVisible()
  await oath.getByRole('button', { name: /Termos generosos/ }).click()
  await expect(page.getByRole('button', { name: /Casas/ })).toContainText('1')
  await expect(page.getByText(/Grão-lorde: 2 de 4 casas/)).toBeVisible()
  await lord(page, 'Casa Ardesh').click()
  await expect(card(page).getByText('sua vassala')).toBeVisible()
})

test('conversas respeitam as duas consciências de um duário', async ({ page }) => {
  await foundHouse(page)
  await lord(page, 'Casa Quellan').click()
  await expect(card(page).getByText('Duas consciências.')).toBeVisible()
  await card(page).getByRole('button', { name: /Conversar com Bertram/ }).click()
  const talk = page.getByRole('dialog', { name: 'Bertram' })
  await talk.getByRole('button', { name: 'Elogiar' }).click()
  await expect(talk.getByText(/Bram/).first()).toBeVisible()
  await expect(talk.getByRole('button', { name: /Elogiar/ })).toBeDisabled()
})

test('a convocação do grão-lorde pausa o tempo e exige uma decisão', async ({ page }) => {
  await foundHouse(page)
  await page.getByRole('button', { name: 'Velocidade 3' }).click()
  const levy = page.getByRole('dialog', { name: 'Convocação da Casa Hadrin' })
  await expect(levy).toBeVisible({ timeout: 20_000 })
  await levy.getByRole('button', { name: /Enviar 100 homens/ }).click()
  await expect(levy).toBeHidden()
  await expect(page.getByRole('button', { name: 'Continuar' })).toBeVisible()
})

test('salvar e carregar mantém a campanha', async ({ page }) => {
  await foundHouse(page, 'Draven')
  await page.getByRole('button', { name: 'Abrir menu' }).click()
  const menu = page.getByRole('dialog', { name: 'Casa Draven' })
  await menu.getByLabel('Nome do salvamento').fill('teste')
  await menu.getByRole('button', { name: 'Salvar', exact: true }).click()
  await expect(menu.getByRole('button', { name: /^teste/ })).toBeVisible()
  await menu.getByRole('button', { name: /^teste/ }).click()
  await expect(page.getByRole('button', { name: 'Abrir menu' })).toContainText('Casa Draven')
})

test('celular na horizontal: mapa em tela cheia e HUD sem sobreposição', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 })
  await foundHouse(page)
  const width = await page.evaluate(() => document.documentElement.scrollWidth)
  expect(width).toBeLessThanOrEqual(844)
  const goal = await page.getByRole('button', { name: /Casas/ }).boundingBox()
  const res = await page.getByLabel('Recursos').boundingBox()
  expect(goal!.x + goal!.width).toBeLessThanOrEqual(res!.x + 1)
  await lord(page, 'Casa Vasterre').click()
  await expect(card(page).getByRole('heading', { name: 'Casa Vasterre' })).toBeVisible()
  const box = await card(page).boundingBox()
  expect(box!.x + box!.width).toBeLessThanOrEqual(844)
})

test.describe('iPhone 15 Pro Max na horizontal', () => {
  test.use({ viewport: { width: 932, height: 430 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true })
  test('desenha o mapa na resolução nativa e responde ao toque', async ({ page }) => {
    await foundHouse(page)
    // The canvas matches the screen's device pixels, so nothing is upscaled.
    await expect.poll(() => page.evaluate(() => document.querySelector('canvas')!.width)).toBeGreaterThanOrEqual(932 * 2.5)
    await lord(page, 'Casa Hadrin').tap()
    await expect(card(page).getByRole('heading', { name: 'Casa Hadrin' })).toBeVisible()
    await expect(card(page).locator('img[src*="/lords/card/"]')).toBeVisible()
    const width = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(width).toBeLessThanOrEqual(932)
  })
})
