import type { Customer, Outlet } from '@/types/domain'
import { dayOffset } from '@/utils/domain'
import { demoCompanyProfile } from '@/utils/company'

// Synthetic names and placeholder addresses; not a registry of actual businesses.
const names = [
  'Акварель Снаб','Горизонт Продукт','Жетысу Лайн','Северная Полка','Дала Фуд',
  'Меридиан Трейд','Вектор Дистрибьюшн','Солнечный Маркет','Орбита Продукт',
  'Новый Караван','Сапа Ритейл','Арна Сервис','Номад Логистик','Астана Продукт Плюс',
  'Сити Фреш','Тау Самал','Альфа Доставка','Лидер Бакалея','Шанырак Торг',
  'Байтерек Маркет','Сарыарка Фуд','Айна Трейд','Восточный Ряд','Премьер Опт',
  'Керуен Снаб','Акжол Продукт','Нур Лайн','Триумф Маркет','Шёлковый Путь',
  'Каспий Дала','Столица Поставка','Асыл Ритейл','Мега Склад','Туран Опт',
  'Степной Вкус','Береке Дистрибьюшн','Центр Фасовки','Семь Холмов',
  'Радуга Товаров','Синяя Полка','Новый Рассвет','Акку Снаб','Орион Маркет',
  'Старт Поставка','Золотая Крупа','Алма Фреш','Ясный День','Классик Фуд',
] as const
const districts = ['Есиль','Нура','Сарыарка','Алматы','Байконыр'] as const

export function generateDemoDirectory(): { customers: Customer[]; outlets: Outlet[] } {
  const customers: Customer[] = []
  const outlets: Outlet[] = []
  names.forEach((name, index) => {
    const customerId = 'c-demo-' + String(index + 1).padStart(3,'0')
    const legalName = (index % 7 === 0 ? 'ИП ' : 'ТОО ') + '«' + name + '»'
    customers.push({
      id: customerId, legalName,
      bin: '000000' + String(100101 + index).padStart(6, '0'),
      contactName: 'Контакт (демо)', phone: '+7 000 000 00 ' + String(index).padStart(2, '0'),
      email: 'company-' + (index + 1) + '@example.invalid',
      termsDays: 7 + index % 4 * 7,
      creditLimit: 300000 + index * 25000,
      status: index % 13 === 0 ? 'on_hold' : 'active',
      createdAt: dayOffset(-90 + index % 30),
      profile: demoCompanyProfile(index+8),
    })
    const count = 1 + index % 3
    for (let i = 0; i < count; i++) {
      const district = districts[(index + i) % districts.length]!
      outlets.push({
        id: 'o-demo-' + String(index + 1).padStart(3,'0') + '-' + (i + 1),
        customerId,
        name: 'Маркет «' + name + (count > 1 ? ' ' + (i + 1) : '') + '»',
        address: 'Астана, р-н ' + district + ', демонстрационный адрес ' + (index + 1) + '/' + (i + 1),
        district,
        contactName: 'Ответственный (демо)',
        phone: '+7 000 001 ' + String(index).padStart(3, '0') + ' ' + (i + 1),
        repId: ['u4','u5','u6'][(index + i) % 3]!,
        tags: ['Демо'],
        notes: 'Вымышленная запись для проверки поиска и мобильного интерфейса.',
        active: true,
        receivingWindow: index % 2 === 0 ? '10:00–16:00':'09:00–14:00',
        accessInstructions: 'Демо: приёмка через основной вход.',
        createdAt: dayOffset(-65 + index % 25),
      })
    }
  })
  return { customers, outlets }
}
