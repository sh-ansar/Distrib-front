import type { CustomerProfile } from '@/types/domain'

export function blankCompanyProfile(): CustomerProfile {
  return {
    tradingName:'', category:'', directorName:'', contactPosition:'',
    whatsapp:'', website:'', legalAddress:'', actualAddress:'',
    vatStatus:'unknown', contractNumber:'', contractDate:'', paymentMethod:'bank',
    territory:'', workingHours:'', deliveryDays:'', receivingWindow:'',
    deliveryRequirements:'', notes:'',
  }
}

/** Ensures backward compatibility with company cards created before v4. */
export function companyProfile(profile?: Partial<CustomerProfile>): CustomerProfile {
  return {...blankCompanyProfile(),...profile}
}

export function demoCompanyProfile(index:number): CustomerProfile {
  const districts=['Есиль','Нура','Алматы','Сарыарка','Байконыр']
  return {
    ...blankCompanyProfile(),
    tradingName:'Демо-магазин '+String(index+1),
    category:['Продуктовая розница','Минимаркет','Сеть магазинов','Оптовый клиент','HoReCa'][index%5]!,
    directorName:'Руководитель (демо)',
    contactPosition:'Управляющий магазином',
    legalAddress:'Астана · демонстрационный адрес '+String(index+1),
    actualAddress:'Астана · торговая зона '+String(index+1),
    vatStatus:index%3===0?'vat':'unknown',
    contractNumber:'DEMO-'+String(index+1).padStart(4,'0'),
    paymentMethod:index%4===0?'mixed':'bank',
    territory:districts[index%districts.length]!,
    workingHours:'09:00–19:00',
    deliveryDays:index%2===0?'Пн, Ср, Пт':'Вт, Чт, Сб',
    receivingWindow:'10:00–16:00',
    deliveryRequirements:'Связаться с магазином до выгрузки.',
    notes:'Вымышленный пример досье. Данные не получены из 1С.',
  }
}
