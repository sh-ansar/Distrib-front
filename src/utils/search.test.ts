import { describe, expect, it } from 'vitest'
import { generateDemoDirectory } from '@/data/demoDirectory'
import { publicStoreLeads, twoGisSearchUrl } from '@/data/publicStores'
import { createDemoData } from '@/data/seed'
import { matchesSearch, normalizeSearch } from './search'

describe('directory and company search', () => {
  it('creates a sizeable but fully synthetic multi-outlet directory', () => {
    const { customers, outlets } = generateDemoDirectory()
    expect(customers.length).toBe(240)
    expect(outlets.length).toBe(989)
    expect(new Set(customers.map(c => c.bin)).size).toBe(customers.length)
    expect(new Set(outlets.map(o => o.id)).size).toBe(outlets.length)
    expect(outlets.every(o => customers.some(c => c.id === o.customerId))).toBe(true)
    expect(customers.every(c => !c.email || c.email.endsWith('@example.invalid'))).toBe(true)
    const demo = createDemoData()
    expect(demo.customers.length).toBe(248)
    expect(demo.outlets.length).toBe(1000)
    expect(demo.version).toBe(6)
  })
  it('preserves all historical identifiers and generates unique searchable shops',()=>{
    const data=createDemoData()
    expect(data.outlets.find(o=>o.id==='o-demo-001-1')?.name).toContain('Акварель Снаб')
    expect(data.outlets.find(o=>o.id==='o-demo-002-2')).toBeDefined()
    expect(new Set(data.outlets.map(o=>o.id)).size).toBe(1000)
    expect(data.outlets.every(o=>data.customers.some(c=>c.id===o.customerId))).toBe(true)
    expect(data.outlets.filter(o=>o.id.startsWith('o-demo-')).length).toBe(989)
    expect(data.outlets.some(o=>matchesSearch('0989',[o.name,o.address]))).toBe(true)
  })
  it('keeps public examples separate from synthetic customers and requires source links',()=>{
    const data=createDemoData()
    expect(publicStoreLeads.length).toBe(35)
    expect(new Set(publicStoreLeads.map(s=>s.id)).size).toBe(publicStoreLeads.length)
    expect(publicStoreLeads.every(s=>s.sourceUrl.startsWith('https://')&&s.address.startsWith('Астана, '))).toBe(true)
    expect(publicStoreLeads.every(s=>!data.outlets.some(o=>o.id===s.id))).toBe(true)
    expect(twoGisSearchUrl(publicStoreLeads[0]!)).toContain('https://2gis.kz/astana/search/')
    expect(publicStoreLeads.some(s=>s.brand==='Magnum')).toBe(true)
    expect(publicStoreLeads.some(s=>s.brand==='iStop')).toBe(true)
  })
  it('matches company names without case or punctuation sensitivity', () => {
    expect(matchesSearch('  ДАЛА фуд ', ['ТОО «Дала Фуд»'])).toBe(true)
    expect(matchesSearch('елка', ['Магазин Ёлка'])).toBe(true)
    expect(matchesSearch('снаб 002', ['Снаб','магазин 002'])).toBe(true)
    expect(normalizeSearch('ТОО «Ёлка»')).toBe('тоо елка')
    expect(matchesSearch('несуществующий', ['ТОО Дала'])).toBe(false)
  })
  it('allows looking up a company by full or formatted numeric identifier', () => {
    expect(matchesSearch('000000100101',['000000100101'])).toBe(true)
    expect(matchesSearch('+7 (000) 000 00 01',['+7 000 000 00 01'])).toBe(true)
  })
})
