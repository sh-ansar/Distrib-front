import { expect, test } from '@playwright/test'

const paths = [
  '/', '/companies', '/companies/c1', '/outlets', '/outlets/o1',
  '/visits', '/orders', '/debts', '/consignment', '/inventory',
  '/routes', '/routes/r1', '/documents', '/team', '/settings',
]

for (const width of [320,375,390,428,768]) {
  test('no page-level horizontal scrolling at ' + width + 'px', async ({page}) => {
    await page.setViewportSize({width,height:850})
    for (const path of paths) {
      await page.goto(path)
      await expect(page.locator('main h1').first()).toBeVisible()
      const sizes = await page.evaluate(() => ({
        viewport: window.innerWidth,
        html: document.documentElement.scrollWidth,
        body: document.body.scrollWidth,
      }))
      expect(sizes.html, path + ' html viewport ' + width).toBeLessThanOrEqual(sizes.viewport + 1)
      expect(sizes.body, path + ' body viewport ' + width).toBeLessThanOrEqual(sizes.viewport + 1)
    }
  })
}

test('company search and mobile card navigation',async({page})=>{
  await page.setViewportSize({width:375,height:812})
  await page.goto('/companies')
  await expect(page.locator('.mobile-record').first()).toBeVisible()
  await expect(page.locator('.table-scroll')).toBeHidden()
  await page.getByRole('textbox',{name:'Поиск компании'}).fill('000000100101')
  await expect(page.locator('.mobile-record')).toHaveCount(1)
  await expect(page.locator('.mobile-record-title')).toContainText('Акварель Снаб')
  await page.getByRole('button',{name:'Открыть карточку'}).click()
  await expect(page).toHaveURL(/\/companies\/c-demo-001$/)
  await expect(page.locator('main h1')).toContainText('Акварель Снаб')
})

test('small screen keeps quick navigation and reachable store form', async ({page})=>{
  await page.setViewportSize({width:320,height:700})
  await page.goto('/outlets')
  await expect(page.locator('.mobile-bottom-nav')).toBeVisible()
  await page.getByRole('button',{name:/Добавить магазин/}).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  const widths=await page.evaluate(()=>({
    html:document.documentElement.scrollWidth,viewport:window.innerWidth,
  }))
  expect(widths.html).toBeLessThanOrEqual(widths.viewport+1)
})
