import type { Consignment, Debt, DeliveryRoute, Order, OrderItem, OrderStatus, Product } from '@/types/domain'

export const money = (value: number): string => new Intl.NumberFormat('ru-KZ', {
  style: 'currency', currency: 'KZT', maximumFractionDigits: 0,
}).format(value)
export const qty = (value: number): string => new Intl.NumberFormat('ru-KZ', { maximumFractionDigits: 2 }).format(value)
export const displayDate = (value: string): string => value ? new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC',
}).format(new Date(value + (value.length === 10 ? 'T12:00:00Z' : ''))) : '—'
export const isoDay = (date: Date = new Date()): string => [
  date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0'),
].join('-')
export const dayOffset = (offset: number): string => {
  const date = new Date()
  date.setHours(12, 0, 0, 0)
  date.setDate(date.getDate() + offset)
  return isoDay(date)
}
export const uid = (prefix: string): string => prefix + '-' + (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2))
export const orderTotal = (order: Pick<Order, 'items'>): number => order.items.reduce((s, i) => s + i.price * i.quantity, 0)
export const debtBalance = (debt: Debt): number => Math.max(0, debt.amount - debt.paid)
export const isOverdue = (debt: Debt, date: string = isoDay()): boolean => debtBalance(debt) > 0 && debt.dueAt < date
export const consignmentBalance = (record: Consignment): number => Math.max(0, record.sent - record.sold - record.returned)
export const consignmentValue = (record: Consignment): number => consignmentBalance(record) * record.price
export const orderWeight = (items: OrderItem[], products: Product[]): number => items.reduce(
  (total, item) => total + item.quantity * (products.find(p => p.id === item.productId)?.weightKg ?? 0), 0,
)
export const routeOrderIds = (route: DeliveryRoute): string[] => route.stops.flatMap(stop => stop.orderIds)
export const statuses: Record<OrderStatus, string> = {
  new: 'Новая', confirmed: 'Подтверждена', picking: 'Сборка', ready: 'Готова',
  in_route: 'В рейсе', delivered: 'Доставлена', partial: 'Частично', cancelled: 'Отменена',
}
export const routeStatuses: Record<DeliveryRoute['status'], string> = {
  planned: 'Запланирован', loading: 'Загрузка', active: 'В пути', completed: 'Завершён',
}
export const orderTransitions: Record<OrderStatus, OrderStatus[]> = {
  new: ['confirmed', 'cancelled'],
  confirmed: ['picking', 'cancelled'],
  picking: ['ready', 'cancelled'],
  ready: ['in_route', 'cancelled'],
  in_route: ['delivered', 'partial'],
  delivered: [],
  partial: [],
  cancelled: [],
}
export const canTransitionOrder = (from: OrderStatus, to: OrderStatus): boolean => orderTransitions[from].includes(to)
export function phoneLink(value: string): string { return 'tel:' + value.replace(/[^+\d]/g, '') }
