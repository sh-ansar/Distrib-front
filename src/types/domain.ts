export type Role = 'admin' | 'director' | 'supervisor' | 'sales' | 'dispatcher' | 'warehouse' | 'driver' | 'accountant'
export type OrderStatus = 'new' | 'confirmed' | 'picking' | 'ready' | 'in_route' | 'delivered' | 'partial' | 'cancelled'
export type RouteStatus = 'planned' | 'loading' | 'active' | 'completed'
export type StopStatus = 'pending' | 'delivered' | 'partial' | 'failed'
export type EntityType = 'customer' | 'outlet' | 'order' | 'route' | 'stop'
export type CustomerStatus = 'active' | 'on_hold'

export type VatStatus = 'unknown' | 'vat' | 'no_vat'
export type PaymentMethod = 'bank' | 'cash' | 'mixed'
/** Operational company dossier. Finance fields in Customer remain read-only until verified against 1C. */
export interface CustomerProfile {
  tradingName: string
  category: string
  directorName: string
  contactPosition: string
  whatsapp: string
  website: string
  legalAddress: string
  actualAddress: string
  vatStatus: VatStatus
  contractNumber: string
  contractDate: string
  paymentMethod: PaymentMethod
  territory: string
  workingHours: string
  deliveryDays: string
  receivingWindow: string
  deliveryRequirements: string
  notes: string
  updatedAt?: string
}

export interface Customer {
  id: string
  legalName: string
  bin: string
  phone: string
  email: string
  contactName: string
  termsDays: number
  creditLimit: number
  status: CustomerStatus
  createdAt: string
  profile?: CustomerProfile
}
export interface Outlet {
  id: string
  customerId: string
  name: string
  address: string
  district: string
  contactName: string
  phone: string
  repId: string
  tags: string[]
  notes: string
  active: boolean
  createdAt: string
  receivingWindow?: string
  accessInstructions?: string
}
export interface Product {
  id: string
  sku: string
  name: string
  category: string
  unit: string
  price: number
  weightKg: number
  active: boolean
}
export interface Warehouse {
  id: string
  name: string
  address: string
}
export interface Stock {
  warehouseId: string
  productId: string
  onHand: number
  reserved: number
  updatedAt: string
}
export interface OrderItem {
  productId: string
  quantity: number
  price: number
}
export interface Order {
  id: string
  number: string
  customerId: string
  outletId: string
  createdAt: string
  deliveryDate: string
  status: OrderStatus
  items: OrderItem[]
  notes: string
  createdBy: string
  origin: 'sales' | 'integration'
  routeId?: string
}
export interface Debt {
  id: string
  customerId: string
  invoice: string
  issuedAt: string
  dueAt: string
  amount: number
  paid: number
}
export interface Consignment {
  id: string
  customerId: string
  outletId: string
  productId: string
  sent: number
  sold: number
  returned: number
  price: number
  handedAt: string
  reconciledAt?: string
}
export interface Employee {
  id: string
  name: string
  initials: string
  role: Role
  phone: string
  active: boolean
}
export interface Vehicle {
  id: string
  plate: string
  title: string
  capacityKg: number
  driverId: string
}
export interface RouteStop {
  id: string
  outletId: string
  orderIds: string[]
  position: number
  status: StopStatus
  notes: string
  completedAt?: string
}
export interface DeliveryRoute {
  id: string
  number: string
  date: string
  driverId: string
  vehicleId: string
  status: RouteStatus
  stops: RouteStop[]
}
export interface DocumentRecord {
  id: string
  entityType: EntityType
  entityId: string
  filename: string
  mimeType: string
  size: number
  createdAt: string
  createdBy: string
  demoOnly: boolean
}
export interface Activity {
  id: string
  entityType: EntityType
  entityId: string
  kind: string
  message: string
  actorId: string
  createdAt: string
}
export type VisitStatus = 'planned' | 'in_progress' | 'completed' | 'skipped'
export interface Visit {
  id: string
  outletId: string
  repId: string
  plannedDate: string
  status: VisitStatus
  purpose: string
  notes: string
  startedAt?: string
  finishedAt?: string
}

export interface DistributionData {
  version: number
  customers: Customer[]
  outlets: Outlet[]
  visits: Visit[]
  products: Product[]
  warehouses: Warehouse[]
  stocks: Stock[]
  orders: Order[]
  debts: Debt[]
  consignments: Consignment[]
  employees: Employee[]
  vehicles: Vehicle[]
  routes: DeliveryRoute[]
  documents: DocumentRecord[]
  activities: Activity[]
}
