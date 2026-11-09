import { expect, test } from '@playwright/test'
const urls=[
  '/', '/companies', '/companies/c1', '/outlets', '/outlets/o1',
  '/visits', '/orders', '/debts', '/consignment', '/inventory',
  '/store-stock?outlet=o1','/sales-plans','/fleet','/control',
  '/routes', '/routes/r1', '/documents', '/team', '/settings',
]
for(const width of [320,375,390,428,768]){
  test('no horizontal page scroll at '+width+'px', async({page})=>{
    await page.setViewportSize({width,height:840})
    for(const url of urls){
      await page.goto(url)
      await expect(page.locator('main h1').first(),url).toBeVisible()
      expect(new URL(page.url()).pathname,'actual route for '+url).toBe(url.split('?')[0])
      const sizes=await page.evaluate(()=>({
        viewport:window.innerWidth,
        html:document.documentElement.scrollWidth,
        body:document.body.scrollWidth,
      }))
      expect(sizes.html,url+' document width').toBeLessThanOrEqual(sizes.viewport+1)
      expect(sizes.body,url+' body width').toBeLessThanOrEqual(sizes.viewport+1)
    }
  })
}
test('search a company and open mobile card',async({page})=>{
  await page.setViewportSize({width:375,height:812})
  await page.goto('/companies')
  await expect(page.locator('.mobile-record').first()).toBeVisible()
  await expect(page.locator('.table-scroll')).toBeHidden()
  await page.getByRole('textbox',{name:'Поиск компании'}).fill('000000100101')
  await expect(page.locator('.mobile-record')).toHaveCount(1)
  await expect(page.locator('.mobile-record-title')).toContainText('Акварель Снаб')
  await page.locator('.mobile-record-open').first().click()
  await expect(page).toHaveURL(/\/companies\/c-demo-001$/)
})
test('receipt and fleet forms work at 320px',async({page})=>{
  await page.setViewportSize({width:320,height:720})
  await page.goto('/inventory')
  await page.getByRole('button',{name:'Оформить поступление'}).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByText('Номер партии *')).toBeVisible()
  await page.getByRole('button',{name:'Закрыть'}).click()
  await page.goto('/fleet')
  await page.getByRole('button',{name:'Добавить машину'}).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByText('Объём кузова, м³ *')).toBeVisible()
})
test('waybill preview makes no OCR claim',async({page})=>{
  await page.setViewportSize({width:375,height:812})
  await page.goto('/documents')
  await page.getByRole('button',{name:'Новая накладная'}).click()
  const dlg=page.getByRole('dialog')
  await dlg.locator('select').nth(1).selectOption({index:1})
  await dlg.getByRole('button',{name:'Показать пример распознавания'}).click()
  await expect(dlg.getByText('ПРИМЕР ЗАПОЛНЕНИЯ — НЕ РЕЗУЛЬТАТ РАСПОЗНАВАНИЯ')).toBeVisible()
  await expect(dlg.getByText('Файл не отправляется на сервер')).toBeVisible()
})


test('semantic icons and role-aware bottom navigation at 320px',async({page})=>{
  await page.setViewportSize({width:320,height:740})
  await page.goto('/')
  const bottom=page.locator('.mobile-bottom-nav')
  await expect(bottom).toBeVisible()
  await expect(bottom.locator('a')).toHaveCount(4)
  await expect(bottom.locator('a svg')).toHaveCount(4)
  await expect(bottom.getByRole('button',{name:'Все разделы'})).toBeVisible()
  await bottom.getByRole('button',{name:'Все разделы'}).click()
  await expect(page.locator('.sidebar.sidebar-open')).toBeVisible()
  await expect(page.locator('.sidebar .nav-link svg').first()).toBeVisible()
  await page.getByRole('button',{name:'Закрыть меню'}).click()
  await page.getByRole('button',{name:'Настройки тестового пользователя'}).click()
  await page.locator('.account-popover select').selectOption('u4')
  await expect(bottom.getByRole('link',{name:'Визиты'})).toBeVisible()
  await expect(bottom.getByRole('link',{name:'У клиентов'})).toBeVisible()
  await expect(page.locator('.topbar-account-avatar svg')).toBeVisible()
})

test('control center filters actionable alerts and follows exact stock batch',async({page})=>{
  await page.setViewportSize({width:375,height:812})
  await page.goto('/control')
  await expect(page.getByRole('heading',{name:'Центр контроля'})).toBeVisible()
  await expect(page.locator('.control-record').first()).toBeVisible()
  await page.getByRole('combobox',{name:'Направление контроля'}).selectOption('warehouse')
  const warehouse=page.locator('.control-record').first()
  await expect(warehouse).toBeVisible()
  await warehouse.click()
  await expect(page).toHaveURL(/\/inventory\?warehouse=/)
  await expect(page.getByRole('heading',{name:'Склад и сроки годности'})).toBeVisible()
})
test('control center honors driver visibility',async({page})=>{
  await page.setViewportSize({width:390,height:830})
  await page.goto('/control')
  await page.getByRole('button',{name:'Настройки тестового пользователя'}).click()
  await page.locator('.account-popover select').selectOption('u8')
  await expect(page.getByRole('heading',{name:'Центр контроля'})).toBeVisible()
  await expect(page.getByRole('combobox',{name:'Направление контроля'}).locator('option[value="finance"]')).toHaveCount(0)
  await expect(page.getByRole('combobox',{name:'Направление контроля'}).locator('option[value="warehouse"]')).toHaveCount(0)
  await expect(page.locator('.mobile-bottom-nav a').first()).toContainText('Контроль')
})
