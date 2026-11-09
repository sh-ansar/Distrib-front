import { describe, expect, it } from 'vitest'
import { blankCompanyProfile, companyProfile, demoCompanyProfile } from './company'

describe('company dossier defaults and migration',()=>{
  it('creates an empty but complete dossier',()=>{
    const p=blankCompanyProfile()
    expect(p.vatStatus).toBe('unknown')
    expect(p.paymentMethod).toBe('bank')
    expect(p.deliveryRequirements).toBe('')
    expect(p.receivingWindow).toBe('')
  })
  it('supports old company records without profile fields',()=>{
    const p=companyProfile()
    expect(p.tradingName).toBe('')
    expect(p.legalAddress).toBe('')
  })
  it('preserves user-provided optional attributes',()=>{
    const p=companyProfile({contactPosition:'Закупщик',receivingWindow:'10:00–12:00',notes:'Демонстрация'})
    expect(p.contactPosition).toBe('Закупщик')
    expect(p.receivingWindow).toBe('10:00–12:00')
    expect(p.notes).toBe('Демонстрация')
    expect(p.vatStatus).toBe('unknown')
  })
  it('generates synthetic but useful sample operating data',()=>{
    const p=demoCompanyProfile(0)
    expect(p.category).toBeTruthy()
    expect(p.territory).toBeTruthy()
    expect(p.deliveryDays).toBeTruthy()
  })
})
