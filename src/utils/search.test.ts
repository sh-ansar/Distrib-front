import { describe, expect, it } from 'vitest'
import { generateDemoDirectory } from '@/data/demoDirectory'
import { createDemoData } from '@/data/seed'
import { matchesSearch, normalizeSearch } from './search'

describe('directory and company search', () => {
  it('creates a sizeable but fully synthetic multi-outlet directory', () => {
    const { customers, outlets } = generateDemoDirectory()
    expect(customers.length).toBe(48)
    expect(outlets.length).toBe(96)
    expect(new Set(customers.map(c => c.bin)).size).toBe(customers.length)
    expect(new Set(outlets.map(o => o.id)).size).toBe(outlets.length)
    expect(outlets.every(o => customers.some(c => c.id === o.customerId))).toBe(true)
    expect(customers.every(c => c.email.endsWith('@example.invalid'))).toBe(true)
    const demo = createDemoData()
    expect(demo.customers.length).toBe(56)
    expect(demo.outlets.length).toBe(107)
    expect(demo.version).toBe(6)
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
