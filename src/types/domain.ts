export type Role = 'admin' | 'director' | 'supervisor' | 'sales' | 'dispatcher' | 'warehouse' | 'driver' | 'forwarder' | 'accountant'
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
  volumeM3?: number
}
export interface Warehouse {
  id: string
  name: string
  address: string
}
export interface StockBatch {
  id: string
  warehouseId: string
  productId: string
  batchNumber: string
  receivedDate: string
  expiryDate: string
  initialQty: number
  remainingQty: number
  supplier: string
  receiptRef: string
  recordedBy?: string
}
export interface OutletShipment {
  id: string
  outletId: string
  productId: string
  batchId: string
  batchNumber: string
  expiryDate: string
  quantity: number
  orderId: string
  routeId: string
  deliveredAt: string
}
export interface OutletStockCheck {
  id: string
  outletId: string
  productId: string
  batchNumber: string
  expiryDate: string
  quantity: number
  checkedAt: string
  checkedBy: string
  notes: string
}
export interface SalesPlan {
  id: string
  employeeId: string
  month: string
  revenueTarget: number
  visitsTarget: number
  outletsTarget: number
  notes: string
}
export interface WaybillSample {
  simulated: true
  invoiceNumber: string
  invoiceDate: string
  supplier: string
  recipient: string
  items: Array<{productId:string;name:string;quantity:number;unit:string;price:number}>
  total: number
  verified: boolean
}

export interface ReconciliationLine {
  productId: string
  orderedQty: number
  acceptedQty: number
  returnedQty: number
  missingQty: number
}
export interface DeliveryReconciliation {
  id: string
  routeId: string
  stopId: string
  status: 'submitted' | 'confirmed'
  lines: ReconciliationLine[]
  notes: string
  submittedAt: string
  submittedBy: string
  confirmedAt?: string
  confirmedBy?: string
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
  volumeM3?: number
  maxPallets?: number
  active?: boolean
  year?: number
  notes?: string
}
export interface RouteStop {
  id: string
  outletId: string
  orderIds: string[]
  position: number
  status: StopStatus
  notes: string
  completedAt?: string
  arrivedAt?: string
  arrivedBy?: string
  receivedBy?: string
}
export interface DeliveryRoute {
  id: string
  number: string
  date: string
  driverId: string
  vehicleId: string
  forwarderId?: string
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
  localAttachment?: boolean
  sampleExtraction?: WaybillSample
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
  stockBatches: StockBatch[]
  outletShipments: OutletShipment[]
  outletStockChecks: OutletStockCheck[]
  salesPlans: SalesPlan[]
  returnReconciliations: DeliveryReconciliation[]
  orders: Order[]
  debts: Debt[]
  consignments: Consignment[]
  employees: Employee[]
  vehicles: Vehicle[]
  routes: DeliveryRoute[]
  documents: DocumentRecord[]
  activities: Activity[]
}
