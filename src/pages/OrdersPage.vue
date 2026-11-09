<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppIcon from '@/components/ui/AppIcon.vue'
import ModalShell from '@/components/ui/ModalShell.vue'
import OrderForm from '@/components/ui/OrderForm.vue'
import PageTitle from '@/components/ui/PageTitle.vue'
import SectionCard from '@/components/ui/SectionCard.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import UiTable from '@/components/ui/UiTable.vue'
import { can } from '@/access'
import { useDistributionStore } from '@/stores/distribution'
import { canTransitionOrder, displayDate, money, orderTotal, statuses } from '@/utils/domain'
import type { OrderStatus } from '@/types/domain'

const store=useDistributionStore()
const route=useRoute()
const search=ref(String(route.query.q??''))
const statusFilter=ref('')
const showForm=ref(false)
const selectedId=ref('')
const actionError=ref('')
const selected=computed(()=>store.visibleOrders.find(o=>o.id===selectedId.value))
watch(()=>route.query.q,value=>search.value=String(value??''))
const rows=computed(()=>store.visibleOrders.filter(o=>{
  const outlet=store.data.outlets.find(x=>x.id===o.outletId)
  const customer=store.data.customers.find(x=>x.id===o.customerId)
  return (!statusFilter.value||o.status===statusFilter.value) &&
    [o.number,outlet?.name,customer?.legalName].join(' ').toLowerCase().includes(search.value.toLowerCase())
}).map(o=>({...o,storeName:store.data.outlets.find(x=>x.id===o.outletId)?.name||'—',
  customerName:store.data.customers.find(x=>x.id===o.customerId)?.legalName||'—',
  total:orderTotal(o),itemCount:o.items.reduce((s,i)=>s+i.quantity,0)})).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)))
const columns=[
  {key:'number',label:'Номер',sortable:true},
  {key:'storeName',label:'Торговая точка',sortable:true},
  {key:'createdAt',label:'Создана',sortable:true},
  {key:'deliveryDate',label:'Доставка',sortable:true},
  {key:'itemCount',label:'Количество',align:'right' as const},
  {key:'total',label:'Сумма',align:'right' as const,sortable:true},
  {key:'status',label:'Статус'},
]
const nextStatuses=computed(()=>selected.value ? (['confirmed','picking','ready','cancelled'] as OrderStatus[])
  .filter(to=>canTransitionOrder(selected.value!.status,to)) : [])
function transition(status:OrderStatus){
  actionError.value=''
  try{if(selected.value){store.setOrderStatus(selected.value.id,status);store.notify('Заявка обновлена.')}}catch(e){actionError.value=e instanceof Error?e.message:'Не удалось изменить статус.'}
}
</script>
<template>
  <PageTitle eyebrow="ПРОДАЖИ И ЗАКАЗЫ" title="Заявки" subtitle="Сбор заказов, сборка и контроль исполнения">
    <button v-if="can(store.currentRole,'orders:edit')" type="button" class="btn btn-primary" @click="showForm=true"><AppIcon name="plus" :size="18" /> Новая заявка</button>
  </PageTitle>
  <div class="mini-stats">
    <div><strong>{{store.visibleOrders.length}}</strong><span>Всего заявок</span></div>
    <div><strong>{{store.visibleOrders.filter(o=>o.status==='new').length}}</strong><span>Новые</span></div>
    <div><strong>{{store.visibleOrders.filter(o=>['confirmed','picking','ready'].includes(o.status)).length}}</strong><span>В обработке</span></div>
    <div><strong>{{store.visibleOrders.filter(o=>o.status==='in_route').length}}</strong><span>В доставке</span></div>
  </div>
  <SectionCard title="Журнал заявок" description="Каждая заявка связана с магазином и контрагентом" :flush="true">
    <div class="table-toolbar"><label class="search-control"><AppIcon name="search" :size="17" /><input v-model="search" placeholder="Поиск заявки или магазина" aria-label="Поиск заявок" /></label>
      <select v-model="statusFilter" aria-label="Фильтр по статусу"><option value="">Все статусы</option><option v-for="(label,status) in statuses" :key="status" :value="status">{{label}}</option></select><span class="toolbar-count">Найдено: {{rows.length}}</span>
    </div>
    <UiTable :rows="rows" :columns="columns" :page-size="12" clickable @row-click="row=>selectedId=String(row.id)">
      <template #cell-number="{row}"><strong class="link-colored">{{row.number}}</strong><small class="table-subtitle">{{row.customerName}}</small></template>
      <template #cell-storeName="{row}"><strong>{{row.storeName}}</strong></template>
      <template #cell-createdAt="{row}">{{displayDate(row.createdAt)}}</template>
      <template #cell-deliveryDate="{row}">{{displayDate(row.deliveryDate)}}</template>
      <template #cell-total="{row}"><strong>{{money(row.total)}}</strong></template>
      <template #cell-status="{row}"><StatusBadge :status="row.status" /></template>
    </UiTable>
  </SectionCard>
  <ModalShell :open="showForm" title="Новая заявка" subtitle="Выберите магазин, товары и дату доставки" size="lg" @close="showForm=false"><OrderForm @created="showForm=false" @cancel="showForm=false" /></ModalShell>
  <ModalShell :open="!!selected" :title="'Заявка '+(selected?.number||'')" subtitle="Детали заказа и движение по статусам" size="lg" @close="selectedId='';actionError=''">
    <template v-if="selected">
      <div class="order-detail-head"><div><span class="muted small">Магазин</span><h3>{{store.data.outlets.find(o=>o.id===selected?.outletId)?.name}}</h3><router-link class="text-link" :to="'/outlets/'+selected.outletId" @click="selectedId=''">Открыть карточку <AppIcon name="arrow-right" :size="14" /></router-link></div><StatusBadge :status="selected.status" /></div>
      <div class="form-grid summary-fields"><div><span>Дата создания</span><strong>{{displayDate(selected.createdAt)}}</strong></div><div><span>Доставка</span><strong>{{displayDate(selected.deliveryDate)}}</strong></div><div><span>Источник</span><strong>{{selected.origin==='sales'?'Торговый представитель':'Интеграция'}}</strong></div><div><span>Позиций</span><strong>{{selected.items.length}}</strong></div></div>
      <div class="order-lines"><div v-for="item in selected.items" :key="item.productId" class="order-line"><div><strong>{{store.data.products.find(p=>p.id===item.productId)?.name}}</strong><small>{{item.quantity}} × {{money(item.price)}}</small></div><strong>{{money(item.price*item.quantity)}}</strong></div><div class="order-line total"><span>Итого</span><strong>{{money(orderTotal(selected))}}</strong></div></div>
      <div v-if="selected.notes" class="inline-notice">{{selected.notes}}</div>
      <div v-if="actionError" class="form-error" role="alert">{{actionError}}</div>
      <div v-if="nextStatuses.length && can(store.currentRole,'orders:edit')" class="status-actions"><span class="muted small">Следующий этап:</span><button v-for="status in nextStatuses" :key="status" type="button" class="btn" :class="status==='cancelled'?'btn-outline-danger':'btn-secondary'" @click="transition(status)">{{statuses[status]}}</button></div>
      <div v-if="selected.status==='ready'" class="inline-notice"><AppIcon name="truck" :size="18" /> Готовую заявку можно назначить в рейс через раздел «Рейсы и доставка».</div>
    </template>
  </ModalShell>
</template>
