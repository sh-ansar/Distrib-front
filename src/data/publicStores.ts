/**
 * Publicly listed retail locations, not Darmen New Wave customers.
 * Facts below are sourced from the retailers' OWN published location pages.
 * No 2GIS database is copied or cached. Operational/financial fields are absent.
 */
export interface PublicStoreLead {
  id:string
  brand:string
  name:string
  address:string
  district:string
  sourceLabel:string
  sourceUrl:string
  category:'Мини-маркет'|'Супермаркет'
}

const istopSource='https://istop.kz/'
const magnumDirectorySource='https://yandex.kz/maps/ru/163/astana/chain/magnum_24_7/123811257082/'
type Location=[name:string,address:string,district:string]
const istop:Location[]=[
  ['ТРЦ «Азия Парк»','ул. Кабанбай Батыра, 21','Нура'],
  ['Назарбаев университет','ул. Кабанбай Батыра, 53','Нура'],
  ['Жагалау','ул. Кулагер, Е-10','Нура'],
  ['ЖК «Шыгыс»','ул. Сыганак, 18','Нура'],
  ['Хан Шатыр (в сторону аэропорта)','пр. Туран, 37','Нура'],
  ['Центр материнства и детства','пр. Туран, 32','Нура'],
  ['Керемет','пр. Туран, 17','Нура'],
  ['Keruen City','Коргалжинское шоссе, 1','Нура'],
  ['Парк Астана','пр. Туран, 5/1','Нура'],
  ['СтройМарт','ул. Шакарим Кудайбердыулы, 94','Алматы'],
  ['Дворец школьников','ул. Тауелсиздик, 35','Алматы'],
  ['Евразийский университет','ул. Кажымукана, 13','Алматы'],
  ['ТРЦ «Гульжан»','пр. Абылай хана, 36','Алматы'],
  ['Промышленный','ул. Шолкоде, 2А','Алматы'],
  ['ТРЦ «Рахмет»','ул. Тлендиева, 38','Сарыарка'],
  ['Медицинский университет','пр. Сарыарка, 33А','Сарыарка'],
  ['ТД «Коктем»','ул. Богембай Батыра, 34','Сарыарка'],
  ['Политехнический колледж','ул. Бейбитшилик, 35','Сарыарка'],
  ['Городская поликлиника № 1','ул. Сейфуллин, 28','Сарыарка'],
  ['Университет искусств','ул. Женис, 35','Сарыарка'],
  ['ТРЦ «Mega Silk Way»','пр. Кабанбай Батыра, 62','Есиль'],
  ['Дом Министерств №2','ул. Кунаева, 8/2','Есиль'],
  ['ТРЦ «Керуен»','ул. Достык, 9','Есиль'],
  ['БЦ «Москва»','ул. Достык, 18','Есиль'],
  ['Каспи Банк','ул. Достык, 12','Есиль'],
  ['Казмедиа','пр. Кунаева, 4','Есиль'],
  ['Халык банк','пр. Республики, 26','Байконыр'],
  ['Жастар №1','ул. Бараева, 13','Байконыр'],
  ['Жастар №2','ул. Кравцова, 6/3','Байконыр'],
]
const magnum:Location[]=[
  ['Алаш','шоссе Алаш, 23/1','Байконыр'],
  ['Едил','ул. Едил, 26','Сарыарка'],
  ['Уалиханова','ул. Ш. Уалиханова, 20','Сарыарка'],
  ['Туран 55Д','пр. Туран, 55Д','Нура'],
]
const magnumTrade:Location[]=[
  ['Туран 37','пр. Туран, 37','Нура'],
  ['Тауелсиздик 34','пр. Тауелсиздик, 34','Алматы'],
]

function entries(
  brand:string, locations:Location[],sourceUrl:string,category:PublicStoreLead['category'],
  prefix:string,
):PublicStoreLead[]{
  return locations.map(([location,address,district],index)=>({
    id:prefix+String(index+1).padStart(3,'0'),
    brand,
    name:brand+' — '+location,
    address:'Астана, '+address,
    district,sourceLabel:brand==='iStop'?'Сайт сети iStop':'Публичная карточка сети Magnum',
    sourceUrl,category,
  }))
}
export const publicStoreLeads:PublicStoreLead[]=[
  ...entries('iStop',istop,istopSource,'Мини-маркет','pub-istop-'),
  ...entries('Magnum',[...magnum,...magnumTrade],magnumDirectorySource,'Супермаркет','pub-magnum-'),
]
/** Opens an independent search. Does not obtain or store any 2GIS result. */
export function twoGisSearchUrl(shop:Pick<PublicStoreLead,'name'|'address'>):string{
  return 'https://2gis.kz/astana/search/'+encodeURIComponent(shop.name+' '+shop.address)
}
