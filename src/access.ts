import type { Role } from '@/types/domain'

export type Section = 'dashboard' | 'companies' | 'outlets' | 'visits' | 'orders' | 'debts' | 'consignment' | 'inventory' | 'salesplans' | 'fleet' | 'routes' | 'documents' | 'team' | 'settings'
export type Capability = Section | 'orders:edit' | 'outlets:edit' | 'companies:edit' | 'inventory:edit' | 'plans:edit' | 'fleet:edit' | 'visits:edit' | 'debts:edit' | 'routes:edit' | 'documents:edit' | 'consignment:edit' | 'staff:edit'
export const roleLabels: Record<Role, string> = {
  admin: 'Администратор', director: 'Руководитель', supervisor: 'Супервайзер',
  sales: 'Торговый представитель', dispatcher: 'Диспетчер', warehouse: 'Кладовщик',
  driver: 'Водитель', forwarder: 'Экспедитор', accountant: 'Бухгалтер',
}
const access: Record<Role, Capability[]> = {
  admin: ['dashboard','companies','outlets','visits','orders','debts','consignment','inventory','storestock','salesplans','fleet','routes','documents','team','settings',
    'orders:edit','outlets:edit','companies:edit','inventory:edit','plans:edit','fleet:edit','visits:edit','debts:edit','routes:edit','documents:edit','consignment:edit','staff:edit'],
  director: ['dashboard','companies','outlets','visits','orders','debts','consignment','inventory','storestock','salesplans','fleet','routes','documents','team','settings'],
  supervisor: ['dashboard','companies','outlets','visits','orders','debts','consignment','inventory','storestock','salesplans','fleet','routes','documents',
    'orders:edit','outlets:edit','companies:edit','plans:edit','visits:edit','documents:edit'],
  sales: ['dashboard','companies','outlets','visits','orders','debts','consignment','inventory','storestock','salesplans','routes','documents',
    'orders:edit','outlets:edit','visits:edit','documents:edit'],
  dispatcher: ['dashboard','outlets','orders','inventory','storestock','fleet','routes','documents','routes:edit','fleet:edit','documents:edit'],
  warehouse: ['dashboard','orders','inventory','storestock','routes','documents','inventory:edit','orders:edit','documents:edit'],
  driver: ['dashboard','routes','documents','documents:edit','routes:edit'],
  forwarder: ['dashboard','routes','documents','documents:edit','routes:edit'],
  accountant: ['dashboard','companies','outlets','orders','debts','consignment','inventory','storestock','documents',
    'debts:edit','consignment:edit','documents:edit'],

}
export function can(role: Role | undefined, capability: Capability): boolean {
  return !!role && access[role].includes(capability)
}
export const nav: Array<{section:Section,label:string,icon:string,path:string,group:'main'|'operations'|'admin'}> = [
  {section:'dashboard',label:'Обзор',icon:'layout-dashboard',path:'/',group:'main'},
  {section:'companies',label:'Компании',icon:'users',path:'/companies',group:'main'},
  {section:'outlets',label:'Торговые точки',icon:'store',path:'/outlets',group:'main'},
  {section:'visits',label:'Визиты',icon:'map-pin',path:'/visits',group:'main'},
  {section:'orders',label:'Заявки',icon:'clipboard-list',path:'/orders',group:'main'},
  {section:'debts',label:'Дебиторка',icon:'wallet',path:'/debts',group:'main'},
  {section:'consignment',label:'Под реализацию',icon:'package-check',path:'/consignment',group:'main'},
  {section:'inventory',label:'Партии и сроки',icon:'warehouse',path:'/inventory',group:'operations'},
  {section:'salesplans',label:'Планы продаж',icon:'target',path:'/sales-plans',group:'main'},
  {section:'fleet',label:'Автопарк',icon:'truck',path:'/fleet',group:'operations'},
  {section:'routes',label:'Рейсы и доставка',icon:'truck',path:'/routes',group:'operations'},
  {section:'documents',label:'Документы',icon:'files',path:'/documents',group:'operations'},
  {section:'team',label:'Команда',icon:'users',path:'/team',group:'admin'},
  {section:'settings',label:'Настройки',icon:'settings-2',path:'/settings',group:'admin'},
]
