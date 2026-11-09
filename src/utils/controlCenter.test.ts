import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useDistributionStore } from '@/stores/distribution'
import { buildControlItems, controlCategories } from './controlCenter'
import { dayOffset } from './domain'
import { sampleWaybill } from './waybill'

beforeEach(()=>setActivePinia(createPinia()))
function alerts(){
  const s=useDistributionStore()
  return buildControlItems({
    data:s.data,role:s.currentRole,outlets:s.visibleOutlets,
    customers:s.visibleCustomers,debts:s.visibleDebts,
    routes:s.visibleRoutes,visits:s.visibleVisits,orders:s.visibleOrders,
  })
}
describe('operational control center',()=>{
  it('builds prioritized actionable items from actual records',()=>{
    const all=alerts()
    expect(all.length).toBeGreaterThan(0)
    expect(new Set(all.map(x=>x.id)).size).toBe(all.length)
    expect(all.some(x=>x.category==='warehouse')).toBe(true)
    expect(all.some(x=>x.category==='store')).toBe(true)
    expect(all.some(x=>x.category==='finance')).toBe(true)
    expect(all.some(x=>x.category==='visits')).toBe(true)
    expect(all.every(x=>x.to.startsWith('/')&&x.action.length>0&&x.owner.length>0)).toBe(true)
    const criticalIndices=all.map((x,i)=>x.priority==='attention'?i:-1).filter(x=>x>=0)
    if(criticalIndices.length)expect(all.slice(criticalIndices[0]).every(x=>x.priority==='attention')).toBe(true)
    expect(controlCategories.map(x=>x.id)).toContain('warehouse')
  })
  it('does not expose warehouse stock, debts or store checks to drivers',()=>{
    const s=useDistributionStore()
    s.changeDemoUser('u8')
    const scoped=alerts()
    expect(scoped.every(x=>!['warehouse','store','finance','visits'].includes(x.category))).toBe(true)
    expect(scoped.every(x=>!x.to.startsWith('/inventory')&&!x.to.startsWith('/debts'))).toBe(true)
  })
  it('restricts sales alerts to their assigned stores',()=>{
    const s=useDistributionStore()
    s.changeDemoUser('u4')
    const scoped=alerts()
    expect(scoped.some(x=>x.category==='warehouse')).toBe(false)
    const assigned=new Set(s.visibleOutlets.map(o=>o.id))
    const visibleVisits=new Set(s.visibleVisits.map(v=>v.id))
    const visibleStocks=scoped.filter(x=>x.id.startsWith('shelf:'))
    expect(visibleStocks.every(x=>assigned.has(x.id.split(':')[1]!))).toBe(true)
    expect(scoped.filter(x=>x.id.startsWith('visit:')).every(x=>visibleVisits.has(x.id.slice(6)))).toBe(true)
  })
  it('removes inventory alarms when no remaining stock exists',()=>{
    const s=useDistributionStore()
    const lot=s.data.stockBatches.find(b=>b.remainingQty>0&&b.expiryDate<=dayOffset(30))!
    expect(alerts().some(x=>x.id==='lot:'+lot.id)).toBe(true)
    lot.remainingQty=0
    expect(alerts().some(x=>x.id==='lot:'+lot.id)).toBe(false)
  })
  it('does not confuse a planned visit with a finished one',()=>{
    const s=useDistributionStore()
    const visit=s.data.visits.find(v=>v.status==='planned')!
    visit.plannedDate=dayOffset(-1)
    const id='visit:'+visit.id
    expect(alerts().find(x=>x.id===id)?.priority).toBe('critical')
    visit.status='completed'
    expect(alerts().some(x=>x.id===id)).toBe(false)
  })
  it('keeps document review separate from real OCR',()=>{
    const s=useDistributionStore()
    const doc=s.data.documents.find(d=>d.entityType==='order')!
    doc.sampleExtraction=sampleWaybill('order',doc.entityId,s.data)
    const id='document:'+doc.id
    expect(alerts().find(x=>x.id===id)?.detail).toContain('не из файла')
    doc.sampleExtraction.verified=true
    expect(alerts().some(x=>x.id===id)).toBe(false)
  })
  it('removes settled debt warnings',()=>{
    const s=useDistributionStore()
    const debt=s.data.debts.find(d=>d.amount>d.paid&&d.dueAt<dayOffset(0))!
    const id='debt:'+debt.id
    expect(alerts().some(x=>x.id===id)).toBe(true)
    debt.paid=debt.amount
    expect(alerts().some(x=>x.id===id)).toBe(false)
  })
  it('directs overdue route alerts to exact route',()=>{
    const s=useDistributionStore()
    const route=s.data.routes[0]!
    route.date=dayOffset(-1)
    const found=alerts().find(x=>x.id==='route-late:'+route.id)
    expect(found?.to).toBe('/routes/'+route.id)
    expect(found?.priority).toBe('critical')
    route.status='completed'
    expect(alerts().some(x=>x.id==='route-late:'+route.id)).toBe(false)
  })
  it('flags a manually arrived stop until delivery is recorded',()=>{
    const s=useDistributionStore()
    const r=s.data.routes[0]!
    const stop=r.stops.find(x=>x.status==='pending')!
    stop.arrivedAt=new Date().toISOString()
    expect(alerts().some(x=>x.id==='arrival:'+stop.id)).toBe(true)
    stop.status='failed';stop.notes='Магазин закрыт'
    expect(alerts().some(x=>x.id==='arrival:'+stop.id)).toBe(false)
  })
  it('shows missing stop waybill record but clears it when metadata is attached',()=>{
    const s=useDistributionStore()
    const r=s.data.routes[0]!
    const stop=r.stops.find(x=>x.status==='delivered')!
    const id='missing-waybill:'+stop.id
    expect(alerts().some(x=>x.id===id)).toBe(true)
    s.addDocumentMetadata('stop',stop.id,'Бланк накладной, оригинал не хранится','image/jpeg',0)
    expect(alerts().some(x=>x.id===id)).toBe(false)
  })

})
