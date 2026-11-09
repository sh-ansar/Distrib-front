import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useDistributionStore } from './distribution'
import { dayOffset, debtBalance, isOverdue } from '@/utils/domain'

beforeEach(()=>{setActivePinia(createPinia())})
describe('demo domain workflows', () => {
  it('scopes stores to current sales representative',()=>{
    const s=useDistributionStore()
    s.changeDemoUser('u4')
    expect(s.visibleOutlets.every(o=>o.repId==='u4')).toBe(true)
    expect(s.visibleOrders.every(o=>s.visibleOutlets.some(x=>x.id===o.outletId))).toBe(true)
  })
  it('requires permissions for payment writes',()=>{
    const s=useDistributionStore()
    s.changeDemoUser('u4')
    expect(()=>s.registerPayment('d1',100)).toThrow('Недостаточно прав')
  })
  it('reserves and releases stock on confirmation and cancellation',()=>{
    const s=useDistributionStore()
    const initial=s.data.stocks.find(x=>x.productId==='p6'&&x.warehouseId==='w1')!.reserved
    const order=s.createOrder({outletId:'o1',deliveryDate:dayOffset(1),notes:'',items:[{productId:'p6',quantity:2,price:2200}]})
    s.setOrderStatus(order.id,'confirmed')
    expect(s.data.stocks.find(x=>x.productId==='p6'&&x.warehouseId==='w1')!.reserved).toBe(initial+2)
    s.setOrderStatus(order.id,'cancelled')
    expect(s.data.stocks.find(x=>x.productId==='p6'&&x.warehouseId==='w1')!.reserved).toBe(initial)
  })
  it('blocks a confirmed order for a suspended customer',()=>{
    const s=useDistributionStore()
    const order=s.createOrder({outletId:'o7',deliveryDate:dayOffset(1),notes:'',items:[{productId:'p1',quantity:1,price:2500}]})
    expect(()=>s.setOrderStatus(order.id,'confirmed')).toThrow('заблокирован')
  })
  it('blocks confirmation without warehouse stock',()=>{
    const s=useDistributionStore()
    const order=s.createOrder({outletId:'o1',deliveryDate:dayOffset(1),notes:'',items:[{productId:'p1',quantity:250,price:2500}]})
    expect(()=>s.setOrderStatus(order.id,'confirmed')).toThrow('Недостаточно остатков')
  })
  it('creates a route only for ready, unassigned orders',()=>{
    const s=useDistributionStore()
    const r=s.planRoute({date:dayOffset(1),vehicleId:'v2',driverId:'u9',orderIds:['ord3','ord4']})
    expect(r.stops.length).toBe(2)
    expect(s.data.orders.find(o=>o.id==='ord3')?.routeId).toBe(r.id)
    expect(()=>s.planRoute({date:dayOffset(1),vehicleId:'v2',driverId:'u9',orderIds:['ord3']})).toThrow('уже назначены')
  })
  it('requires stop completion before closing a route',()=>{
    const s=useDistributionStore()
    const r=s.planRoute({date:dayOffset(1),vehicleId:'v2',driverId:'u9',orderIds:['ord3']})
    s.moveRoute(r.id,'loading')
    s.moveRoute(r.id,'active')
    expect(()=>s.moveRoute(r.id,'completed')).toThrow('Сначала обработайте')
    s.finishStop(r.id,r.stops[0]!.id,'delivered','')
    s.moveRoute(r.id,'completed')
    expect(s.data.routes.find(x=>x.id===r.id)?.status).toBe('completed')
    expect(s.data.orders.find(o=>o.id==='ord3')?.status).toBe('delivered')
  })
  it('does not allow consignment reconciliation to exceed balance',()=>{
    const s=useDistributionStore()
    const record=s.data.consignments[0]!
    expect(()=>s.reconcileConsignment(record.id,999,0)).toThrow('превышает остаток')
  })
  it('cannot register more than open debt',()=>{
    const s=useDistributionStore()
    const d=s.data.debts[0]!
    expect(isOverdue(d)).toBe(true)
    expect(()=>s.registerPayment(d.id,debtBalance(d)+1)).toThrow('не превышать остаток')
    s.registerPayment(d.id,100)
    expect(debtBalance(d)).toBe(d.amount-d.paid)
  })
  it('does not store actual file contents',()=>{
    const s=useDistributionStore()
    s.addDocumentMetadata('outlet','o1','Накладная.pdf','application/pdf',123)
    const doc=s.data.documents[0]!
    expect(doc.demoOnly).toBe(true)
    expect(Object.keys(doc)).not.toContain('content')
    expect(Object.keys(doc)).not.toContain('base64')
  })
})
