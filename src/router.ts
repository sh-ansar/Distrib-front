import { createRouter, createWebHistory } from 'vue-router'
import { can, type Section } from '@/access'
import { useDistributionStore } from '@/stores/distribution'

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior: () => ({top:0}),
  routes: [
    {path:'/',component:()=>import('@/pages/DashboardPage.vue'),meta:{section:'dashboard',title:'Обзор'}},
    {path:'/control',component:()=>import('@/pages/ControlCenterPage.vue'),meta:{section:'control',title:'Центр контроля'}},
    {path:'/companies',component:()=>import('@/pages/CompaniesPage.vue'),meta:{section:'companies',title:'Компании'}},
    {path:'/companies/:id',component:()=>import('@/pages/CompanyDetailPage.vue'),meta:{section:'companies',title:'Карточка компании'}},
    {path:'/outlets',component:()=>import('@/pages/OutletsPage.vue'),meta:{section:'outlets',title:'Торговые точки'}},
    {path:'/public-stores',component:()=>import('@/pages/PublicStoresPage.vue'),meta:{section:'outlets',title:'Магазины Астаны'}},
    {path:'/visits',component:()=>import('@/pages/VisitsPage.vue'),meta:{section:'visits',title:'Визиты торговых представителей'}},
    {path:'/outlets/:id',component:()=>import('@/pages/OutletDetailPage.vue'),meta:{section:'outlets',title:'Карточка магазина'}},
    {path:'/orders',component:()=>import('@/pages/OrdersPage.vue'),meta:{section:'orders',title:'Заявки'}},
    {path:'/debts',component:()=>import('@/pages/DebtsPage.vue'),meta:{section:'debts',title:'Дебиторская задолженность'}},
    {path:'/consignment',component:()=>import('@/pages/ConsignmentPage.vue'),meta:{section:'consignment',title:'Товар под реализацию'}},
    {path:'/inventory',component:()=>import('@/pages/InventoryPage.vue'),meta:{section:'inventory',title:'Партии и сроки годности'}},
    {path:'/store-stock',component:()=>import('@/pages/OutletStockPage.vue'),meta:{section:'storestock',title:'Товар у магазинов'}},
    {path:'/sales-plans',component:()=>import('@/pages/SalesPlansPage.vue'),meta:{section:'salesplans',title:'Планы продаж'}},
    {path:'/fleet',component:()=>import('@/pages/FleetPage.vue'),meta:{section:'fleet',title:'Автопарк'}},
    {path:'/routes',component:()=>import('@/pages/RoutesPage.vue'),meta:{section:'routes',title:'Рейсы и доставка'}},
    {path:'/delivery',component:()=>import('@/pages/DeliveryWorkPage.vue'),meta:{section:'deliveries',title:'Моя доставка'}},
    {path:'/returns',component:()=>import('@/pages/ReturnsPage.vue'),meta:{section:'returns',title:'Возвраты и расхождения'}},
    {path:'/routes/:id',component:()=>import('@/pages/RouteDetailPage.vue'),meta:{section:'routes',title:'Рейс'}},
    {path:'/documents',component:()=>import('@/pages/DocumentsPage.vue'),meta:{section:'documents',title:'Документы'}},
    {path:'/team',component:()=>import('@/pages/TeamPage.vue'),meta:{section:'team',title:'Команда'}},
    {path:'/settings',component:()=>import('@/pages/SettingsPage.vue'),meta:{section:'settings',title:'Настройки'}},
    {path:'/:pathMatch(.*)*',redirect:'/'},
  ],
})

router.beforeEach(to => {
  const store = useDistributionStore()
  const section = to.meta.section as Section | undefined
  if (section && !can(store.currentRole,section)) return {path:'/',query:{denied:'1'}}
  return true
})
router.afterEach(to => {
  document.title = String(to.meta.title || 'Darmen New Wave')+' · Darmen New Wave'
})
