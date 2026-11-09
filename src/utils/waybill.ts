import type { DistributionData, EntityType, Order, WaybillSample } from '@/types/domain'
import { isoDay, orderTotal } from './domain'

/**
 * A deterministic illustration of fields an OCR parser could return.
 * NEVER reads the uploaded file. Requires a human review and a real OCR service in production.
 */
export function sampleWaybill(entityType:EntityType,entityId:string,data:DistributionData):WaybillSample {
  let order:Order|undefined
  if(entityType==='order') order=data.orders.find(o=>o.id===entityId)
  if(entityType==='route'){
    const route=data.routes.find(r=>r.id===entityId)
    order=data.orders.find(o=>route?.stops.some(s=>s.orderIds.includes(o.id)))
  }
  if(entityType==='outlet')order=data.orders.find(o=>o.outletId===entityId)
  if(entityType==='customer')order=data.orders.find(o=>o.customerId===entityId)
  if(entityType==='stop'){
    const stop=data.routes.flatMap(r=>r.stops).find(s=>s.id===entityId)
    order=data.orders.find(o=>stop?.orderIds.includes(o.id))
  }
  const customer=data.customers.find(c=>c.id===order?.customerId)
  const outlet=data.outlets.find(o=>o.id===order?.outletId)
  const items=order?.items.map(item=>({
    productId:item.productId,
    name:data.products.find(p=>p.id===item.productId)?.name||item.productId,
    quantity:item.quantity,
    unit:data.products.find(p=>p.id===item.productId)?.unit||'шт.',
    price:item.price,
  }))??[{
    productId:data.products[0]?.id||'unknown',
    name:data.products[0]?.name||'Образец товара',
    quantity:1,unit:data.products[0]?.unit||'шт.',price:data.products[0]?.price||0,
  }]
  return {
    simulated:true,verified:false,
    invoiceNumber:'МАКЕТ-'+(order?.number||'0001'),
    invoiceDate:order?.deliveryDate||isoDay(),
    supplier:'Darmen New Wave (образец)',
    recipient:customer?.legalName||outlet?.name||'Получатель (образец)',
    items,
    total:order?orderTotal(order):items.reduce((sum,item)=>sum+item.quantity*item.price,0),
  }
}
