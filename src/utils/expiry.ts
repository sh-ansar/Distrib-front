import type { Product, StockBatch, OutletStockCheck, OrderItem } from '@/types/domain'
import { isoDay } from './domain'

export const daysToExpiry=(expiry:string,today=isoDay()):number =>
  Math.round((Date.parse(expiry+'T12:00:00Z')-Date.parse(today+'T12:00:00Z'))/86400000)

export function expiryState(expiry:string,today=isoDay()): 'expired' | 'urgent' | 'soon' | 'ok' {
  const days=daysToExpiry(expiry,today)
  if(days<0)return 'expired'
  if(days<=30)return 'urgent'
  if(days<=90)return 'soon'
  return 'ok'
}
export const expiryLabel=(date:string,today=isoDay())=>{
  const state=expiryState(date,today)
  return state==='expired'?'Просрочен':state==='urgent'?'До 30 дней':state==='soon'?'До 90 дней':'В норме'
}
/** FEFO allocation; never ship expired lots. Does not write to storage. */
export function allocateFEFO(batches:StockBatch[],productId:string,warehouseId:string,qty:number,today=isoDay()):Array<{batchId:string;quantity:number}> {
  if(!Number.isInteger(qty)||qty<=0)throw new Error('Укажите положительное количество.')
  let remaining=qty
  const allocations:Array<{batchId:string;quantity:number}>=[]
  for(const batch of batches
    .filter(b=>b.productId===productId&&b.warehouseId===warehouseId&&b.remainingQty>0&&b.expiryDate>=today)
    .sort((a,b)=>a.expiryDate.localeCompare(b.expiryDate)||a.receivedDate.localeCompare(b.receivedDate))) {
    const allocated=Math.min(remaining,batch.remainingQty)
    if(allocated>0)allocations.push({batchId:batch.id,quantity:allocated})
    remaining-=allocated
    if(remaining===0)break
  }
  if(remaining>0)throw new Error('Недостаточно товара с действующим сроком годности.')
  return allocations
}
export function sellableQty(batches:StockBatch[],productId:string,warehouseId:string,today=isoDay()):number {
  return batches.filter(b=>b.productId===productId&&b.warehouseId===warehouseId&&b.expiryDate>=today)
    .reduce((sum,b)=>sum+b.remainingQty,0)
}
export function outletLastChecks(checks:OutletStockCheck[],outletId:string):OutletStockCheck[] {
  const latest=new Map<string,OutletStockCheck>()
  for(const check of checks.filter(c=>c.outletId===outletId)){
    const key=check.productId+'|'+check.batchNumber
    if(!latest.has(key)||latest.get(key)!.checkedAt<check.checkedAt)latest.set(key,check)
  }
  return [...latest.values()].sort((a,b)=>a.expiryDate.localeCompare(b.expiryDate))
}
export function estimatedVolume(items:OrderItem[],products:Product[]):number {
  return items.reduce((sum,item)=>sum+item.quantity*(products.find(p=>p.id===item.productId)?.volumeM3??0),0)
}
