import { describe,expect,it } from 'vitest'
import { allocateFEFO,daysToExpiry,expiryState,outletLastChecks,estimatedVolume } from './expiry'
import type { StockBatch } from '@/types/domain'

const make=(id:string,expiryDate:string,remainingQty:number):StockBatch=>({
  id,warehouseId:'w1',productId:'p1',batchNumber:id,
  receivedDate:'2026-10-01',expiryDate,initialQty:remainingQty,remainingQty,supplier:'Sample',receiptRef:'X'
})
describe('expiry and stock traceability',()=>{
  it('classifies expiry exactly on the boundary',()=>{
    expect(daysToExpiry('2026-11-10','2026-11-10')).toBe(0)
    expect(expiryState('2026-11-09','2026-11-10')).toBe('expired')
    expect(expiryState('2026-11-10','2026-11-10')).toBe('urgent')
    expect(expiryState('2026-12-10','2026-11-10')).toBe('urgent')
    expect(expiryState('2027-03-10','2026-11-10')).toBe('ok')
  })
  it('ships nearest eligible lot first and excludes expired stock',()=>{
    const lots=[make('later','2027-07-01',20),make('expired','2026-11-09',100),make('near','2026-11-28',10)]
    expect(allocateFEFO(lots,'p1','w1',15,'2026-11-10')).toEqual([{batchId:'near',quantity:10},{batchId:'later',quantity:5}])
    expect(()=>allocateFEFO(lots,'p1','w1',31,'2026-11-10')).toThrow('Недостаточно товара')
  })
  it('keeps the latest shelf-check by product and lot',()=>{
    const checks=[
      {id:'a',outletId:'o1',productId:'p1',batchNumber:'AB',expiryDate:'2027-01-01',quantity:5,checkedAt:'2026-11-01',checkedBy:'u1',notes:''},
      {id:'b',outletId:'o1',productId:'p1',batchNumber:'AB',expiryDate:'2027-01-01',quantity:3,checkedAt:'2026-11-10',checkedBy:'u1',notes:''}
    ]
    expect(outletLastChecks(checks,'o1').map(x=>x.quantity)).toEqual([3])
  })
  it('computes load volume',()=>{
    expect(estimatedVolume([{productId:'p1',quantity:2,price:1}],[{id:'p1',sku:'x',name:'x',category:'x',unit:'unit',price:1,weightKg:1,active:true,volumeM3:.04}])).toBe(.08)
  })
})
