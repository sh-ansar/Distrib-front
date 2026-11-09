import type { Customer, DeliveryRoute, Outlet, RouteStop } from '@/types/domain'

export interface RouteProgressInfo {
  completed: number
  pending: number
  problems: number
  total: number
  percent: number
  next?: RouteStop
  last?: RouteStop
  lastEventAt?: string
}
/** Route tracking by manual delivery confirmations only: NOT GPS and NOT live vehicle position. */
export function routeProgress(route: DeliveryRoute): RouteProgressInfo {
  const stops=[...route.stops].sort((a,b)=>a.position-b.position)
  const done=stops.filter(s=>s.status!=='pending')
  const last=[...done].sort((a,b)=>(b.completedAt??'').localeCompare(a.completedAt??''))[0]
  const next=stops.find(s=>s.status==='pending')
  return {
    completed:done.length,
    pending:stops.length-done.length,
    problems:done.filter(s=>s.status==='partial'||s.status==='failed').length,
    total:stops.length,
    percent:stops.length?Math.round(100*done.length/stops.length):0,
    next, last, lastEventAt:last?.completedAt,
  }
}
export function routesForCompany(companyId:string,routes:DeliveryRoute[],outlets:Outlet[]):DeliveryRoute[] {
  const ids=new Set(outlets.filter(o=>o.customerId===companyId).map(o=>o.id))
  return routes.filter(route=>route.stops.some(s=>ids.has(s.outletId)))
}
export function companyForStop(stop:RouteStop,outlets:Outlet[],customers:Customer[]): Customer | undefined {
  const outlet=outlets.find(o=>o.id===stop.outletId)
  return customers.find(c=>c.id===outlet?.customerId)
}
