<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '@/components/ui/AppIcon.vue'
import PageTitle from '@/components/ui/PageTitle.vue'
import SectionCard from '@/components/ui/SectionCard.vue'
import UiTable from '@/components/ui/UiTable.vue'
import { publicStoreLeads, twoGisSearchUrl, type PublicStoreLead } from '@/data/publicStores'
import { can } from '@/access'
import { useDistributionStore } from '@/stores/distribution'
import { matchesSearch } from '@/utils/search'

const store=useDistributionStore()
const router=useRouter()
const search=ref('')
const district=ref('')
const brand=ref('')
const districts=[...new Set(publicStoreLeads.map(x=>x.district))].sort()
const brands=[...new Set(publicStoreLeads.map(x=>x.brand))].sort()
const rows=computed(()=>publicStoreLeads.filter(x=>
  (!district.value||x.district===district.value)&&
  (!brand.value||x.brand===brand.value)&&
  matchesSearch(search.value,[x.name,x.address,x.brand,x.district,x.category])
).sort((a,b)=>a.brand.localeCompare(b.brand,'ru')||a.name.localeCompare(b.name,'ru')))
const cols=[
  {key:'name',label:'Магазин',sortable:true},
  {key:'address',label:'Адрес',sortable:true},
  {key:'district',label:'Район',sortable:true},
  {key:'sourceLabel',label:'Проверка'},
]
function draft(shop:PublicStoreLead){
  router.push({path:'/outlets',query:{lead:shop.id}})
}
</script>
<template>
  <PageTitle title="Магазины Астаны" subtitle="Публично указанные адреса существующих магазинов — отдельно от клиентской базы">
    <router-link to="/outlets" class="btn btn-secondary"><AppIcon name="arrow-left" :size="16"/> Клиентские магазины</router-link>
  </PageTitle>
  <div class="public-directory-summary">
    <div><strong>{{publicStoreLeads.length}}</strong><span>Объектов из открытых источников</span></div>
    <div><strong>{{brands.length}}</strong><span>Торговые сети</span></div>
    <div><strong>{{districts.length}}</strong><span>Районов города</span></div>
  </div>
  <div class="public-directory-explainer">
    <AppIcon name="info" :size="20"/>
    <div><strong>Не клиентская база и не результаты выгрузки 2ГИС</strong>
      <p>Это примеры публично указанных магазинов. Здесь нет БИН, договоров, контактов закупщиков, задолженности или фактов сотрудничества с Darmen New Wave. Перед визитом и поставкой адрес нужно уточнить. Ссылки открывают первоисточник и поиск в 2ГИС, но результаты 2ГИС не копируются в приложение.</p>
    </div>
  </div>
  <SectionCard title="Открытый справочник магазинов" description="Название, адрес, район, первоисточник и переход к карточке для дальнейшего уточнения" :flush="true">
    <div class="table-toolbar public-directory-filters">
      <label class="search-control"><AppIcon name="search" :size="17"/>
        <input v-model="search" aria-label="Поиск реальных магазинов" placeholder="Название, сеть, улица, район..." />
      </label>
      <select v-model="brand" aria-label="Сеть магазина"><option value="">Все сети</option><option v-for="b in brands" :key="b" :value="b">{{b}}</option></select>
      <select v-model="district" aria-label="Район магазина"><option value="">Все районы</option><option v-for="d in districts" :key="d" :value="d">{{d}}</option></select>
      <span class="toolbar-count">Найдено: {{rows.length}}</span>
    </div>
    <UiTable :rows="rows" :columns="cols" :page-size="12">
      <template #cell-name="{row}">
        <div class="public-store-title"><strong>{{row.name}}</strong><small>{{row.category}}</small></div>
      </template>
      <template #cell-address="{row}">
        <div class="public-store-address"><span>{{row.address}}</span>
          <a :href="twoGisSearchUrl(row)" target="_blank" rel="noopener noreferrer">Найти в 2ГИС <AppIcon name="arrow-up-right" :size="13"/></a></div>
      </template>
      <template #cell-sourceLabel="{row}">
        <div class="public-source-actions">
          <a :href="row.sourceUrl" target="_blank" rel="noopener noreferrer">Источник <AppIcon name="arrow-up-right" :size="13"/></a>
          <button v-if="can(store.currentRole,'outlets:edit')" type="button" @click="draft(row)">Заполнить карточку</button>
        </div>
      </template>
    </UiTable>
  </SectionCard>
  <p class="directory-footnote">Данные являются справочными и могут устареть. Преобразование адреса в карточку магазина требует выбора реального контрагента и явного подтверждения. Автоматическое копирование 2ГИС и синхронизация с ним не выполняются.</p>
</template>
