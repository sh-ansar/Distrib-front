import type { OutletStockCheck, SalesPlan, Stock, StockBatch, OutletShipment } from '@/types/domain'
import { dayOffset } from '@/utils/domain'

/** Test fixtures: quantities are illustrative, never accounting records. */
export function batchesForStocks(stocks:Stock[]):StockBatch[] {
  return stocks.flatMap((stock,index)=>{
    if(stock.onHand<=0)return []
    const near=Math.max(1,Math.floor(stock.onHand*.23))
    const far=stock.onHand-near
    const code=stock.warehouseId+'-'+stock.productId
    const firstExpiry= index%9===0?dayOffset(-3):dayOffset(13+(index%11)*5)
    const receivedDate=dayOffset(-28-(index%8))
    const list:StockBatch[]=[{
      id:'lot-'+code+'-a',productId:stock.productId,warehouseId:stock.warehouseId,
      batchNumber:'BN-'+String(index+1001)+'-A',receivedDate,expiryDate:firstExpiry,
      initialQty:near,remainingQty:near,supplier:'Пример поставщика',receiptRef:'ПСТ-'+String(index+301),
    }]
    if(far>0)list.push({
      id:'lot-'+code+'-b',productId:stock.productId,warehouseId:stock.warehouseId,
      batchNumber:'BN-'+String(index+1001)+'-B',receivedDate:dayOffset(-11),
      expiryDate:dayOffset(160+(index%8)*20),
      initialQty:far,remainingQty:far,supplier:'Пример поставщика',receiptRef:'ПСТ-'+String(index+302),
    })
    return list
  })
}
export function sampleOutletChecks():OutletStockCheck[] {
  return [
    {id:'check1',outletId:'o1',productId:'p3',batchNumber:'RET-521',expiryDate:dayOffset(12),quantity:9,checkedAt:new Date().toISOString(),checkedBy:'u4',notes:'Ручной пересчёт полки'},
    {id:'check2',outletId:'o3',productId:'p5',batchNumber:'RET-526',expiryDate:dayOffset(41),quantity:15,checkedAt:new Date().toISOString(),checkedBy:'u5',notes:'Плановая сверка магазина'},
    {id:'check3',outletId:'o7',productId:'p6',batchNumber:'RET-520',expiryDate:dayOffset(-2),quantity:6,checkedAt:new Date().toISOString(),checkedBy:'u6',notes:'Срок истёк, нужна сверка'},
    {id:'check4',outletId:'o9',productId:'p1',batchNumber:'RET-700',expiryDate:dayOffset(80),quantity:8,checkedAt:new Date().toISOString(),checkedBy:'u4',notes:'Проверено при визите'},
  ]
}
export function sampleShipments():OutletShipment[] {
  return [
    {id:'shipment1',outletId:'o11',productId:'p6',batchId:'lot-w1-p6-b',batchNumber:'BN-1011-B',expiryDate:dayOffset(280),quantity:12,orderId:'ord10',routeId:'',deliveredAt:dayOffset(-1)},
    {id:'shipment2',outletId:'o1',productId:'p3',batchId:'lot-w1-p3-b',batchNumber:'BN-1005-B',expiryDate:dayOffset(200),quantity:6,orderId:'ord11',routeId:'',deliveredAt:dayOffset(-2)},
  ]
}
export function samplePlans():SalesPlan[] {
  const month=dayOffset(0).slice(0,7)
  return [
    {id:'sp1',employeeId:'u4',month,revenueTarget:2900000,visitsTarget:60,outletsTarget:20,notes:'Новые заявки, возвраты и выкладка'},
    {id:'sp2',employeeId:'u5',month,revenueTarget:2600000,visitsTarget:52,outletsTarget:18,notes:'План по центральному району'},
    {id:'sp3',employeeId:'u6',month,revenueTarget:2350000,visitsTarget:50,outletsTarget:16,notes:'Дебиторка и новые торговые точки'},
  ]
}
