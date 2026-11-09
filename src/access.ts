import type { Role } from '@/types/domain'

export type Section = 'dashboard' | 'control' | 'companies' | 'outlets' | 'visits' | 'orders' | 'debts' | 'consignment' | 'inventory' | 'storestock' | 'salesplans' | 'fleet' | 'routes' | 'documents' | 'team' | 'settings'
export type Capability = Section | 'orders:edit' | 'outlets:edit' | 'companies:edit' | 'inventory:edit' | 'plans:edit' | 'fleet:edit' | 'visits:edit' | 'debts:edit' | 'routes:edit' | 'documents:edit' | 'consignment:edit' | 'staff:edit'
export const roleLabels: Record<Role, string> = {
  admin: 'Администратор', director: 'Руководитель', supervisor: 'Супервайзер',
  sales: 'Торговый представитель', dispatcher: 'Диспетчер', warehouse: 'Кладовщик',
  driver: 'Водитель', forwarder: 'Экспедитор', accountant: 'Бухгалтер',
}
const access: Record<Role, Capability[]> = {
  admin: ['dashboard','control','companies','outlets','visits','orders','debts','consignment','inventory','storestock','salesplans','fleet','routes','documents','team','settings',
    'orders:edit','outlets:edit','companies:edit','inventory:edit','plans:edit','fleet:edit','visits:edit','debts:edit','routes:edit','documents:edit','consignment:edit','staff:edit'],
  director: ['dashboard','control','companies','outlets','visits','orders','debts','consignment','inventory','storestock','salesplans','fleet','routes','documents','team','settings'],
  supervisor: ['dashboard','control','companies','outlets','visits','orders','debts','consignment','inventory','storestock','salesplans','fleet','routes','documents',
    'orders:edit','outlets:edit','companies:edit','plans:edit','visits:edit','documents:edit'],
  sales: ['dashboard','control','companies','outlets','visits','orders','debts','consignment','inventory','storestock','salesplans','routes','documents',
    'orders:edit','outlets:edit','visits:edit','documents:edit'],
  dispatcher: ['dashboard','control','outlets','orders','inventory','storestock','fleet','routes','documents','routes:edit','fleet:edit','documents:edit'],
  warehouse: ['dashboard','control','orders','inventory','storestock','routes','documents','inventory:edit','orders:edit','documents:edit'],
  driver: ['dashboard','control','routes','documents','documents:edit','routes:edit'],
  forwarder: ['dashboard','control','routes','documents','documents:edit','routes:edit'],
  accountant: ['dashboard','control','companies','outlets','orders','debts','consignment','inventory','storestock','documents',
    'debts:edit','consignment:edit','documents:edit'],

}
export function can(role: Role | undefined, capability: Capability): boolean {
  return !!role && access[role].includes(capability)
}
export const nav: Array<{section:Section,label:string,icon:string,path:string,group:'main'|'operations'|'admin'}> = [
  {section:'dashboard',label:'Обзор',icon:'layout-dashboard',path:'/',group:'main'},
  {section:'control',label:'Центр контроля',icon:'clipboard-check',path:'/control',group:'main'},
  {section:'companies',label:'Компании',icon:'building-2',path:'/companies',group:'main'},
  {section:'outlets',label:'Торговые точки',icon:'store',path:'/outlets',group:'main'},
  {section:'visits',label:'Визиты',icon:'calendar-clock',path:'/visits',group:'main'},
  {section:'orders',label:'Заявки',icon:'clipboard-list',path:'/orders',group:'main'},
  {section:'debts',label:'Дебиторка',icon:'wallet',path:'/debts',group:'main'},
  {section:'consignment',label:'Под реализацию',icon:'package-check',path:'/consignment',group:'main'},
  {section:'inventory',label:'Партии и сроки',icon:'boxes',path:'/inventory',group:'operations'},
  {section:'storestock',label:'Товар у магазинов',icon:'package-search',path:'/store-stock',group:'operations'},
  {section:'salesplans',label:'Планы продаж',icon:'target',path:'/sales-plans',group:'main'},
  {section:'fleet',label:'Автопарк',icon:'car-front',path:'/fleet',group:'operations'},
  {section:'routes',label:'Рейсы и доставка',icon:'route',path:'/routes',group:'operations'},
  {section:'documents',label:'Документы',icon:'scan-text',path:'/documents',group:'operations'},
  {section:'team',label:'Команда',icon:'users',path:'/team',group:'admin'},
  {section:'settings',label:'Настройки',icon:'settings-2',path:'/settings',group:'admin'},
]
