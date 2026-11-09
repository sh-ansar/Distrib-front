import { describe, expect, it } from 'vitest'
import { canTransitionOrder, consignmentBalance, debtBalance, isOverdue, orderTotal, orderWeight } from './domain'
import { createDemoData } from '@/data/seed'

describe('finance and inventory helpers', () => {
  it('computes order value by line items', () => {
    expect(orderTotal({items:[{productId:'p1',quantity:3,price:2500},{productId:'p2',quantity:2,price:3000}]})).toBe(13500)
  })
  it('never shows negative open debt', () => {
    expect(debtBalance({id:'x',customerId:'c',invoice:'x',issuedAt:'2026-11-01',dueAt:'2026-11-10',amount:120,paid:200})).toBe(0)
  })
  it('marks overdue only when unpaid and past due', () => {
    const d={id:'x',customerId:'c',invoice:'x',issuedAt:'2026-11-01',dueAt:'2026-11-10',amount:120,paid:0}
    expect(isOverdue(d,'2026-11-09')).toBe(false)
    expect(isOverdue(d,'2026-11-11')).toBe(true)
    expect(isOverdue({...d,paid:120},'2026-11-11')).toBe(false)
  })
  it('keeps consignment separate from debt', () => {
    const c=createDemoData().consignments[0]!
    expect(consignmentBalance(c)).toBe(c.sent-c.sold-c.returned)
  })
  it('computes approximate delivery weight', () => {
    const products=createDemoData().products
    expect(orderWeight([{productId:'p6',quantity:3,price:2200}],products)).toBe(15)
  })
})

describe('order lifecycle', () => {
  it('rejects transitions without intermediate steps',()=>{
    expect(canTransitionOrder('new','delivered')).toBe(false)
    expect(canTransitionOrder('new','confirmed')).toBe(true)
    expect(canTransitionOrder('confirmed','picking')).toBe(true)
    expect(canTransitionOrder('ready','in_route')).toBe(true)
    expect(canTransitionOrder('delivered','cancelled')).toBe(false)
  })
})
