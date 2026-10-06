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
  await page.getByRole('button', { name: 'Pegar a espada' }).click()
}
const endTurn = (page: Page) => page.getByRole('button', { name: 'Encerrar turno' })
/** Development-only handle (src/ui/game/GameScreen.tsx) used to fast-forward a campaign. */
/**
 * Ends turns until `target` appears. World events, the liege's letters and battles along the way are
 * answered with their last (most cautious) choice, as a passive player would.
 */
async function runUntil(page: Page, name: string | RegExp, timeout = 60_000) {
  const target = page.getByRole('dialog', { name }), end = Date.now() + timeout
  const isTarget = (label: string | null) => label !== null && (typeof name === 'string' ? label === name : name.test(label))
  while (Date.now() < end) {
    if (await target.isVisible()) return target
    const other = page.getByRole('dialog').first()
    // Never answer the dialog we are waiting for, even if it appeared a moment ago.
    if (await other.isVisible() && !isTarget(await other.getAttribute('aria-label').catch(() => null))) {
      const cont = other.getByRole('button', { name: /^Continuar$|^pular$/ })
      // A new dialog may replace this one mid-click; short timeouts keep the loop moving.
      if (await cont.count()) await cont.last().click({ timeout: 1500 }).catch(() => {})
      else { const choices = other.locator('button[class*="choice"]'); if (await choices.count()) await choices.last().click({ timeout: 1500 }).catch(() => {}) }
    } else if (await endTurn(page).isEnabled()) await endTurn(page).click({ timeout: 1500 }).catch(() => {})
    await page.waitForTimeout(150)
  }
  await expect(target).toBeVisible()
  return target
}
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
  // The opening scene tells who Irian is and how to play.
  await expect(page.getByRole('dialog', { name: 'Começo da campanha' })).toContainText('Irian da Casa Santiago')
  await page.getByRole('button', { name: 'Pegar a espada' }).click()
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
  await expect(page.getByLabel('Turno', { exact: true }).locator('i[class*="on"]')).toHaveCount(2) // the march cost an order
  // Events, the liege's summons and his relief army may interrupt the siege: answer and keep going.
  const decision = await runUntil(page, /As muralhas de/, 90_000)
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
  // The land is now the player's: the old lord leaves the map and your banner flies over it.
  await expect(lord(page, 'Casa Ardesh')).toHaveCount(0)
  await lens(page, 'Território').click()
  await page.locator('button[aria-label$="sua província"]').first().click()
  await expect(card(page).getByText(/Tomada da Casa Ardesh/)).toBeVisible()
  await expect(card(page).getByRole('radiogroup', { name: 'Imposto' })).toBeVisible()
  await card(page).getByRole('radio', { name: /Alto/ }).click()
  await expect(card(page).getByRole('radio', { name: /Alto/ })).toHaveAttribute('aria-checked', 'true')
})

test('conversas respeitam as duas consciências de um duário', async ({ page }) => {
  await foundHouse(page)
  await lord(page, 'Casa Quellan').click()
  await expect(card(page).getByText('Duas consciências.')).toBeVisible()
  // Lords are met in person: the retinue rides to Aguasanta first.
  await card(page).getByRole('button', { name: /Ir até Bertram/ }).click()
  await card(page).getByRole('button', { name: /Conversar com Bertram/ }).click()
  const talk = page.getByRole('dialog', { name: 'Conversa com Bertram' })
  await talk.getByRole('button', { name: /Elogiar/ }).click()
  await expect(talk.getByText(/Bram/).first()).toBeVisible()
  await expect(talk.getByRole('button', { name: /Elogiar/ })).toBeDisabled()
  // Asking what the house needs tells what would weigh in a negotiation.
  await talk.getByRole('button', { name: /Do que precisam/ }).click()
  await expect(talk.getByText(/Mercol|negociarmos/).first()).toBeVisible()
})

test('o mundo não para: acontecimentos pedem decisões com consequência', async ({ page }) => {
  test.setTimeout(90_000)
  await foundHouse(page)
  const event = page.getByRole('dialog').filter({ hasText: 'acontecimento' })
  for (let i = 0; i < 6 && !(await event.isVisible()); i++) {
    const other = page.getByRole('dialog').first()
    if (await other.isVisible()) await other.locator('button[class*="choice"]').last().click()
    else await endTurn(page).click()
    await page.waitForTimeout(300)
  }
  await expect(event).toBeVisible()
  await event.locator('button[class*="choice"]').first().click()
  await expect(event).toBeHidden()
  await expect(page.getByLabel('Relatório do turno')).toBeVisible()
})

test('a comitiva de Irian anda pelo mapa, e encerrar o turno mostra o que aconteceu', async ({ page }) => {
  await foundHouse(page)
  await page.getByRole('button', { name: 'Irian e a comitiva' }).click()
  await expect(page.getByRole('complementary', { name: 'Comitiva de Irian' })).toContainText('45 homens')
  const markers = page.locator('button[aria-label^="Levar a comitiva para"]')
  await expect(markers.first()).toBeVisible()
  const before = await markers.count()
  expect(before).toBeGreaterThan(3)
  await markers.first().click()
  await expect(page.getByRole('button', { name: 'Comitiva de Irian' })).toContainText(/[01] mov/)
  // The opening band waits next to Pontevela: if the retinue lands on it, fall back.
  const fight = page.getByRole('dialog', { name: /Combate em/ })
  if (await fight.isVisible()) await fight.getByRole('button', { name: /Recuar/ }).click()
  await endTurn(page).click()
  await expect(page.getByLabel('Turno', { exact: true })).toContainText('Turno 2')
  await expect(page.getByRole('button', { name: 'Comitiva de Irian' })).toContainText('2 mov')
})

test('a convocação do grão-lorde pausa o tempo e exige uma decisão', async ({ page }) => {
  test.setTimeout(90_000)
  await foundHouse(page)
  const levy = await runUntil(page, 'Convocação da Casa Hadrin', 60_000)
  await levy.getByRole('button', { name: /Enviar 100 homens/ }).click()
  await expect(levy).toBeHidden()
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
