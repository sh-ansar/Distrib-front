import type { DistributionData, Order, OrderStatus } from '@/types/domain'
import { dayOffset } from '@/utils/domain'
import { generateDemoDirectory } from '@/data/demoDirectory'

// Entirely fictional demo data. Never replace with customer data in this file.
export function createDemoData(): DistributionData {
  const now = new Date().toISOString()
  const directory = generateDemoDirectory()
  const customers = [
    ['c1','ТОО «Север Торг»','000000000001','Алия Т.','active',1500000],
    ['c2','ТОО «Город Маркет»','000000000002','Данияр А.','active',900000],
    ['c3','ТОО «Прайм Ритейл»','000000000003','Марат К.','active',800000],
    ['c4','ИП «Мирас»','000000000004','Мирас С.','active',420000],
    ['c5','ТОО «Аркада Плюс»','000000000005','Ольга Н.','on_hold',500000],
    ['c6','ИП «Нур-Дәм»','000000000006','Нурали Р.','active',250000],
    ['c7','ТОО «Центр Фуд»','000000000007','Руслан Б.','active',1000000],
    ['c8','ТОО «Сити Магазин»','000000000008','Анна В.','active',760000],
  ] as const
  const outlets = [
    ['o1','c1','Маркет «Арман»','ул. Сарыарка, 15','Сарыарка','u4'],
    ['o2','c1','Маркет «Олимп»','ул. Кенесары, 22','Сарыарка','u4'],
    ['o3','c2','Минимаркет «Оазис»','пр. Туран, 46','Есиль','u5'],
    ['o4','c2','Маркет «Восток»','ул. Достык, 13','Есиль','u5'],
    ['o5','c3','Магазин «Керуен»','ул. Кабанбай батыра, 8','Нура','u4'],
    ['o6','c4','Магазин «Мирас»','ул. Республики, 37','Байконыр','u6'],
    ['o7','c5','Продукты «Аркада»','ул. Пушкина, 19','Алматы','u6'],
    ['o8','c6','Магазин «Береке»','ул. Акмешит, 6','Есиль','u5'],
    ['o9','c7','Супермаркет «Акжол»','ул. Туркестан, 18','Нура','u4'],
    ['o10','c8','Маркет «Лидер»','ул. Улы Дала, 54','Есиль','u5'],
    ['o11','c7','Магазин «Жибек»','ул. Жумабаева, 12','Алматы','u6'],
  ] as const
  const products = [
    ['p1','DR-101','Вода питьевая 0,5 л (12 шт.)','Напитки','кор',2500,6.2],
    ['p2','DR-102','Вода питьевая 1,5 л (6 шт.)','Напитки','кор',2050,9.2],
    ['p3','DR-103','Сок яблочный 1 л (12 шт.)','Напитки','кор',7200,13],
    ['p4','DR-104','Сок апельсиновый 1 л (12 шт.)','Напитки','кор',7800,13],
    ['p5','DR-105','Лимонад 0,5 л (12 шт.)','Напитки','кор',4800,6.4],
    ['p6','FL-201','Мука высший сорт 5 кг','Мука','меш',2200,5],
    ['p7','FL-202','Мука высший сорт 10 кг','Мука','меш',4100,10],
    ['p8','FL-203','Мука первый сорт 25 кг','Мука','меш',7900,25],
    ['p9','GR-301','Рис шлифованный 5 кг','Крупы','уп',4100,5],
    ['p10','GR-302','Гречка 1 кг (10 шт.)','Крупы','кор',6600,10],
    ['p11','FD-401','Масло подсолнечное 1 л (12 шт.)','Бакалея','кор',12500,12.8],
    ['p12','FD-402','Сахар 5 кг','Бакалея','уп',3900,5],
    ['p13','FD-403','Макароны 0,5 кг (20 шт.)','Бакалея','кор',8500,10],
  ] as const
  const makeOrder = (index:number, outletId:string, status:OrderStatus, offset:number, pairs:Array<[string,number]>):Order => {
    const customerId = outlets.find(o => o[0] === outletId)?.[1] ?? 'c1'
    return {
      id:'ord'+index,number:'З-'+String(2400+index),outletId,customerId,
      createdAt:dayOffset(offset-1),deliveryDate:dayOffset(offset),
      status,items:pairs.map(([productId,quantity])=>({productId,quantity,price:Number(products.find(p=>p[0]===productId)?.[5] ?? 0)})),
      notes:'',createdBy:['u4','u5','u6'][index%3],origin:'sales',
    }
  }
  const initialOrders: Order[] = [
      makeOrder(1,'o1','new',1,[['p1',12],['p6',20],['p11',3]]),
      makeOrder(2,'o3','confirmed',1,[['p3',6],['p7',12]]),
      makeOrder(3,'o2','ready',1,[['p1',16],['p5',5]]),
      makeOrder(4,'o4','ready',1,[['p2',10],['p12',15]]),
      makeOrder(5,'o5','picking',1,[['p8',12],['p9',5]]),
      makeOrder(6,'o6','new',2,[['p6',14],['p10',4]]),
      makeOrder(7,'o8','confirmed',2,[['p3',9],['p11',3]]),
      makeOrder(8,'o9','in_route',0,[['p1',20],['p7',10]]),
      makeOrder(9,'o10','in_route',0,[['p2',20],['p4',8]]),
      makeOrder(10,'o11','delivered',-1,[['p6',12],['p9',6]]),
      makeOrder(11,'o1','delivered',-2,[['p3',6],['p12',8]]),
      makeOrder(12,'o7','partial',-3,[['p8',3],['p5',10]]),
      makeOrder(13,'o3','delivered',-3,[['p11',5],['p1',10]]),
      makeOrder(14,'o6','cancelled',-3,[['p3',4]]),

  ]
  const preallocated = (productId:string): number => initialOrders
    .filter(o=>['confirmed','picking','ready','in_route'].includes(o.status))
    .reduce((sum,o)=>sum+o.items.filter(i=>i.productId===productId).reduce((q,i)=>q+i.quantity,0),0)
  return {
    version:3,
    customers:[...customers.map(([id,legalName,bin,contactName,status,creditLimit])=>({
      id,legalName,bin,contactName,status,creditLimit,termsDays:14,
      phone:'+7 700 000 00 '+id.slice(1).padStart(2,'0'),
      email:'demo-'+id+'@example.invalid',createdAt:dayOffset(-150),
    })),...directory.customers],
    outlets:[...outlets.map(([id,customerId,name,address,district,repId])=>({
      id,customerId,name,address:'Астана, '+address,district,contactName:'Контакт магазина',
      phone:'+7 700 000 11 '+id.slice(1).padStart(2,'0'),repId,tags:[],
      notes:'',active:true,createdAt:dayOffset(-130),
    })),...directory.outlets],
    visits:[
      {id:'vi1',outletId:'o1',repId:'u4',plannedDate:dayOffset(0),status:'planned',purpose:'Проверить ассортимент и собрать заявку',notes:''},
      {id:'vi2',outletId:'o3',repId:'u5',plannedDate:dayOffset(0),status:'planned',purpose:'Плановый визит',notes:''},
      {id:'vi3',outletId:'o6',repId:'u6',plannedDate:dayOffset(0),status:'completed',purpose:'Сверка поставок',notes:'Заявка согласована, ожидают доставку.',startedAt:now,finishedAt:now},
      {id:'vi4',outletId:'o2',repId:'u4',plannedDate:dayOffset(1),status:'planned',purpose:'Контроль полочного ассортимента',notes:''},
      {id:'vi5',outletId:'o5',repId:'u4',plannedDate:dayOffset(0),status:'skipped',purpose:'Плановый визит',notes:'Магазин закрыт.',finishedAt:now},
      {id:'vi6',outletId:'o8',repId:'u5',plannedDate:dayOffset(0),status:'in_progress',purpose:'Собрать заявку',notes:'',startedAt:now},
      {id:'vi7',outletId:'o9',repId:'u4',plannedDate:dayOffset(-1),status:'completed',purpose:'Контроль выкладки',notes:'Полки заполнены.',startedAt:now,finishedAt:now},
    ],
    products:products.map(([id,sku,name,category,unit,price,weightKg])=>({id,sku,name,category,unit,price,weightKg,active:true})),
    warehouses:[{id:'w1',name:'Основной склад',address:'Астана · Логистическая зона'},
      {id:'w2',name:'Дополнительный склад',address:'Астана · Южный сектор'}],
    stocks:products.flatMap(([id],i)=>[
      {warehouseId:'w1',productId:id,onHand:60+i*19,reserved:5+(i%5)*2+preallocated(id),updatedAt:now},
      {warehouseId:'w2',productId:id,onHand:20+i*4,reserved:i%4,updatedAt:now},
    ]),
    orders:initialOrders,
    debts:[
      {id:'d1',customerId:'c1',invoice:'РТ-000182',issuedAt:dayOffset(-24),dueAt:dayOffset(-10),amount:560000,paid:200000},
      {id:'d2',customerId:'c1',invoice:'РТ-000202',issuedAt:dayOffset(-8),dueAt:dayOffset(6),amount:245000,paid:0},
      {id:'d3',customerId:'c2',invoice:'РТ-000194',issuedAt:dayOffset(-17),dueAt:dayOffset(-3),amount:318000,paid:180000},
      {id:'d4',customerId:'c3',invoice:'РТ-000203',issuedAt:dayOffset(-7),dueAt:dayOffset(7),amount:406000,paid:0},
      {id:'d5',customerId:'c5',invoice:'РТ-000151',issuedAt:dayOffset(-33),dueAt:dayOffset(-19),amount:420000,paid:75000},
      {id:'d6',customerId:'c7',invoice:'РТ-000209',issuedAt:dayOffset(-5),dueAt:dayOffset(9),amount:515000,paid:240000},
      {id:'d7',customerId:'c8',invoice:'РТ-000179',issuedAt:dayOffset(-22),dueAt:dayOffset(-8),amount:225000,paid:100000},
    ],
    consignments:[
      {id:'con1',customerId:'c1',outletId:'o1',productId:'p3',sent:30,sold:18,returned:2,price:7200,handedAt:dayOffset(-20),reconciledAt:dayOffset(-5)},
      {id:'con2',customerId:'c2',outletId:'o3',productId:'p5',sent:50,sold:31,returned:4,price:4800,handedAt:dayOffset(-15),reconciledAt:dayOffset(-7)},
      {id:'con3',customerId:'c5',outletId:'o7',productId:'p6',sent:90,sold:42,returned:8,price:2200,handedAt:dayOffset(-29)},
      {id:'con4',customerId:'c7',outletId:'o9',productId:'p1',sent:75,sold:53,returned:0,price:2500,handedAt:dayOffset(-13),reconciledAt:dayOffset(-3)},
    ],
    employees:[
      {id:'u1',name:'Администратор демо',initials:'АД',role:'admin',phone:'—',active:true},
      {id:'u2',name:'Руководитель демо',initials:'РД',role:'director',phone:'—',active:true},
      {id:'u3',name:'Супервайзер демо',initials:'СД',role:'supervisor',phone:'—',active:true},
      {id:'u4',name:'Алексей (демо)',initials:'АЛ',role:'sales',phone:'—',active:true},
      {id:'u5',name:'Диана (демо)',initials:'ДИ',role:'sales',phone:'—',active:true},
      {id:'u6',name:'Тимур (демо)',initials:'ТИ',role:'sales',phone:'—',active:true},
      {id:'u7',name:'Диспетчер демо',initials:'ДД',role:'dispatcher',phone:'—',active:true},
      {id:'u8',name:'Водитель №1',initials:'В1',role:'driver',phone:'—',active:true},
      {id:'u9',name:'Водитель №2',initials:'В2',role:'driver',phone:'—',active:true},
      {id:'u10',name:'Кладовщик демо',initials:'КД',role:'warehouse',phone:'—',active:true},
      {id:'u11',name:'Бухгалтер демо',initials:'БД',role:'accountant',phone:'—',active:true},
    ],
    vehicles:[
      {id:'v1',plate:'000 DEM 01',title:'Грузовик 3,5 т · демо',capacityKg:3500,driverId:'u8'},
      {id:'v2',plate:'001 DEM 01',title:'Фургон 1,5 т · демо',capacityKg:1500,driverId:'u9'},
      {id:'v3',plate:'002 DEM 01',title:'Грузовик 5 т · демо',capacityKg:5000,driverId:'u8'},
    ],
    routes:[{
      id:'r1',number:'Р-001',date:dayOffset(0),driverId:'u8',vehicleId:'v1',status:'active',
      stops:[
        {id:'st1',outletId:'o9',orderIds:['ord8'],position:1,status:'pending',notes:''},
        {id:'st2',outletId:'o10',orderIds:['ord9'],position:2,status:'pending',notes:''},
      ],
    }],
    documents:[
      {id:'doc1',entityType:'customer',entityId:'c1',filename:'Пример договора (демо)',mimeType:'application/pdf',size:0,createdAt:dayOffset(-40),createdBy:'u1',demoOnly:true},
      {id:'doc2',entityType:'order',entityId:'ord11',filename:'Пример накладной (демо)',mimeType:'image/jpeg',size:0,createdAt:dayOffset(-2),createdBy:'u8',demoOnly:true},
    ],
    activities:[
      {id:'act1',entityType:'outlet',entityId:'o1',kind:'note',message:'Пример: согласован следующий визит представителя.',actorId:'u4',createdAt:now},
      {id:'act2',entityType:'customer',entityId:'c5',kind:'risk',message:'Пример: торговые операции приостановлены до сверки.',actorId:'u11',createdAt:now},
    ],
  }
}
