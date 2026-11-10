import { describe, expect, it } from 'vitest'
import { createDemoData } from '@/data/seed'
import { planWorkingVisits, workingDates } from './visitPlanner'

describe('working-day visit planner', () => {
  const data = createDemoData()

  it('uses five weekdays across weekends and rejects invalid dates', () => {
    expect(workingDates('2026-11-13')).toEqual([
      '2026-11-13', '2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19',
    ])
    expect(workingDates('2026-11-14', 1)).toEqual(['2026-11-16'])
    expect(() => workingDates('2026-02-30')).toThrow('дату')
    expect(() => workingDates('bad')).toThrow('дату')
  })

  it('previews future appointments with no repeated outlet and per-rep day cap', () => {
    const plan = planWorkingVisits({
      outlets: data.outlets, visits: [], startDate: '2026-11-10', dailyLimit: 6,
    })
    expect(plan.proposals).toHaveLength(3 * 5 * 6)
    expect(new Set(plan.proposals.map(p => p.outletId)).size).toBe(plan.proposals.length)
    for (const proposal of plan.proposals) {
      expect(plan.dates).toContain(proposal.plannedDate)
      expect(data.outlets.find(o => o.id === proposal.outletId)?.repId).toBe(proposal.repId)
      expect(plan.proposals.filter(p => p.repId === proposal.repId && p.plannedDate === proposal.plannedDate).length).toBeLessThanOrEqual(6)
    }
  })

  it('respects existing appointments and scope, skips inactive outlets', () => {
    const assigned = data.outlets.find(o => o.repId === 'u4')!
    const next = '2026-11-10'
    const existing = [{ id: 'v', outletId: assigned.id, repId: 'u4', plannedDate: next, purpose: 'Проверка', notes: '', status: 'planned' as const }]
    const visible = data.outlets.filter(o => o.repId === 'u4')
    const result = planWorkingVisits({
      outlets: visible.map(o => o.id === visible[1]?.id ? { ...o, active: false } : o),
      visits: existing, repId: 'u4', startDate: next, dailyLimit: 2,
    })
    expect(result.proposals.every(p => p.repId === 'u4')).toBe(true)
    expect(result.proposals.some(p => p.outletId === assigned.id || p.outletId === visible[1]?.id)).toBe(false)
    expect(result.proposals.filter(p => p.plannedDate === next)).toHaveLength(1)
    expect(result.proposals).toHaveLength(9)
  })

  it('is repeat-safe when suggestions become existing appointments', () => {
    const first = planWorkingVisits({ outlets: data.outlets, visits: [], startDate: '2026-11-10', dailyLimit: 3 })
    const booked = first.proposals.map((p, index) => ({
      id: 'v' + index, outletId: p.outletId, repId: p.repId, plannedDate: p.plannedDate,
      purpose: p.purpose, notes: '', status: 'planned' as const,
    }))
    const repeated = planWorkingVisits({ outlets: data.outlets, visits: booked, startDate: '2026-11-10', dailyLimit: 3 })
    expect(repeated.proposals).toHaveLength(0)
  })

  it('rejects unbounded daily limits', () => {
    expect(() => planWorkingVisits({ outlets: [], visits: [], startDate: '2026-11-10', dailyLimit: 100 })).toThrow('12')
  })
})
