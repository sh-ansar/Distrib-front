import { describe, expect, it } from 'vitest'
import { createDemoData } from '@/data/seed'
import { routeProgress, routesForCompany } from './routeProgress'

describe('route progress: manual confirmations, not GPS',()=>{
  it('identifies last confirmed and next planned stop',()=>{
    const d=createDemoData()
    const route=d.routes.find(r=>r.id==='r1')!
    const p=routeProgress(route)
    expect(p.total).toBe(2)
    expect(p.completed).toBe(1)
    expect(p.pending).toBe(1)
    expect(p.last?.outletId).toBe('o9')
    expect(p.next?.outletId).toBe('o10')
    expect(p.percent).toBe(50)
    expect(p.lastEventAt).toBeTruthy()
  })
  it('filters routes for the exact company, not same-name shops',()=>{
    const d=createDemoData()
    expect(routesForCompany('c7',d.routes,d.outlets).map(r=>r.id)).toContain('r1')
    expect(routesForCompany('c1',d.routes,d.outlets).map(r=>r.id)).not.toContain('r1')
  })
  it('handles a route without stops',()=>{
    const p=routeProgress({id:'empty',number:'x',date:'2026-11-09',driverId:'u1',vehicleId:'v1',status:'planned',stops:[]})
    expect(p.percent).toBe(0)
    expect(p.next).toBeUndefined()
  })
})
