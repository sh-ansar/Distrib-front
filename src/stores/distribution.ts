import { defineStore } from 'pinia'
import { can, type Capability } from '@/access'
import { createDemoData } from '@/data/seed'
import { companyProfile } from '@/utils/company'
import { allocateFEFO, estimatedVolume, sellableQty } from '@/utils/expiry'
import { batchesForStocks, sampleOutletChecks, sampleShipments, samplePlans } from '@/data/operationsSeed'
import type { Activity, Customer, CustomerProfile, Debt, DeliveryRoute, DistributionData, DocumentRecord, Employee, OutletShipment, Order, OrderItem, OrderStatus, Outlet, Role, RouteStatus, StopStatus, Visit, VisitStatus, StockBatch, SalesPlan, WaybillSample, Vehicle } from '@/types/domain'
import { canTransitionOrder, consignmentBalance, debtBalance, isoDay, orderTotal, orderWeight, uid } from '@/utils/domain'

const STORAGE_KEY = 'itp-distribution-demo-v1'
const USER_KEY = 'itp-distribution-demo-user'
const inDemo = import.meta.env.VITE_DATA_MODE !== 'api'
export class DomainError extends Error {
  constructor(message: string) { super(message); this.name = 'DomainError' }
}
function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new DomainError(message)
}
function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T }
function validDemo(data: unknown): data is DistributionData {
  if (!data || typeof data !== 'object') return false
  const candidate = data as Record<string, unknown>
  return (candidate.version === 1 || candidate.version === 2 || candidate.version === 3 || candidate.version === 4 || candidate.version === 5) && [
    'customers','outlets','products','warehouses','stocks','orders','debts','consignments',
    'employees','vehicles','routes','documents','activities',
  ].every(key => Array.isArray(candidate[key])) && (candidate.version === 1 || Array.isArray(candidate.visits)) &&
    (candidate.version !== 5 || ['stockBatches','outletShipments','outletStockChecks','salesPlans'].every(key=>Array.isArray(candidate[key])))
}
function cleanNumber(value: number): boolean { return Number.isFinite(value) && value >= 0 }

export const useDistributionStore = defineStore('distribution', {
  state: () => ({
    data: createDemoData() as DistributionData,
    currentUserId: 'u1',
    initialized: false,
    search: '',
    notice: null as { text: string; tone: 'success' | 'error' } | null,
  }),
  getters: {
    demoMode: () => inDemo,
    currentUser(state): Employee | undefined { return state.data.employees.find(e => e.id === state.currentUserId) },
    currentRole(): Role { return this.currentUser?.role ?? 'driver' },
    visibleOutlets(state): Outlet[] {
      const employee = state.data.employees.find(e => e.id === state.currentUserId)
      if (employee?.role === 'sales') return state.data.outlets.filter(o => o.repId === employee.id)
      if (employee?.role === 'driver' || employee?.role === 'forwarder') {
        const outletIds = new Set(state.data.routes.filter(r => r.driverId === employee.id || r.forwarderId === employee.id).flatMap(r => r.stops.map(s => s.outletId)))
        return state.data.outlets.filter(o => outletIds.has(o.id))
      }
      return state.data.outlets
    },
    visibleOrders(): Order[] {
      const ids = new Set(this.visibleOutlets.map(o => o.id))
      return this.data.orders.filter(o => ids.has(o.outletId))
    },
    visibleVisits(): Visit[] {
      const ids = new Set(this.visibleOutlets.map(o => o.id))
      return this.data.visits.filter(v => ids.has(v.outletId))
    },
    visibleDebts(): Debt[] {
      const ids = new Set(this.visibleOutlets.map(o => o.customerId))
      return this.data.debts.filter(d => ids.has(d.customerId))
    },
    visibleRoutes(state): DeliveryRoute[] {
      const employee = state.data.employees.find(e => e.id === state.currentUserId)
      if (employee?.role === 'driver' || employee?.role === 'forwarder') return state.data.routes.filter(r => r.driverId === employee.id || r.forwarderId === employee.id)
      if (employee?.role === 'sales') {
        const ids = new Set(state.data.outlets.filter(o=>o.repId===employee.id).map(o=>o.id))
        return state.data.routes.map(r=>({...r,stops:r.stops.filter(s=>ids.has(s.outletId))}))
          .filter(r=>r.stops.length>0)
      }
      return state.data.routes
    },
    visibleCustomers(): Customer[] {
      const employee = this.currentUser
      if (employee?.role !== 'sales' && employee?.role !== 'driver' && employee?.role !== 'forwarder') return this.data.customers
      const ids = new Set(this.visibleOutlets.map(o => o.customerId))
      return this.data.customers.filter(c => ids.has(c.id))
    },
  },
  actions: {
    initialize() {
      if (this.initialized) return
      this.initialized = true
      if (!inDemo || typeof localStorage === 'undefined') return
      try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
          const parsed: unknown = JSON.parse(saved)
          if (validDemo(parsed)) {
            // Upgrade old browser sessions without overwriting previously edited records.
            const enriched = createDemoData()
            const sampleCustomers = new Map(enriched.customers.map(c=>[c.id,c]))
            const sampleOutlets = new Map(enriched.outlets.map(o=>[o.id,o]))
            const customerIds = new Set(parsed.customers.map(c=>c.id))
            const outletIds = new Set(parsed.outlets.map(o=>o.id))
            this.data = {
              ...parsed, version: 5,
              visits: Array.isArray(parsed.visits) ? parsed.visits : [],
              stockBatches: Array.isArray(parsed.stockBatches) ? parsed.stockBatches : batchesForStocks(parsed.stocks),
              outletShipments: Array.isArray(parsed.outletShipments) ? parsed.outletShipments : sampleShipments(),
              outletStockChecks: Array.isArray(parsed.outletStockChecks) ? parsed.outletStockChecks : sampleOutletChecks(),
              salesPlans: Array.isArray(parsed.salesPlans) ? parsed.salesPlans : samplePlans(),
              customers: [
                ...parsed.customers.map(c=>({...c,profile:companyProfile(c.profile ?? sampleCustomers.get(c.id)?.profile)})),
                ...enriched.customers.filter(c=>!customerIds.has(c.id)),
              ],
              outlets: [
                ...parsed.outlets.map(o=>({...o,
                  receivingWindow:o.receivingWindow ?? sampleOutlets.get(o.id)?.receivingWindow ?? '',
                  accessInstructions:o.accessInstructions ?? sampleOutlets.get(o.id)?.accessInstructions ?? '',
                })),
                ...enriched.outlets.filter(o=>!outletIds.has(o.id)),
              ],
            }
          }
        }
        const userId = localStorage.getItem(USER_KEY)
        if (userId && this.data.employees.some(e => e.id === userId && e.active)) this.currentUserId = userId
      } catch { this.data = createDemoData() }
    },
    permitted(capability: Capability): boolean { return this.demoMode && can(this.currentRole, capability) },
    require(capability: Capability) { invariant(this.permitted(capability), 'Недостаточно прав или недоступен сервер данных.') },
    notify(text: string, tone: 'success' | 'error' = 'success') { this.notice = { text, tone } },
    persist() {
      invariant(this.demoMode, 'Работа с данными недоступна до подключения API.')
      if (typeof localStorage === 'undefined') return
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data))
        localStorage.setItem(USER_KEY, this.currentUserId)
      } catch { this.notify('Локальное хранилище переполнено: изменения не сохранены.', 'error') }
    },
    resetDemo() {
      invariant(this.demoMode, 'Сброс разрешён только для демонстрации.')
      this.data = createDemoData()
      this.currentUserId = 'u1'
      this.persist()
      this.notify('Демонстрационные данные восстановлены.')
    },
    changeDemoUser(id: string) {
      invariant(this.demoMode, 'Переключение пользователей доступно только в демо.')
      invariant(this.data.employees.some(e => e.id === id && e.active), 'Пользователь не найден.')
      this.currentUserId = id
      this.persist()
    },
    log(entityType: Activity['entityType'], entityId: string, kind: string, message: string) {
      this.data.activities.unshift({ id: uid('act'), entityType, entityId, kind, message, actorId: this.currentUserId, createdAt: new Date().toISOString() })
    },
    createCustomer(payload: {legalName:string;bin:string;contactName:string;phone:string;email:string;creditLimit:number;termsDays:number;profile?:Partial<CustomerProfile>}): Customer {
      this.require('companies:edit')
      invariant(payload.legalName.trim().length >= 3, 'Укажите название юридического лица.')
      invariant(/^\d{12}$/.test(payload.bin), 'БИН должен содержать 12 цифр.')
      invariant(!this.data.customers.some(c => c.bin === payload.bin), 'Контрагент с таким БИН уже существует.')
      invariant(cleanNumber(payload.creditLimit) && payload.termsDays >= 0, 'Проверьте лимит и условия оплаты.')
      const entity: Customer = {
        ...payload, legalName:payload.legalName.trim(),profile:companyProfile(payload.profile), id:uid('c'), status:'active', createdAt:isoDay(),
      }
      this.data.customers.push(entity)
      this.log('customer',entity.id,'created','Создан контрагент')
      this.persist()
      return entity
    },
    updateCustomer(id:string,payload:Pick<Customer,'legalName'|'bin'|'contactName'|'phone'|'email'> & {profile:CustomerProfile}) {
      this.require('companies:edit')
      const customer = this.visibleCustomers.find(c=>c.id===id)
      invariant(customer, 'Компания недоступна.')
      invariant(payload.legalName.trim().length>=3 && payload.legalName.length<=180,'Введите корректное наименование.')
      invariant(/^\d{12}$/.test(payload.bin),'БИН должен содержать 12 цифр.')
      invariant(!this.data.customers.some(c=>c.id!==id && c.bin===payload.bin),'Компания с таким БИН уже существует.')
      invariant(!payload.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email),'Проверьте электронную почту.')
      const profile=companyProfile(payload.profile)
      invariant(['unknown','vat','no_vat'].includes(profile.vatStatus),'Некорректный статус НДС.')
      invariant(['bank','cash','mixed'].includes(profile.paymentMethod),'Некорректный способ оплаты.')
      invariant(profile.notes.length<=3000 && profile.deliveryRequirements.length<=2000,'Примечание слишком длинное.')
      Object.assign(customer,{
        legalName:payload.legalName.trim(),bin:payload.bin,contactName:payload.contactName.trim(),
        phone:payload.phone.trim(),email:payload.email.trim(),profile:{...profile,updatedAt:new Date().toISOString()},
      })
      this.log('customer',id,'updated','Обновлено досье компании (демо)')
      this.persist()
    },
    createOutlet(payload: {customerId:string;name:string;address:string;district:string;contactName:string;phone:string;repId:string;notes:string;receivingWindow?:string;accessInstructions?:string}): Outlet {
      this.require('outlets:edit')
      invariant(!!this.data.customers.find(c => c.id === payload.customerId), 'Выберите контрагента.')
      invariant(payload.name.trim().length >= 2 && payload.address.trim().length >= 5, 'Укажите название и адрес точки.')
      invariant(this.data.employees.some(e => e.id === payload.repId && e.role === 'sales' && e.active), 'Выберите торгового представителя.')
      if (this.currentRole === 'sales') invariant(payload.repId === this.currentUserId, 'Нельзя назначить точку другому представителю.')
      const entity: Outlet = {
        ...payload,name:payload.name.trim(),address:payload.address.trim(),id:uid('o'),
        active:true,tags:[],createdAt:isoDay(),
      }
      this.data.outlets.push(entity)
      this.log('outlet',entity.id,'created','Добавлена торговая точка')
      this.persist()
      return entity
    },
    updateOutlet(id:string, payload:{contactName:string;phone:string;notes:string;address:string;name:string;receivingWindow?:string;accessInstructions?:string}) {
      this.require('outlets:edit')
      const outlet = this.visibleOutlets.find(o => o.id === id)
      invariant(outlet, 'Торговая точка недоступна.')
      invariant(payload.name.trim().length >= 2 && payload.address.trim().length >= 5, 'Название и адрес обязательны.')
      Object.assign(outlet, payload)
      this.log('outlet',id,'updated','Обновлена карточка торговой точки')
      this.persist()
    },
    createVisit(payload: {outletId:string;plannedDate:string;purpose:string}): Visit {
      this.require('visits:edit')
      const outlet = this.visibleOutlets.find(o => o.id === payload.outletId && o.active)
      invariant(outlet, 'Выберите доступную торговую точку.')
      invariant(payload.plannedDate >= isoDay(), 'Нельзя назначить новый визит на прошедший день.')
      invariant(payload.purpose.trim().length >= 3, 'Укажите цель визита.')
      invariant(!this.data.visits.some(v => v.outletId === outlet.id && v.plannedDate === payload.plannedDate && ['planned','in_progress'].includes(v.status)),
        'На эту дату уже запланирован активный визит в магазин.')
      const visit: Visit = {id:uid('vi'),outletId:outlet.id,repId:outlet.repId,
        plannedDate:payload.plannedDate,purpose:payload.purpose.trim(),status:'planned',notes:''}
      this.data.visits.push(visit)
      this.log('outlet',outlet.id,'visit','Запланирован визит на '+visit.plannedDate+': '+visit.purpose)
      this.persist()
      return visit
    },
    startVisit(id:string) {
      this.require('visits:edit')
      const visit=this.visibleVisits.find(v=>v.id===id)
      invariant(visit, 'Визит недоступен.')
      invariant(visit.status==='planned', 'Визит уже начался или завершён.')
      invariant(visit.plannedDate<=isoDay(), 'Визит запланирован на будущую дату.')
      visit.status='in_progress'
      visit.startedAt=new Date().toISOString()
      this.log('outlet',visit.outletId,'visit','Торговый представитель начал визит')
      this.persist()
    },
    finishVisit(id:string, status: Extract<VisitStatus,'completed'|'skipped'>, notes:string) {
      this.require('visits:edit')
      const visit=this.visibleVisits.find(v=>v.id===id)
      invariant(visit, 'Визит недоступен.')
      invariant(status==='completed' || status==='skipped', 'Недопустимый итог визита.')
      invariant(status==='skipped' ? ['planned','in_progress'].includes(visit.status) : visit.status==='in_progress',
        'Недопустимый переход статуса визита.')
      invariant(notes.trim().length>=5, 'Укажите итог или причину пропуска (не менее 5 символов).')
      visit.status=status
      visit.notes=notes.trim()
      visit.finishedAt=new Date().toISOString()
      this.log('outlet',visit.outletId,'visit',status==='completed'?'Визит завершён: '+visit.notes:'Визит не состоялся: '+visit.notes)
      this.persist()
    },
    addOutletNote(outletId: string, message: string) {
      this.require('outlets:edit')
      invariant(this.visibleOutlets.some(o => o.id === outletId), 'Торговая точка недоступна.')
      invariant(message.trim().length >= 3, 'Введите комментарий.')
      this.log('outlet',outletId,'note',message.trim())
      this.persist()
    },
    setCustomerHold(customerId:string, hold:boolean) {
      this.require('debts:edit')
      const customer = this.visibleCustomers.find(c => c.id === customerId)
      invariant(customer, 'Контрагент недоступен.')
      customer.status = hold ? 'on_hold' : 'active'
      this.log('customer',customerId,'risk',hold ? 'Отгрузки приостановлены вручную' : 'Приостановка снята вручную')
      this.persist()
    },
    available(productId:string): number {
      return this.data.stocks.filter(s => s.productId === productId).reduce((sum,s) => sum + Math.max(0,s.onHand-s.reserved),0)
    },
    freeInPrimary(productId:string): number {
      const stock=this.data.stocks.find(s=>s.warehouseId==='w1'&&s.productId===productId)
      return Math.max(0,Math.min(stock?.onHand??0,sellableQty(this.data.stockBatches,productId,'w1'))-(stock?.reserved??0))
    },
    createOrder(payload:{outletId:string;deliveryDate:string;notes:string;items:OrderItem[]}):Order {
      this.require('orders:edit')
      const outlet = this.visibleOutlets.find(o => o.id === payload.outletId && o.active)
      invariant(outlet, 'Выберите доступную торговую точку.')
      invariant(payload.deliveryDate >= isoDay(), 'Дата доставки не может быть в прошлом.')
      invariant(payload.items.length > 0, 'Добавьте товары в заявку.')
      const unique = new Set<string>()
      for (const item of payload.items) {
        invariant(!unique.has(item.productId), 'Один товар нельзя добавлять дважды.')
        unique.add(item.productId)
        const product = this.data.products.find(p => p.id === item.productId && p.active)
        invariant(product, 'Товар не найден.')
        invariant(Number.isInteger(item.quantity) && item.quantity > 0, 'Количество должно быть положительным целым числом.')
        invariant(Number.isFinite(item.price) && item.price === product.price, 'Цена товара изменилась. Обновите заявку по актуальному прайсу.')
      }
      const order:Order = {
        id:uid('ord'), number:'З-'+String(2401 + this.data.orders.length).padStart(4,'0'),
        customerId:outlet.customerId,outletId:outlet.id,createdAt:isoDay(),deliveryDate:payload.deliveryDate,
        status:'new',items:clone(payload.items),notes:payload.notes.trim(),createdBy:this.currentUserId,origin:'sales',
      }
      this.data.orders.unshift(order)
      this.log('order',order.id,'created','Создана заявка '+order.number)
      this.persist()
      return order
    },
    setOrderStatus(orderId:string,to:OrderStatus) {
      this.require('orders:edit')
      const order = this.visibleOrders.find(o => o.id === orderId)
      invariant(order, 'Заявка недоступна.')
      invariant(canTransitionOrder(order.status,to), 'Недопустимый переход статуса заявки.')
      if (to === 'in_route') invariant(false, 'Перевод в рейс выполняется через диспетчера.')
      const customer = this.data.customers.find(c => c.id === order.customerId)
      if (to === 'confirmed') {
        invariant(customer?.status === 'active', 'Контрагент заблокирован.')
        const debtExposure = this.data.debts.filter(d => d.customerId === order.customerId).reduce((sum,d)=>sum+debtBalance(d),0)
        // Account for confirmed but not yet invoiced orders to avoid double spending the same credit limit.
        const openOrders = this.data.orders.filter(o => o.customerId === order.customerId &&
          o.id !== order.id && ['confirmed','picking','ready','in_route'].includes(o.status))
          .reduce((sum,o)=>sum+orderTotal(o),0)
        invariant(debtExposure + openOrders + orderTotal(order) <= (customer.creditLimit ?? 0),
          'Заказ превысит кредитный лимит с учётом уже подтверждённых заявок.')
        for (const item of order.items) invariant(this.freeInPrimary(item.productId)>=item.quantity,'Недостаточно остатков основного склада.')
        for (const item of order.items) this.adjustReservation(item.productId,item.quantity)
      }
      if (to === 'cancelled' && ['confirmed','picking','ready'].includes(order.status)) {
        for (const item of order.items) this.adjustReservation(item.productId,-item.quantity)
      }
      order.status=to
      this.log('order',orderId,'status','Статус заявки: '+to)
      this.persist()
    },
    adjustReservation(productId:string,delta:number) {
      const stock = this.data.stocks.find(s => s.productId === productId && s.warehouseId === 'w1')
      invariant(stock, 'Нет остатков на основном складе.')
      stock.reserved = Math.max(0,stock.reserved+delta)
      stock.updatedAt = new Date().toISOString()
    },
    registerPayment(debtId:string,amount:number) {
      this.require('debts:edit')
      const debt = this.visibleDebts.find(d => d.id === debtId)
      invariant(debt, 'Документ задолженности недоступен.')
      invariant(Number.isFinite(amount) && amount>0 && amount<=debtBalance(debt),'Сумма должна быть больше нуля и не превышать остаток.')
      debt.paid += amount
      this.log('customer',debt.customerId,'payment','Демо-оплата по '+debt.invoice)
      this.persist()
    },
    reconcileConsignment(id:string,sold:number,returned:number) {
      this.require('consignment:edit')
      const record = this.data.consignments.find(c => c.id === id && this.visibleOutlets.some(o=>o.id===c.outletId))
      invariant(record, 'Передача не найдена.')
      invariant(Number.isInteger(sold) && Number.isInteger(returned) && sold>=0 && returned>=0,'Количество должно быть неотрицательным целым.')
      invariant(sold+returned<=consignmentBalance(record),'Сверка превышает остаток у клиента.')
      invariant(sold+returned>0, 'Укажите проданный или возвращённый товар.')
      record.sold+=sold
      record.returned+=returned
      record.reconciledAt=isoDay()
      this.log('outlet',record.outletId,'consignment','Демо-сверка: продано '+sold+', возвращено '+returned)
      this.persist()
    },
    planRoute(payload:{date:string;vehicleId:string;driverId:string;forwarderId?:string;orderIds:string[]}):DeliveryRoute {
      this.require('routes:edit')
      invariant(payload.date>=isoDay(),'Дата рейса не может быть в прошлом.')
      const vehicle=this.data.vehicles.find(v=>v.id===payload.vehicleId)
      invariant(vehicle && vehicle.active!==false,'Активный автомобиль не найден.')
      invariant(!this.data.routes.some(r=>r.date===payload.date&&r.vehicleId===payload.vehicleId&&r.status!=='completed'),'Автомобиль уже назначен на рейс в эту дату.')
      invariant(!this.data.routes.some(r=>r.date===payload.date&&r.driverId===payload.driverId&&r.status!=='completed'),'Водитель уже назначен на рейс в эту дату.')
      if(payload.forwarderId) {
        invariant(this.data.employees.some(e=>e.id===payload.forwarderId&&e.role==='forwarder'&&e.active),'Выберите действующего экспедитора.')
        invariant(!this.data.routes.some(r=>r.date===payload.date&&r.forwarderId===payload.forwarderId&&r.status!=='completed'),'Экспедитор уже назначен на рейс в эту дату.')
      }
      invariant(this.data.employees.some(e=>e.id===payload.driverId && e.role==='driver' && e.active),'Выберите водителя.')
      invariant(payload.orderIds.length>0 && new Set(payload.orderIds).size===payload.orderIds.length,'Выберите уникальные заявки.')
      const selected=payload.orderIds.map(id=>this.visibleOrders.find(o=>o.id===id))
      invariant(selected.every(Boolean),'Некоторые заявки недоступны.')
      const orders=selected as Order[]
      invariant(orders.every(o=>o.status==='ready' && o.deliveryDate===payload.date),'Рейс может включать только готовые заявки на выбранную дату.')
      invariant(orders.every(o=>!o.routeId),'Некоторые заявки уже назначены на рейс.')
      const weight=orders.reduce((sum,o)=>sum+orderWeight(o.items,this.data.products),0)
      invariant(weight<=vehicle.capacityKg,'Вес '+weight.toFixed(1)+' кг превышает грузоподъёмность '+vehicle.capacityKg+' кг.')
      const volume=orders.reduce((sum,o)=>sum+estimatedVolume(o.items,this.data.products),0)
      invariant(!vehicle.volumeM3||volume<=vehicle.volumeM3+1e-8,'Объём '+volume.toFixed(2)+' м³ превышает вместимость '+vehicle.volumeM3+' м³.')
      const uniqueOutlets=[...new Set(orders.map(o=>o.outletId))]
      const route:DeliveryRoute={
        id:uid('r'),number:'Р-'+String(this.data.routes.length+1).padStart(3,'0'),
        date:payload.date,driverId:payload.driverId,forwarderId:payload.forwarderId||undefined,vehicleId:payload.vehicleId,status:'planned',
        stops:uniqueOutlets.map((outletId,position)=>({
          id:uid('st'),outletId,position:position+1,status:'pending',notes:'',
          orderIds:orders.filter(o=>o.outletId===outletId).map(o=>o.id),
        })),
      }
      for(const order of orders) order.routeId=route.id
      this.data.routes.unshift(route)
      this.log('route',route.id,'created','Сформирован рейс '+route.number+' · '+uniqueOutlets.length+' точек')
      this.persist()
      return route
    },
    moveRoute(routeId:string,to:RouteStatus) {
      this.require('routes:edit')
      const route=this.visibleRoutes.find(r=>r.id===routeId)
      invariant(route,'Рейс недоступен.')
      const allowed:Record<RouteStatus,RouteStatus[]>={planned:['loading'],loading:['active'],active:['completed'],completed:[]}
      invariant(allowed[route.status].includes(to),'Недопустимый переход статуса рейса.')
      if(to==='active') {
        for(const id of route.stops.flatMap(s=>s.orderIds)) {
          const order=this.data.orders.find(o=>o.id===id)
          invariant(order?.status==='ready' || order?.status==='in_route','Не все заявки готовы к рейсу.')
        }
        for(const id of route.stops.flatMap(s=>s.orderIds)) {
          const order=this.data.orders.find(o=>o.id===id)
          if(order) order.status='in_route'
        }
      }
      if(to==='completed') invariant(route.stops.every(s=>s.status!=='pending'),'Сначала обработайте все точки маршрута.')
      route.status=to
      this.log('route',routeId,'status','Рейс: '+to)
      this.persist()
    },
    arriveStop(routeId:string,stopId:string){
      this.require('routes:edit')
      const route=this.visibleRoutes.find(r=>r.id===routeId)
      invariant(route,'Рейс недоступен.')
      invariant(route.status==='active','Прибытие можно отметить только в рейсе «В пути».')
      const stop=route.stops.find(s=>s.id===stopId)
      invariant(stop?.status==='pending','Точка уже обработана или недоступна.')
      invariant(!stop.arrivedAt,'Прибытие уже отмечено.')
      stop.arrivedAt=new Date().toISOString()
      stop.arrivedBy=this.currentUserId
      this.log('stop',stopId,'arrival','Отмечено прибытие без GPS-подтверждения')
      this.persist()
      return stop
    },
    finishStop(routeId:string,stopId:string,status:Exclude<StopStatus,'pending'>,notes:string,receivedBy='') {
      this.require('routes:edit')
      const route=this.visibleRoutes.find(r=>r.id===routeId)
      invariant(route?.status==='active','Рейс должен быть в пути.')
      const stop=route.stops.find(s=>s.id===stopId)
      invariant(stop?.status==='pending','Точка уже обработана.')
      if(this.currentRole==='driver'||this.currentRole==='forwarder'){
        invariant(!!stop.arrivedAt,'Сначала отметьте прибытие в магазин.')
      }
      invariant(receivedBy.length<=120,'Имя получателя слишком длинное.')
      invariant(status==='delivered'||notes.trim().length>=5,'Для отказа или частичной доставки укажите причину.')
      const orders=stop.orderIds.map(id=>this.data.orders.find(o=>o.id===id))
      invariant(orders.every(o=>o?.status==='in_route'),'В остановке есть недоступные для доставки заявки.')
      if(status==='delivered') {
        // Validate the complete delivery and plan all allocations before modifying stock.
        const draft=this.data.stockBatches.map(batch=>({...batch}))
        const shipments: OutletShipment[]=[]
        const demand=new Map<string,number>()
        for(const order of orders){
          for(const item of order!.items){
            demand.set(item.productId,(demand.get(item.productId)??0)+item.quantity)
            const allocations=allocateFEFO(draft,item.productId,'w1',item.quantity)
            for(const allocation of allocations){
              const batch=draft.find(b=>b.id===allocation.batchId)!
              batch.remainingQty-=allocation.quantity
              shipments.push({
                id:uid('ship'),outletId:order!.outletId,productId:item.productId,
                batchId:batch.id,batchNumber:batch.batchNumber,expiryDate:batch.expiryDate,
                quantity:allocation.quantity,orderId:order!.id,routeId:route.id,deliveredAt:new Date().toISOString(),
              })
            }
          }
        }
        for(const [productId,count] of demand){
          const stock=this.data.stocks.find(x=>x.warehouseId==='w1'&&x.productId===productId)
          invariant(stock&&stock.onHand>=count&&stock.reserved>=count,
            'Недостаточно товара или резерва. Сверьте склад до подтверждения доставки.')
        }
        for(const [productId,count] of demand){
          const stock=this.data.stocks.find(x=>x.warehouseId==='w1'&&x.productId===productId)!
          stock.onHand-=count
          stock.reserved-=count
          stock.updatedAt=new Date().toISOString()
        }
        for(const updated of draft){
          this.data.stockBatches.find(b=>b.id===updated.id)!.remainingQty=updated.remainingQty
        }
        this.data.outletShipments.push(...shipments)
        // Deliveries are not an accurate representation of current stock on store shelves.
      }
      for(const order of orders) {
        if(order) order.status=status==='delivered'?'delivered':'partial'
        // Partial/failed delivery leaves reservation untouched until the warehouse reconciles returns.
      }
      stop.status=status
      stop.receivedBy=status==='failed'?'':receivedBy.trim()
      stop.notes=notes.trim()
      stop.completedAt=new Date().toISOString()
      this.log('stop',stopId,'status','Доставка: '+status+(notes ? ' · '+notes:''))
      this.persist()
    },
    addDocumentMetadata(entityType:DocumentRecord['entityType'],entityId:string,filename:string,mimeType:string,size:number) {
      this.require('documents:edit')
      invariant(filename.trim().length>0 && filename.trim().length<=255,'Название документа должно содержать от 1 до 255 символов.')
      invariant(Number.isFinite(size) && size>=0 && size<=35*1024*1024,'Допустимый размер файла: от 0 до 35 МБ.')
      const accessible = entityType==='outlet' ? this.visibleOutlets.some(e=>e.id===entityId) :
        entityType==='customer' ? this.visibleCustomers.some(e=>e.id===entityId) :
        entityType==='order' ? this.visibleOrders.some(e=>e.id===entityId) :
        entityType==='route' ? this.visibleRoutes.some(e=>e.id===entityId) :
        this.visibleRoutes.some(r=>r.stops.some(st=>st.id===entityId))
      invariant(accessible, 'Нельзя привязать документ к недоступному или несуществующему объекту.')
      // NEVER save actual bytes in localStorage or claim a real upload. Metadata-only demo.
      this.data.documents.unshift({
        id:uid('doc'),entityType,entityId,filename:filename.trim(),mimeType,size,
        createdAt:new Date().toISOString(),createdBy:this.currentUserId,demoOnly:true,
      })
      this.log(entityType,entityId,'document','Добавлена запись о документе без сохранения оригинала')
      this.persist()
      return this.data.documents[0]!
    },

    receiveBatch(payload:{warehouseId:string;productId:string;batchNumber:string;receivedDate:string;expiryDate:string;quantity:number;supplier:string;receiptRef:string}):StockBatch {
      this.require('inventory:edit')
      invariant(this.data.warehouses.some(w=>w.id===payload.warehouseId),'Склад не найден.')
      invariant(this.data.products.some(p=>p.id===payload.productId&&p.active),'Товар не найден.')
      invariant(Number.isInteger(payload.quantity)&&payload.quantity>0&&payload.quantity<=1000000,'Количество должно быть положительным целым числом.')
      invariant(/^\d{4}-\d{2}-\d{2}$/.test(payload.receivedDate)&&payload.receivedDate<=isoDay(),'Укажите корректную дату поступления.')
      invariant(/^\d{4}-\d{2}-\d{2}$/.test(payload.expiryDate)&&payload.expiryDate>=payload.receivedDate,'Срок годности не может закончиться раньше даты поступления.')
      invariant(payload.batchNumber.trim().length>=2,'Укажите номер партии.')
      invariant(!this.data.stockBatches.some(b=>b.warehouseId===payload.warehouseId&&b.productId===payload.productId&&b.batchNumber===payload.batchNumber.trim()),'Партия с таким номером уже существует.')
      const stock=this.data.stocks.find(x=>x.warehouseId===payload.warehouseId&&x.productId===payload.productId)
      invariant(stock,'Складская позиция не найдена.')
      const batch:StockBatch={
        id:uid('lot'),productId:payload.productId,warehouseId:payload.warehouseId,
        batchNumber:payload.batchNumber.trim(),receivedDate:payload.receivedDate,
        expiryDate:payload.expiryDate,initialQty:payload.quantity,remainingQty:payload.quantity,
        supplier:payload.supplier.trim(),receiptRef:payload.receiptRef.trim(),recordedBy:this.currentUserId,
      }
      stock.onHand+=payload.quantity
      stock.updatedAt=new Date().toISOString()
      this.data.stockBatches.unshift(batch)
      this.persist()
      return batch
    },
    recordOutletCheck(payload:{outletId:string;productId:string;batchNumber:string;expiryDate:string;quantity:number;notes:string}){
      this.require('visits:edit')
      invariant(this.visibleOutlets.some(o=>o.id===payload.outletId),'Магазин недоступен.')
      invariant(this.data.products.some(p=>p.id===payload.productId),'Товар не найден.')
      invariant(payload.batchNumber.trim().length>=2&&/^\d{4}-\d{2}-\d{2}$/.test(payload.expiryDate),'Укажите номер партии и срок годности.')
      invariant(Number.isInteger(payload.quantity)&&payload.quantity>=0,'Остаток должен быть неотрицательным целым.')
      const row={
        id:uid('check'),outletId:payload.outletId,productId:payload.productId,
        batchNumber:payload.batchNumber.trim(),expiryDate:payload.expiryDate,
        quantity:payload.quantity,checkedAt:new Date().toISOString(),checkedBy:this.currentUserId,notes:payload.notes.trim(),
      }
      this.data.outletStockChecks.unshift(row)
      this.log('outlet',payload.outletId,'stock-check','Проверен остаток: партия '+row.batchNumber)
      this.persist()
      return row
    },
    saveSalesPlan(payload:{employeeId:string;month:string;revenueTarget:number;visitsTarget:number;outletsTarget:number;notes:string}):SalesPlan {
      this.require('plans:edit')
      invariant(this.data.employees.some(e=>e.id===payload.employeeId&&e.role==='sales'&&e.active),'Выберите торгового представителя.')
      invariant(/^\d{4}-\d{2}$/.test(payload.month),'Неверный месяц.')
      invariant([payload.revenueTarget,payload.visitsTarget,payload.outletsTarget].every(v=>Number.isInteger(v)&&v>=0),'План должен содержать целые неотрицательные значения.')
      let plan=this.data.salesPlans.find(p=>p.employeeId===payload.employeeId&&p.month===payload.month)
      if(plan)Object.assign(plan,payload)
      else {plan={...payload,id:uid('plan')};this.data.salesPlans.push(plan)}
      this.log('customer','demo-plan','sales-plan','Обновлён план торгового представителя')
      this.persist()
      return plan
    },
    addVehicle(payload:{plate:string;title:string;capacityKg:number;volumeM3:number;maxPallets:number;driverId:string;year?:number;notes?:string}):Vehicle {
      this.require('fleet:edit')
      invariant(payload.plate.trim().length>=4&&payload.title.trim().length>=3,'Укажите госномер и модель автомобиля.')
      invariant(!this.data.vehicles.some(v=>v.plate.toLowerCase()===payload.plate.trim().toLowerCase()),'Такой госномер уже зарегистрирован.')
      invariant(Number.isFinite(payload.capacityKg)&&payload.capacityKg>0&&Number.isFinite(payload.volumeM3)&&payload.volumeM3>0,'Проверьте грузоподъёмность и объём.')
      invariant(Number.isInteger(payload.maxPallets)&&payload.maxPallets>=0,'Неверная паллетовместимость.')
      invariant(this.data.employees.some(e=>e.id===payload.driverId&&e.role==='driver'&&e.active),'Выберите действующего водителя.')
      const vehicle:Vehicle={...payload,plate:payload.plate.trim().toUpperCase(),title:payload.title.trim(),id:uid('v'),active:true}
      this.data.vehicles.push(vehicle)
      this.persist()
      return vehicle
    },
    saveSampleWaybill(documentId:string,sample:WaybillSample){
      this.require('documents:edit')
      const doc=this.data.documents.find(d=>d.id===documentId)
      invariant(doc,'Запись о накладной не найдена.')
      invariant(sample.simulated===true,'Пример должен быть помечен как имитация.')
      invariant(sample.items.length>0&&Number.isFinite(sample.total)&&sample.total>=0,'Некорректные данные образца.')
      doc.sampleExtraction=clone({...sample,verified:false})
      this.log(doc.entityType,doc.entityId,'waybill','Сохранён пример полей накладной, без OCR')
      this.persist()
    },
    verifySampleWaybill(documentId:string){
      this.require('documents:edit')
      const doc=this.data.documents.find(d=>d.id===documentId)
      invariant(doc?.sampleExtraction,'Образец накладной не найден.')
      doc.sampleExtraction.verified=true
      this.log(doc.entityType,doc.entityId,'waybill','Образец накладной проверен пользователем')
      this.persist()
    },
    addEmployee(payload:{name:string;role:Role;phone:string}) {
      this.require('staff:edit')
      invariant(payload.name.trim().length>=3,'Укажите имя сотрудника.')
      const user:Employee={id:uid('u'),name:payload.name.trim(),initials:payload.name.trim().slice(0,2).toUpperCase(),role:payload.role,phone:payload.phone,active:true}
      this.data.employees.push(user)
      this.persist()
    },
  },
})
