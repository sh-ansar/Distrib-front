import { can } from '@/access'
import type {
  Customer, Debt, DeliveryRoute, DistributionData, DocumentRecord, Outlet, Order,
  Role, Visit,
} from '@/types/domain'
import { debtBalance, money, isoDay } from '@/utils/domain'
import { daysToExpiry, outletLastChecks } from '@/utils/expiry'

export type ControlCategory =
  | 'warehouse' | 'store' | 'finance' | 'delivery' | 'visits' | 'documents' | 'orders'
export type ControlPriority = 'critical' | 'attention'
export interface ControlItem {
  id: string
  category: ControlCategory
  priority: ControlPriority
  title: string
  detail: string
  owner: string
  deadline?: string
  metric?: string
  to: string
  action: string
}
export const controlCategories: Array<{id: ControlCategory; label: string; icon: string}> = [
  {id:'warehouse',label:'Сроки на складе',icon:'boxes'},
  {id:'store',label:'Товар у магазинов',icon:'package-search'},
  {id:'finance',label:'Расчёты',icon:'wallet'},
  {id:'delivery',label:'Доставка',icon:'route'},
  {id:'visits',label:'Визиты',icon:'calendar-clock'},
  {id:'documents',label:'Накладные',icon:'scan-text'},
  {id:'orders',label:'Заявки',icon:'clipboard-list'},
]
export function controlCategory(id:ControlCategory) {
  return controlCategories.find(category=>category.id===id)!
}
export interface ControlScope {
  data:DistributionData
  role:Role
  outlets:Outlet[]
  customers:Customer[]
  debts:Debt[]
  routes:DeliveryRoute[]
  visits:Visit[]
  orders:Order[]
  today?:string
}
const escapeQuery=(value:string)=>encodeURIComponent(value)

/**
 * Derived, read-only tasks from source records. No fictional acknowledgement
 * state: an alert disappears only after the originating record changes.
 * Scope arrays MUST come from the store's role-filtered getters.
 */
export function buildControlItems({
  data,role,outlets,customers,debts,routes,visits,orders,today=isoDay(),
}:ControlScope):ControlItem[] {
  const items:ControlItem[]=[]
  const outletMap=new Map(outlets.map(o=>[o.id,o]))
  const customerIds=new Set(customers.map(c=>c.id))
  const employeeName=(id:string)=>data.employees.find(e=>e.id===id)?.name||'Не назначен'
  const productName=(id:string)=>data.products.find(p=>p.id===id)?.name||'Товар'
  const customerName=(id:string)=>customers.find(c=>c.id===id)?.legalName||'Компания'
  const warehouseName=(id:string)=>data.warehouses.find(w=>w.id===id)?.name||'Склад'

  // Warehouse receipts are visible only to people responsible for stock control.
  if(can(role,'inventory')&&['admin','director','supervisor','dispatcher','warehouse'].includes(role)){
    for(const lot of data.stockBatches){
      if(lot.remainingQty<=0)continue
      const days=daysToExpiry(lot.expiryDate,today)
      if(days>30)continue
      const expired=days<0
      items.push({
        id:'lot:'+lot.id,category:'warehouse',priority:expired?'critical':'attention',
        title:(expired?'Просрочена партия ':'Истекает срок партии ')+lot.batchNumber,
        detail:productName(lot.productId)+' · '+warehouseName(lot.warehouseId),
        owner:'Склад',deadline:lot.expiryDate,
        metric:lot.remainingQty+' ед. · '+(expired?'просрочено '+Math.abs(days)+' дн.':'осталось '+days+' дн.'),
        to:'/inventory?warehouse='+escapeQuery(lot.warehouseId)+'&batch='+escapeQuery(lot.batchNumber),
        action:'Посмотреть партию',
      })
    }
  }

  if(can(role,'storestock')){
    for(const outlet of outlets){
      for(const check of outletLastChecks(data.outletStockChecks,outlet.id)){
        if(check.quantity<=0)continue
        const days=daysToExpiry(check.expiryDate,today)
        if(days>30)continue
        const expired=days<0
        items.push({
          id:'shelf:'+outlet.id+':'+check.productId+':'+check.batchNumber,
          category:'store',priority:expired?'critical':'attention',
          title:expired?'Просрочен товар в магазине':'Товар скоро просрочится',
          detail:outlet.name+' · '+productName(check.productId)+' · партия '+check.batchNumber,
          owner:employeeName(outlet.repId),deadline:check.expiryDate,
          metric:check.quantity+' ед. · '+(expired?'срок истёк':'осталось '+days+' дн.'),
          to:'/store-stock?outlet='+escapeQuery(outlet.id),
          action:'Открыть остатки',
        })
      }
    }
  }

  if(can(role,'debts')){
    for(const debt of debts){
      const rest=debtBalance(debt)
      if(rest<=0||!customerIds.has(debt.customerId))continue
      const days=daysToExpiry(debt.dueAt,today)
      if(days>7)continue
      const overdue=days<0
      items.push({
        id:'debt:'+debt.id,category:'finance',priority:overdue?'critical':'attention',
        title:overdue?'Просрочена оплата '+debt.invoice:'Срок оплаты '+debt.invoice,
        detail:customerName(debt.customerId),
        owner:'Бухгалтерия',deadline:debt.dueAt,metric:money(rest),
        to:'/debts?q='+escapeQuery(debt.invoice),action:'Открыть расчёты',
      })
    }
  }

  if(can(role,'routes')){
    for(const route of routes){
      const driver=employeeName(route.driverId)
      const pending=route.stops.filter(stop=>stop.status==='pending')
      if(pending.length>0&&route.date<today&&route.status!=='completed'){
        items.push({
          id:'route-late:'+route.id,category:'delivery',priority:'critical',
          title:'Незавершённый рейс '+route.number,
          detail:'Осталось '+pending.length+' точек',
          owner:driver,deadline:route.date,metric:route.stops.length+' точек всего',
          to:'/routes/'+escapeQuery(route.id),action:'Открыть маршрут',
        })
      }
      for(const stop of route.stops){
        if(stop.status!=='partial'&&stop.status!=='failed')continue
        const outlet=outletMap.get(stop.outletId)
        // Role-filtered route stops are trusted only when the outlet is also in scope.
        if(!outlet)continue
        items.push({
          id:'stop:'+stop.id,category:'delivery',priority:stop.status==='failed'?'critical':'attention',
          title:stop.status==='failed'?'Отказ от доставки':'Частичная доставка',
          detail:route.number+' · '+outlet.name+(stop.notes?' · '+stop.notes:''),
          owner:driver,deadline:route.date,
          to:'/routes/'+escapeQuery(route.id),action:'Разобрать доставку',
        })
      }
    }
  }

  if(can(role,'visits')){
    for(const visit of visits){
      if(visit.plannedDate>today||!['planned','in_progress'].includes(visit.status))continue
      const outlet=outletMap.get(visit.outletId)
      if(!outlet)continue
      const missed=visit.plannedDate<today
      items.push({
        id:'visit:'+visit.id,category:'visits',priority:missed?'critical':'attention',
        title:missed?'Не закрыт визит':'Визит на сегодня',
        detail:outlet.name+' · '+visit.purpose,
        owner:employeeName(visit.repId),deadline:visit.plannedDate,
        to:'/visits?date='+escapeQuery(visit.plannedDate)+'&outlet='+escapeQuery(visit.outletId),
        action:'Открыть визит',
      })
    }
  }

  if(can(role,'orders')){
    for(const order of orders){
      if(order.deliveryDate>=today||!['new','confirmed','picking','ready','in_route'].includes(order.status))continue
      const outlet=outletMap.get(order.outletId)
      if(!outlet)continue
      items.push({
        id:'order:'+order.id,category:'orders',priority:'critical',
        title:'Просрочена доставка заявки '+order.number,
        detail:outlet.name+' · заявка ещё в работе',
        owner:employeeName(order.createdBy),deadline:order.deliveryDate,
        metric:money(order.items.reduce((sum,item)=>sum+item.quantity*item.price,0)),
        to:'/orders?q='+escapeQuery(order.number),action:'Открыть заявку',
      })
    }
  }

  if(can(role,'documents')){
    const orderIds=new Set(orders.map(o=>o.id))
    const routeIds=new Set(routes.map(r=>r.id))
    const outletIds=new Set(outlets.map(o=>o.id))
    const stopIds=new Set(routes.flatMap(r=>r.stops.map(s=>s.id)))
    const allowed:Record<DocumentRecord['entityType'],Set<string>>={
      customer:customerIds,outlet:outletIds,order:orderIds,route:routeIds,stop:stopIds,
    }
    for(const doc of data.documents){
      if(!doc.sampleExtraction||doc.sampleExtraction.verified||!allowed[doc.entityType].has(doc.entityId))continue
      items.push({
        id:'document:'+doc.id,category:'documents',priority:'attention',
        title:'Не проверен образец накладной',
        detail:doc.filename+' · поля получены из тестовой заявки, не из файла',
        owner:'Ответственный за документы',deadline:doc.createdAt.slice(0,10),
        to:'/documents?document='+escapeQuery(doc.id),action:'Проверить поля',
      })
    }
  }

  const weight:Record<ControlPriority,number>={critical:0,attention:1}
  return items.sort((a,b)=>weight[a.priority]-weight[b.priority]||
    (a.deadline||'9999-12-31').localeCompare(b.deadline||'9999-12-31')||
    a.title.localeCompare(b.title,'ru')||a.id.localeCompare(b.id))
}
