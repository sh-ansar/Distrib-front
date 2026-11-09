<script setup lang="ts">
import { computed, ref } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import MetricCard from '@/components/ui/MetricCard.vue'
import PageTitle from '@/components/ui/PageTitle.vue'
import SectionCard from '@/components/ui/SectionCard.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import UiTable from '@/components/ui/UiTable.vue'
import { useDistributionStore } from '@/stores/distribution'
import { money } from '@/utils/domain'
const store=useDistributionStore()
const search=ref('')
const category=ref('')
const warehouse=ref('w1')
const categories=computed(()=>[...new Set(store.data.products.map(p=>p.category))].sort())
const rows=computed(()=>store.data.products.filter(p=>
  (!category.value||p.category===category.value)&&[p.sku,p.name,p.category].join(' ').toLowerCase().includes(search.value.toLowerCase())
).map(p=>{
  const stock=store.data.stocks.find(s=>s.warehouseId===warehouse.value&&s.productId===p.id)
  return {...p,onHand:stock?.onHand??0,reserved:stock?.reserved??0,available:Math.max(0,(stock?.onHand??0)-(stock?.reserved??0))}
}))
const totalStocks=computed(()=>rows.value.reduce((s,p)=>s+p.onHand,0))
const totalReserved=computed(()=>rows.value.reduce((s,p)=>s+p.reserved,0))
const lowStocks=computed(()=>rows.value.filter(p=>p.available<30).length)
const columns=[
  {key:'sku',label:'Артикул',sortable:true},{key:'name',label:'Номенклатура',sortable:true},
  {key:'category',label:'Категория',sortable:true},{key:'onHand',label:'На складе',align:'right' as const,sortable:true},
  {key:'reserved',label:'В резерве',align:'right' as const},{key:'available',label:'Доступно',align:'right' as const,sortable:true},
  {key:'status',label:'Наличие'},
]
</script>
<template>
  <PageTitle eyebrow="СКЛАДСКОЙ УЧЁТ" title="Склад и остатки" subtitle="Товары, резервы и доступность для новых заказов" />
  <div class="metrics-grid metrics-grid-three">
    <MetricCard label="Единиц на складе" :value="String(totalStocks)" icon="warehouse" hint="По выбранному складу и фильтрам" />
    <MetricCard label="В резерве" :value="String(totalReserved)" icon="package-check" hint="Зарезервировано под заказы" />
    <MetricCard label="Ниже порога" :value="String(lowStocks)" icon="alert-triangle" :tone="lowStocks?'danger':'neutral'" hint="Доступно менее 30 единиц" />
  </div>
  <SectionCard title="Складские остатки" description="Демо-остатки. При подключении 1С система будет получать данные от учётной базы." :flush="true">
    <div class="table-toolbar"><label class="search-control"><AppIcon name="search" :size="17" /><input v-model="search" aria-label="Поиск товаров" placeholder="Поиск по названию или артикулу" /></label>
      <select v-model="warehouse" aria-label="Выбор склада"><option v-for="w in store.data.warehouses" :key="w.id" :value="w.id">{{w.name}}</option></select>
      <select v-model="category" aria-label="Категория товаров"><option value="">Все категории</option><option v-for="c in categories" :key="c">{{c}}</option></select>
    </div>
    <UiTable :rows="rows" :columns="columns">
      <template #cell-sku="{row}"><span class="mono">{{row.sku}}</span></template>
      <template #cell-name="{row}"><strong>{{row.name}}</strong><small class="table-subtitle">{{money(row.price)}} / {{row.unit}}</small></template>
      <template #cell-available="{row}"><strong :class="{'text-danger':row.available<30}">{{row.available}}</strong></template>
      <template #cell-status="{row}"><StatusBadge :status="row.available<30?'failed':'delivered'" :label="row.available<30?'Мало':'В наличии'" /></template>
    </UiTable>
  </SectionCard>
  <div class="inline-notice warn-notice"><AppIcon name="database" :size="18" /> В реальной версии 1С остаётся главным источником остатков, цен и себестоимости. Резерв и отгрузка требуют согласованной двусторонней синхронизации; браузерные изменения ничего не проводят в 1С.</div>
</template>
