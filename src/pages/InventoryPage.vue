<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppIcon from '@/components/ui/AppIcon.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import MetricCard from '@/components/ui/MetricCard.vue'
import ModalShell from '@/components/ui/ModalShell.vue'
import PageTitle from '@/components/ui/PageTitle.vue'
import SectionCard from '@/components/ui/SectionCard.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import UiTable from '@/components/ui/UiTable.vue'
import { can } from '@/access'
import { useDistributionStore } from '@/stores/distribution'
import { dayOffset, displayDate, money, qty } from '@/utils/domain'
import { expiryLabel, expiryState, sellableQty } from '@/utils/expiry'
import { matchesSearch } from '@/utils/search'

const store=useDistributionStore()
const route=useRoute()
const search=ref(String(route.query.batch??''))
const warehouse=ref(String(route.query.warehouse??'w1'))
watch(()=>route.query.batch,v=>{search.value=String(v??'')})
watch(()=>route.query.warehouse,v=>{warehouse.value=String(v??'w1')})
const category=ref('')
const state=ref('')
const modal=ref(false)
const error=ref('')
const form=reactive({warehouseId:'w1',productId:'p1',batchNumber:'',
  receivedDate:dayOffset(0),expiryDate:dayOffset(120),quantity:10,
  supplier:'',receiptRef:''})
const categories=computed(()=>[...new Set(store.data.products.map(p=>p.category))].sort())
const stockRows=computed(()=>store.data.products.filter(p=>(!category.value||p.category===category.value)&&matchesSearch(search.value,[p.name,p.sku,p.category]))
  .map(product=>{
    const stock=store.data.stocks.find(s=>s.warehouseId===warehouse.value&&s.productId===product.id)
    const lots=store.data.stockBatches.filter(b=>b.warehouseId===warehouse.value&&b.productId===product.id&&b.remainingQty>0)
    const eligible=sellableQty(store.data.stockBatches,product.id,warehouse.value)
    return {...product,onHand:stock?.onHand??0,reserved:stock?.reserved??0,
      sellable:eligible,available:Math.max(0,eligible-(stock?.reserved??0)),
      critical:lots.filter(l=>expiryState(l.expiryDate)!=='ok').reduce((sum,l)=>sum+l.remainingQty,0),
      nearestExpiry:[...lots].sort((a,b)=>a.expiryDate.localeCompare(b.expiryDate))[0]?.expiryDate||'',
    }
  }))
const lots=computed(()=>store.data.stockBatches.filter(l=>l.warehouseId===warehouse.value&&l.remainingQty>0)
  .filter(l=>{
    const p=store.data.products.find(p=>p.id===l.productId)
    return (!category.value||p?.category===category.value) && matchesSearch(search.value,[p?.name,p?.sku,l.batchNumber,l.supplier,l.receiptRef]) &&
      (!state.value||expiryState(l.expiryDate)===state.value)
  }).map(l=>({...l,name:store.data.products.find(p=>p.id===l.productId)?.name||l.productId,expiryStatus:expiryState(l.expiryDate)}))
  .sort((a,b)=>a.expiryDate.localeCompare(b.expiryDate)))
const allLots=computed(()=>store.data.stockBatches.filter(b=>b.warehouseId===warehouse.value&&b.remainingQty>0))
const urgent=computed(()=>allLots.value.filter(b=>expiryState(b.expiryDate)==='urgent'))
const expired=computed(()=>allLots.value.filter(b=>expiryState(b.expiryDate)==='expired'))
const amount=computed(()=>allLots.value.reduce((sum,b)=>sum+b.remainingQty,0))
const columns=[
  {key:'sku',label:'Артикул'}, {key:'name',label:'Товар'}, {key:'onHand',label:'На складе'},
  {key:'reserved',label:'Резерв'}, {key:'available',label:'К отгрузке'},
  {key:'nearestExpiry',label:'Ближайший срок'},
]
const lotCols=[
  {key:'batchNumber',label:'Партия'}, {key:'name',label:'Товар'}, {key:'receivedDate',label:'Приход'},
  {key:'initialQty',label:'Поступило'}, {key:'remainingQty',label:'Остаток'},
  {key:'expiryDate',label:'Годен до'},{key:'supplier',label:'Поставщик'},{key:'expiryStatus',label:'Контроль'},
]
function openReceipt(){form.warehouseId=warehouse.value;error.value='';modal.value=true}
function save(){
  error.value=''
  try {store.receiveBatch({...form});modal.value=false;store.notify('Поступление партии записано в журнал.')
    form.batchNumber='';form.receiptRef=''}
  catch(e){error.value=e instanceof Error?e.message:'Ошибка поступления.'}
}
</script>
<template>
  <PageTitle title="Склад и сроки годности" subtitle="Приход по партиям, сроки, доступный остаток и очередность отгрузки">
    <button v-if="can(store.currentRole,'inventory:edit')" type="button" class="btn btn-primary" @click="openReceipt"><AppIcon name="package-plus" :size="17" /> Оформить поступление</button>
  </PageTitle>
  <div class="metrics-grid">
    <MetricCard label="Всего на складе" :value="qty(amount)" hint="Все партии выбранного склада" />
    <MetricCard label="Истекает в течение 30 дней" :value="String(urgent.length)" hint="Партий, требующих внимания" />
    <MetricCard label="С истёкшим сроком" :value="String(expired.length)" hint="Не включаются в отгрузку" />
    <MetricCard label="Зарезервировано" :value="qty(stockRows.reduce((sum,row)=>sum+row.reserved,0))" hint="Под подтверждённые заявки" />
  </div>
  <div class="stack-lg">
    <SectionCard title="Остатки по товарам" description="Доступно к отгрузке = непросроченные партии минус резерв" :flush="true">
      <div class="table-toolbar">
        <label class="search-control"><AppIcon name="search" :size="16" /><input v-model="search" aria-label="Поиск номенклатуры и партий" placeholder="Товар, артикул, партия..." /></label>
        <select v-model="warehouse" aria-label="Склад"><option v-for="w in store.data.warehouses" :key="w.id" :value="w.id">{{w.name}}</option></select>
        <select v-model="category" aria-label="Категория"><option value="">Все категории</option><option v-for="c in categories" :key="c" :value="c">{{c}}</option></select>
      </div>
      <UiTable :rows="stockRows" :columns="columns" :page-size="12">
        <template #cell-sku="{row}"><span class="mono">{{row.sku}}</span></template>
        <template #cell-name="{row}"><strong>{{row.name}}</strong><small class="table-subtitle">{{money(row.price)}} / {{row.unit}}</small></template>
        <template #cell-available="{row}"><strong :class="{'text-danger':row.available===0}">{{row.available}} {{row.unit}}</strong></template>
        <template #cell-nearestExpiry="{row}"><span :class="{'text-danger':row.critical>0}">{{row.nearestExpiry?displayDate(row.nearestExpiry):'—'}}</span></template>
      </UiTable>
    </SectionCard>
    <SectionCard title="Реестр партий" description="Когда поступило, сколько поступило и сколько осталось" :flush="true">
      <div class="table-toolbar">
        <select v-model="state" aria-label="Фильтр срока"><option value="">Все сроки</option><option value="expired">Просрочен</option><option value="urgent">До 30 дней</option><option value="soon">До 90 дней</option><option value="ok">В норме</option></select>
        <span class="toolbar-count">Партий: {{lots.length}}</span>
      </div>
      <UiTable :rows="lots" :columns="lotCols" :page-size="15">
        <template #cell-receivedDate="{row}">{{displayDate(row.receivedDate)}}</template>
        <template #cell-expiryDate="{row}">{{displayDate(row.expiryDate)}}</template>
        <template #cell-expiryStatus="{row}"><StatusBadge :status="row.expiryStatus==='expired'?'failed':row.expiryStatus==='urgent'?'partial':'active'" :label="expiryLabel(row.expiryDate)" /></template>
        <template #cell-batchNumber="{row}"><strong>{{row.batchNumber}}</strong><small class="table-subtitle">{{row.receiptRef||'Приход без номера'}}</small></template>
      </UiTable>
      <EmptyState v-if="!lots.length" title="Нет партий по заданным условиям" />
    </SectionCard>
    <div class="inline-notice">Остатки и сроки — тестовые данные браузера. Для промышленного учёта потребуются документы приёмки, партии 1С, инвентаризации и запрет отгрузки просроченного товара на backend.</div>
  </div>
  <ModalShell :open="modal" title="Приход товара" subtitle="Фиксация партии, даты поступления и срока годности" size="lg" @close="modal=false">
    <form class="stack-lg" @submit.prevent="save">
      <div class="form-grid">
        <label class="field"><span>Склад *</span><select v-model="form.warehouseId" required><option v-for="w in store.data.warehouses" :key="w.id" :value="w.id">{{w.name}}</option></select></label>
        <label class="field"><span>Товар *</span><select v-model="form.productId" required><option v-for="p in store.data.products.filter(p=>p.active)" :key="p.id" :value="p.id">{{p.name}}</option></select></label>
        <label class="field"><span>Номер партии *</span><input v-model="form.batchNumber" required placeholder="Например, BN-2026-1024" /></label>
        <label class="field"><span>Количество *</span><input v-model.number="form.quantity" type="number" min="1" step="1" required /></label>
        <label class="field"><span>Дата поступления *</span><input v-model="form.receivedDate" type="date" required :max="dayOffset(0)" /></label>
        <label class="field"><span>Годен до *</span><input v-model="form.expiryDate" type="date" required /></label>
        <label class="field"><span>Поставщик</span><input v-model="form.supplier" placeholder="Наименование поставщика" /></label>
        <label class="field"><span>Документ прихода</span><input v-model="form.receiptRef" placeholder="Номер приходной накладной" /></label>
      </div>
      <div v-if="error" role="alert" class="form-error">{{error}}</div>
      <div class="form-footer"><button type="button" class="btn btn-secondary" @click="modal=false">Отмена</button><button type="submit" class="btn btn-primary">Сохранить поступление</button></div>
    </form>
  </ModalShell>
</template>
