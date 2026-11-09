import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useDistributionStore } from './distribution'
import { dayOffset, debtBalance, isOverdue, orderTotal } from '@/utils/domain'
import { companyProfile } from '@/utils/company'
import { createDemoData } from '@/data/seed'
import { sampleWaybill } from '@/utils/waybill'
import { sellableQty } from '@/utils/expiry'

beforeEach(()=>{setActivePinia(createPinia())})
afterEach(()=>vi.unstubAllGlobals())
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
    expect(()=>s.planRoute({date:dayOffset(1),vehicleId:'v3',driverId:'u8',orderIds:['ord3']})).toThrow('уже назначены')
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
  it('plans visits only for accessible outlets and prevents duplicates',()=>{
    const s=useDistributionStore()
    s.changeDemoUser('u4')
    expect(s.visibleVisits.every(v=>s.visibleOutlets.some(o=>o.id===v.outletId))).toBe(true)
    expect(()=>s.createVisit({outletId:'o6',plannedDate:dayOffset(2),purpose:'Проверка'})).toThrow('доступную')
    const payload={outletId:'o1',plannedDate:dayOffset(2),purpose:'Сбор нового заказа'}
    s.createVisit(payload)
    expect(()=>s.createVisit(payload)).toThrow('уже запланирован')
  })
  it('requires a real visit start and meaningful closing note',()=>{
    const s=useDistributionStore()
    const v=s.createVisit({outletId:'o2',plannedDate:dayOffset(0),purpose:'Проверка остатков'})
    expect(()=>s.finishVisit(v.id,'completed','Сделано')).toThrow('переход статуса визита')
    s.startVisit(v.id)
    expect(()=>s.finishVisit(v.id,'completed','нет')).toThrow('не менее 5')
    s.finishVisit(v.id,'completed','Остатки проверены; собрали заявку')
    expect(s.data.visits.find(x=>x.id===v.id)?.status).toBe('completed')
    expect(s.data.activities.some(a=>a.entityId==='o2'&&a.kind==='visit')).toBe(true)
  })
  it('counts unbilled confirmed orders toward customer credit exposure',()=>{
    const s=useDistributionStore()
    const customer=s.data.customers.find(c=>c.id==='c1')!
    const debt=s.data.debts.filter(d=>d.customerId==='c1').reduce((sum,d)=>sum+debtBalance(d),0)
    const active=s.data.orders.filter(o=>o.customerId==='c1'&&['confirmed','picking','ready','in_route'].includes(o.status))
      .reduce((sum,o)=>sum+orderTotal(o),0)
    customer.creditLimit=debt+active+3000
    const order1=s.createOrder({outletId:'o1',deliveryDate:dayOffset(1),notes:'',items:[{productId:'p1',quantity:1,price:2500}]})
    const order2=s.createOrder({outletId:'o2',deliveryDate:dayOffset(1),notes:'',items:[{productId:'p1',quantity:1,price:2500}]})
    s.setOrderStatus(order1.id,'confirmed')
    expect(()=>s.setOrderStatus(order2.id,'confirmed')).toThrow('с учётом уже подтверждённых')
  })
  it('rejects forged catalog pricing and inaccessible document links',()=>{
    const s=useDistributionStore()
    expect(()=>s.createOrder({outletId:'o1',deliveryDate:dayOffset(1),notes:'',items:[{productId:'p1',quantity:1,price:1}]})).toThrow('Цена товара изменилась')
    expect(()=>s.addDocumentMetadata('outlet','not-existing','fake.pdf','application/pdf',0)).toThrow('несуществующему')
  })
  it('refuses stock underflow before accepting delivery',()=>{
    const s=useDistributionStore()
    const route=s.planRoute({date:dayOffset(1),vehicleId:'v2',driverId:'u9',orderIds:['ord3']})
    s.moveRoute(route.id,'loading')
    s.moveRoute(route.id,'active')
    const stock=s.data.stocks.find(x=>x.productId==='p1'&&x.warehouseId==='w1')!
    stock.onHand=0
    expect(()=>s.finishStop(route.id,route.stops[0]!.id,'delivered','')).toThrow('Недостаточно товара или резерва')
    expect(route.stops[0]!.status).toBe('pending')
    expect(s.data.orders.find(o=>o.id==='ord3')?.status).toBe('in_route')
  })
  it('allows editing an extended dossier but does not change credit terms',()=>{
    const s=useDistributionStore()
    const c=s.data.customers.find(x=>x.id==='c1')!
    const originalLimit=c.creditLimit
    const originalTerms=c.termsDays
    const payload={
      legalName:'ТОО «Обновлённая демо-компания»',bin:c.bin,
      contactName:'Демо контакт',phone:'+7 000 123 45 67',email:'contact@example.invalid',
      profile:{...companyProfile(c.profile),tradingName:'Демо Wave',deliveryDays:'Пн, Пт',
        receivingWindow:'09:00–12:00',deliveryRequirements:'Позвонить за 30 минут'},
    }
    s.updateCustomer(c.id,payload)
    expect(c.profile?.receivingWindow).toBe('09:00–12:00')
    expect(c.profile?.deliveryRequirements).toContain('30 минут')
    expect(c.legalName).toContain('Обновлённая')
    expect(c.creditLimit).toBe(originalLimit)
    expect(c.termsDays).toBe(originalTerms)
    expect(s.data.activities.some(a=>a.entityId===c.id&&a.kind==='updated')).toBe(true)
  })
  it('restricts sensitive company editing and duplicate identifiers',()=>{
    const s=useDistributionStore()
    const c=s.data.customers.find(x=>x.id==='c1')!
    const payload={
      legalName:c.legalName,bin:s.data.customers.find(x=>x.id==='c2')!.bin,
      contactName:c.contactName,phone:c.phone,email:c.email,profile:companyProfile(c.profile),
    }
    expect(()=>s.updateCustomer(c.id,payload)).toThrow('БИН уже существует')
    s.changeDemoUser('u4')
    expect(()=>s.updateCustomer(c.id,{...payload,bin:c.bin})).toThrow('Недостаточно прав')
  })
  it('keeps sales route visibility limited to assigned outlets',()=>{
    const s=useDistributionStore()
    s.changeDemoUser('u4')
    expect(s.visibleRoutes.length).toBeGreaterThan(0)
    expect(s.visibleRoutes.every(route=>route.stops.every(stop=>
      s.visibleOutlets.some(outlet=>outlet.id===stop.outletId)))).toBe(true)
    expect(s.visibleRoutes.some(route=>route.stops.some(stop=>stop.outletId==='o10'))).toBe(false)
  })
  it('keeps company delivery data when adding and updating shops',()=>{
    const s=useDistributionStore()
    const added=s.createOutlet({customerId:'c1',name:'Магазин для теста',address:'Астана, Демо 55',
      district:'Есиль',contactName:'Тест',phone:'',repId:'u4',notes:'',
      receivingWindow:'08:00–12:00',accessInstructions:'Вход со двора'})
    expect(added.receivingWindow).toBe('08:00–12:00')
    s.updateOutlet(added.id,{name:added.name,address:added.address,contactName:'',phone:'',notes:'',
      receivingWindow:'10:00–15:00',accessInstructions:'Звонок диспетчеру'})
    expect(added.accessInstructions).toBe('Звонок диспетчеру')
  })
  it('upgrades old browser data without discarding existing customer edits',()=>{
    const old=createDemoData()
    old.version=3
    old.customers[0]!.contactName='Контакт сохранён до миграции'
    delete old.customers[0]!.profile
    const fake=new Map<string,string>([['itp-distribution-demo-v1',JSON.stringify(old)]])
    vi.stubGlobal('localStorage',{
      getItem:(key:string)=>fake.get(key)??null,
      setItem:(key:string,value:string)=>{fake.set(key,value)},
    })
    const s=useDistributionStore()
    s.initialize()
    expect(s.data.version).toBe(5)
    expect(s.data.customers.find(c=>c.id==='c1')?.contactName).toBe('Контакт сохранён до миграции')
    expect(s.data.customers.find(c=>c.id==='c1')?.profile?.tradingName).toBeTruthy()
    expect(s.data.outlets.find(o=>o.id==='o1')?.receivingWindow).toBeTruthy()
  })
  it('receives a numbered batch and updates stock quantities',()=>{
    const s=useDistributionStore()
    const onHand=s.data.stocks.find(x=>x.warehouseId==='w1'&&x.productId==='p6')!.onHand
    const batch=s.receiveBatch({warehouseId:'w1',productId:'p6',batchNumber:'RECEIPT-001',
      receivedDate:dayOffset(0),expiryDate:dayOffset(90),quantity:24,
      supplier:'Тестовый поставщик',receiptRef:'ПСТ-501'})
    expect(batch.initialQty).toBe(24)
    expect(batch.remainingQty).toBe(24)
    expect(s.data.stocks.find(x=>x.warehouseId==='w1'&&x.productId==='p6')!.onHand).toBe(onHand+24)
    expect(()=>s.receiveBatch({warehouseId:'w1',productId:'p6',batchNumber:'RECEIPT-001',
      receivedDate:dayOffset(0),expiryDate:dayOffset(90),quantity:1,supplier:'',receiptRef:''})).toThrow('Партия с таким номером')
  })
  it('excludes expired batches from sellable stock',()=>{
    const s=useDistributionStore()
    s.data.stockBatches.filter(b=>b.productId==='p6'&&b.warehouseId==='w1').forEach(b=>{b.expiryDate=dayOffset(-1)})
    expect(sellableQty(s.data.stockBatches,'p6','w1')).toBe(0)
    const order=s.createOrder({outletId:'o1',deliveryDate:dayOffset(1),notes:'',
      items:[{productId:'p6',quantity:1,price:2200}]})
    expect(()=>s.setOrderStatus(order.id,'confirmed')).toThrow('Недостаточно остатков')
  })
  it('records FEFO batch allocations for full deliveries',()=>{
    const s=useDistributionStore()
    const r=s.planRoute({date:dayOffset(1),vehicleId:'v2',driverId:'u9',forwarderId:'u12',orderIds:['ord3']})
    s.moveRoute(r.id,'loading');s.moveRoute(r.id,'active')
    s.finishStop(r.id,r.stops[0]!.id,'delivered','')
    const shipments=s.data.outletShipments.filter(x=>x.routeId===r.id)
    expect(shipments.length).toBeGreaterThan(0)
    expect(shipments.every(x=>x.expiryDate>=dayOffset(0))).toBe(true)
    expect(shipments.filter(x=>x.productId==='p1').reduce((sum,x)=>sum+x.quantity,0)).toBe(16)
  })
  it('keeps store checks separate from delivery history and checks access',()=>{
    const s=useDistributionStore()
    s.changeDemoUser('u4')
    expect(()=>s.recordOutletCheck({outletId:'o3',productId:'p1',batchNumber:'TEST-01',
      expiryDate:dayOffset(6),quantity:4,notes:''})).toThrow('недоступен')
    const check=s.recordOutletCheck({outletId:'o1',productId:'p1',batchNumber:'TEST-01',
      expiryDate:dayOffset(6),quantity:4,notes:'Полка пересчитана'})
    expect(check.quantity).toBe(4)
    expect(s.data.outletShipments.some(ship=>ship.id===check.id)).toBe(false)
  })
  it('allows planning by supervisor but prevents sales role from editing targets',()=>{
    const s=useDistributionStore()
    s.changeDemoUser('u3')
    const plan=s.saveSalesPlan({employeeId:'u4',month:'2026-11',revenueTarget:100000,
      visitsTarget:25,outletsTarget:15,notes:'Приоритет клиентов'})
    expect(plan.revenueTarget).toBe(100000)
    s.changeDemoUser('u4')
    expect(()=>s.saveSalesPlan({employeeId:'u4',month:'2026-11',revenueTarget:1,visitsTarget:1,
      outletsTarget:1,notes:''})).toThrow('Недостаточно прав')
  })
  it('checks vehicle and employee scheduling conflicts',()=>{
    const s=useDistributionStore()
    const r=s.planRoute({date:dayOffset(1),vehicleId:'v2',driverId:'u9',forwarderId:'u12',orderIds:['ord3']})
    expect(r.forwarderId).toBe('u12')
    expect(()=>s.planRoute({date:dayOffset(1),vehicleId:'v2',driverId:'u8',forwarderId:'u13',orderIds:['ord4']}))
      .toThrow('Автомобиль уже назначен')
    expect(()=>s.planRoute({date:dayOffset(1),vehicleId:'v3',driverId:'u9',forwarderId:'u13',orderIds:['ord4']}))
      .toThrow('Водитель уже назначен')
  })
  it('saves explicit mock waybill fields without real file bytes',()=>{
    const s=useDistributionStore()
    const doc=s.addDocumentMetadata('order','ord3','Образец накладной.pdf','application/pdf',131072)
    const sample=sampleWaybill('order','ord3',s.data)
    expect(sample.simulated).toBe(true)
    s.saveSampleWaybill(doc.id,sample)
    expect(doc.sampleExtraction?.verified).toBe(false)
    s.verifySampleWaybill(doc.id)
    expect(doc.sampleExtraction?.verified).toBe(true)
    expect(JSON.stringify(doc)).not.toContain('base64')
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
