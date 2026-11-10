import type { Outlet, Visit } from '@/types/domain'

export interface VisitProposal {
  outletId: string
  repId: string
  outletName: string
  district: string
  plannedDate: string
  purpose: string
}

export interface WeeklyVisitPlan {
  dates: string[]
  proposals: VisitProposal[]
}

export function workingDates(startDate: string, count = 5): string[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !Number.isInteger(count) || count < 1 || count > 20) {
    throw new Error('Укажите корректную дату и число рабочих дней.')
  }
  const cursor = new Date(startDate + 'T12:00:00Z')
  if (Number.isNaN(cursor.getTime()) || cursor.toISOString().slice(0, 10) !== startDate) {
    throw new Error('Укажите корректную дату.')
  }
  const dates: string[] = []
  while (dates.length < count) {
    const day = cursor.getUTCDay()
    if (day !== 0 && day !== 6) dates.push(cursor.toISOString().slice(0, 10))
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return dates
}

/**
 * Deterministic demo-only visit suggestions. This is district grouping, NOT
 * geocoding, actual travel-time optimization, GPS or route navigation.
 * Existing visits and user changes are never modified.
 */
export function planWorkingVisits(options: {
  outlets: readonly Outlet[]
  visits: readonly Visit[]
  startDate: string
  dailyLimit: number
  repId?: string
}): WeeklyVisitPlan {
  const { outlets, visits, startDate, dailyLimit, repId } = options
  if (!Number.isInteger(dailyLimit) || dailyLimit < 1 || dailyLimit > 12) {
    throw new Error('Допустимо от 1 до 12 визитов на сотрудника в день.')
  }
  const dates = workingDates(startDate)
  const dateSet = new Set(dates)
  const available = outlets.filter(o => o.active && !!o.repId && (!repId || o.repId === repId))
  const reps = [...new Set(available.map(o => o.repId))].sort()
  const covered = new Set(visits.filter(v => dateSet.has(v.plannedDate)).map(v => v.outletId))
  const existingByDay = new Map<string, number>()
  const lastCompleted = new Map<string, string>()
  for (const visit of visits) {
    if (dateSet.has(visit.plannedDate)) {
      const key = visit.repId + ':' + visit.plannedDate
      existingByDay.set(key, (existingByDay.get(key) || 0) + 1)
    }
    if (visit.status === 'completed' && visit.plannedDate > (lastCompleted.get(visit.outletId) || '')) {
      lastCompleted.set(visit.outletId, visit.plannedDate)
    }
  }
  const proposals: VisitProposal[] = []
  const purpose = 'Плановый визит: сверить остатки и сроки годности, собрать заявку'
  reps.forEach((rep, repIndex) => {
    const own = available.filter(o => o.repId === rep)
    const districts = [...new Set(own.map(o => o.district))].sort((a, b) => a.localeCompare(b, 'ru'))
    dates.forEach((date, dayIndex) => {
      const already = existingByDay.get(rep + ':' + date) || 0
      const slots = Math.max(0, dailyLimit - already)
      if (!slots) return
      const targetDistrict = districts[(dayIndex + repIndex) % districts.length]
      const candidates = own.filter(o => !covered.has(o.id))
        .sort((a, b) =>
          Number(b.district === targetDistrict) - Number(a.district === targetDistrict) ||
          (lastCompleted.get(a.id) || '').localeCompare(lastCompleted.get(b.id) || '') ||
          a.name.localeCompare(b.name, 'ru') || a.id.localeCompare(b.id))
      for (const outlet of candidates.slice(0, slots)) {
        covered.add(outlet.id)
        proposals.push({
          outletId: outlet.id, repId: rep, outletName: outlet.name,
          district: outlet.district, plannedDate: date, purpose,
        })
      }
    })
  })
  return { dates, proposals: proposals.sort((a, b) =>
    a.plannedDate.localeCompare(b.plannedDate) || a.repId.localeCompare(b.repId) || a.outletName.localeCompare(b.outletName, 'ru')) }
}
