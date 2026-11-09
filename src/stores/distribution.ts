import { defineStore } from 'pinia'
import { can, type Capability } from '@/access'
import { createDemoData } from '@/data/seed'
import type { Activity, Consignment, Customer, Debt, DeliveryRoute, DistributionData, DocumentRecord, Employee, Order, OrderItem, OrderStatus, Outlet, Role, RouteStatus, StopStatus } from '@/types/domain'
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
  return candidate.version === 1 && [
    'customers','outlets','products','warehouses','stocks','orders','debts','consignments',
    'employees','vehicles','routes','documents','activities',
  ].every(key => Array.isArray(candidate[key]))
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
      if (employee?.role === 'driver') {
        const outletIds = new Set(state.data.routes.filter(r => r.driverId === employee.id).flatMap(r => r.stops.map(s => s.outletId)))
        return state.data.outlets.filter(o => outletIds.has(o.id))
      }
      return state.data.outlets
    },
    visibleOrders(): Order[] {
      const ids = new Set(this.visibleOutlets.map(o => o.id))
      return this.data.orders.filter(o => ids.has(o.outletId))
    },
    visibleDebts(): Debt[] {
      const ids = new Set(this.visibleOutlets.map(o => o.customerId))
      return this.data.debts.filter(d => ids.has(d.customerId))
    },
    visibleRoutes(state): DeliveryRoute[] {
      const employee = state.data.employees.find(e => e.id === state.currentUserId)
      return employee?.role === 'driver' ? state.data.routes.filter(r => r.driverId === employee.id) : state.data.routes
    },
    visibleCustomers(): Customer[] {
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
          if (validDemo(parsed)) this.data = parsed
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
    createCustomer(payload: {legalName:string;bin:string;contactName:string;phone:string;email:string;creditLimit:number;termsDays:number}): Customer {
      this.require('outlets:edit')
      invariant(payload.legalName.trim().length >= 3, 'Укажите название юридического лица.')
      invariant(/^\d{12}$/.test(payload.bin), 'БИН должен содержать 12 цифр.')
      invariant(!this.data.customers.some(c => c.bin === payload.bin), 'Контрагент с таким БИН уже существует.')
      invariant(cleanNumber(payload.creditLimit) && payload.termsDays >= 0, 'Проверьте лимит и условия оплаты.')
      const entity: Customer = {
        ...payload, legalName:payload.legalName.trim(), id:uid('c'), status:'active', createdAt:isoDay(),
      }
      this.data.customers.push(entity)
      this.log('customer',entity.id,'created','Создан контрагент')
      this.persist()
      return entity
    },
    createOutlet(payload: {customerId:string;name:string;address:string;district:string;contactName:string;phone:string;repId:string;notes:string}): Outlet {
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
    updateOutlet(id:string, payload:{contactName:string;phone:string;notes:string;address:string;name:string}) {
      this.require('outlets:edit')
      const outlet = this.visibleOutlets.find(o => o.id === id)
      invariant(outlet, 'Торговая точка недоступна.')
      invariant(payload.name.trim().length >= 2 && payload.address.trim().length >= 5, 'Название и адрес обязательны.')
      Object.assign(outlet, payload)
      this.log('outlet',id,'updated','Обновлена карточка торговой точки')
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
      const stock = this.data.stocks.find(s => s.warehouseId === 'w1' && s.productId === productId)
      return stock ? Math.max(0,stock.onHand-stock.reserved) : 0
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
        invariant(!!this.data.products.find(p => p.id === item.productId && p.active), 'Товар не найден.')
        invariant(Number.isInteger(item.quantity) && item.quantity > 0, 'Количество должно быть положительным целым числом.')
        invariant(Number.isFinite(item.price) && item.price >= 0, 'Некорректная цена.')
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
        const exposure = this.data.debts.filter(d => d.customerId === order.customerId).reduce((sum,d)=>sum+debtBalance(d),0)
        invariant(exposure + orderTotal(order) <= (customer.creditLimit ?? 0), 'Заказ превысит кредитный лимит контрагента.')
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
    planRoute(payload:{date:string;vehicleId:string;driverId:string;orderIds:string[]}):DeliveryRoute {
      this.require('routes:edit')
      invariant(payload.date>=isoDay(),'Дата рейса не может быть в прошлом.')
      const vehicle=this.data.vehicles.find(v=>v.id===payload.vehicleId)
      invariant(vehicle,'Автомобиль не найден.')
      invariant(this.data.employees.some(e=>e.id===payload.driverId && e.role==='driver' && e.active),'Выберите водителя.')
      invariant(payload.orderIds.length>0 && new Set(payload.orderIds).size===payload.orderIds.length,'Выберите уникальные заявки.')
      const selected=payload.orderIds.map(id=>this.visibleOrders.find(o=>o.id===id))
      invariant(selected.every(Boolean),'Некоторые заявки недоступны.')
      const orders=selected as Order[]
      invariant(orders.every(o=>o.status==='ready' && o.deliveryDate===payload.date),'Рейс может включать только готовые заявки на выбранную дату.')
      invariant(orders.every(o=>!o.routeId),'Некоторые заявки уже назначены на рейс.')
      const weight=orders.reduce((sum,o)=>sum+orderWeight(o.items,this.data.products),0)
      invariant(weight<=vehicle.capacityKg,'Вес '+weight.toFixed(1)+' кг превышает грузоподъёмность '+vehicle.capacityKg+' кг.')
      const uniqueOutlets=[...new Set(orders.map(o=>o.outletId))]
      const route:DeliveryRoute={
        id:uid('r'),number:'Р-'+String(this.data.routes.length+1).padStart(3,'0'),
        date:payload.date,driverId:payload.driverId,vehicleId:payload.vehicleId,status:'planned',
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
    finishStop(routeId:string,stopId:string,status:Exclude<StopStatus,'pending'>,notes:string) {
      this.require('routes:edit')
      const route=this.visibleRoutes.find(r=>r.id===routeId)
      invariant(route?.status==='active','Рейс должен быть в пути.')
      const stop=route.stops.find(s=>s.id===stopId)
      invariant(stop?.status==='pending','Точка уже обработана.')
      invariant(status==='delivered'||notes.trim().length>=5,'Для отказа или частичной доставки укажите причину.')
      for(const id of stop.orderIds) {
        const order=this.data.orders.find(o=>o.id===id)
        if(!order)continue
        if(status==='delivered') {
          for(const item of order.items) {
            const stock=this.data.stocks.find(s=>s.warehouseId==='w1'&&s.productId===item.productId)
            if(stock) {
              stock.onHand=Math.max(0,stock.onHand-item.quantity)
              stock.reserved=Math.max(0,stock.reserved-item.quantity)
              stock.updatedAt=new Date().toISOString()
            }
          }
          order.status='delivered'
        } else {
          order.status='partial'
          // Failed/partial delivery requires financial/stock reconciliation in 1C.
          // Demo intentionally DOES NOT post a write-off or financial movement.
        }
      }
      stop.status=status
      stop.notes=notes.trim()
      stop.completedAt=new Date().toISOString()
      this.log('stop',stopId,'status','Доставка: '+status+(notes ? ' · '+notes:''))
      this.persist()
    },
    addDocumentMetadata(entityType:DocumentRecord['entityType'],entityId:string,filename:string,mimeType:string,size:number) {
      this.require('documents:edit')
      invariant(filename.trim().length>0,'Укажите название документа.')
      invariant(size<=35*1024*1024,'Максимальный размер файла 35 МБ.')
      // NEVER save actual bytes in localStorage or claim a real upload. Metadata-only demo.
      this.data.documents.unshift({
        id:uid('doc'),entityType,entityId,filename:filename.trim(),mimeType,size,
        createdAt:new Date().toISOString(),createdBy:this.currentUserId,demoOnly:true,
      })
      this.log(entityType,entityId,'document','Прикреплена запись о документе (демо, без файла)')
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
