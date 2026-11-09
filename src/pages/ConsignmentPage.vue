<script setup lang="ts">
import { computed, ref } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import MetricCard from '@/components/ui/MetricCard.vue'
import ModalShell from '@/components/ui/ModalShell.vue'
import PageTitle from '@/components/ui/PageTitle.vue'
import SectionCard from '@/components/ui/SectionCard.vue'
import UiTable from '@/components/ui/UiTable.vue'
import { can } from '@/access'
import { useDistributionStore } from '@/stores/distribution'
import { consignmentBalance, consignmentValue, money } from '@/utils/domain'
const store=useDistributionStore()
const search=ref('')
const selectedId=ref('')
const sold=ref(0)
const returned=ref(0)
const error=ref('')
const selected=computed(()=>store.data.consignments.find(c=>c.id===selectedId.value))
const records=computed(()=>store.data.consignments.filter(c=>store.visibleOutlets.some(o=>o.id===c.outletId)))
const rows=computed(()=>records.value.filter(c=>{
  const outlet=store.data.outlets.find(o=>o.id===c.outletId)
  const customer=store.data.customers.find(x=>x.id===c.customerId)
  const product=store.data.products.find(p=>p.id===c.productId)
  return [outlet?.name,customer?.legalName,product?.name].join(' ').toLowerCase().includes(search.value.toLowerCase())
}).map(c=>({...c,outlet:store.data.outlets.find(o=>o.id===c.outletId)?.name||'—',
  product:store.data.products.find(p=>p.id===c.productId)?.name||'—',
  balance:consignmentBalance(c),value:consignmentValue(c)})))
const totalQty=computed(()=>records.value.reduce((s,c)=>s+consignmentBalance(c),0))
const totalValue=computed(()=>records.value.reduce((s,c)=>s+consignmentValue(c),0))
const columns=[
  {key:'outlet',label:'Магазин',sortable:true},{key:'product',label:'Товар',sortable:true},
  {key:'sent',label:'Передано',align:'right' as const},{key:'sold',label:'Продано',align:'right' as const},
  {key:'returned',label:'Возврат',align:'right' as const},{key:'balance',label:'Остаток',align:'right' as const},
  {key:'value',label:'На сумму',align:'right' as const},{key:'action',label:'Сверка'},
]
function open(id:string){selectedId.value=id;sold.value=0;returned.value=0;error.value=''}
function reconcile(){
  error.value=''
  try{if(selected.value){store.reconcileConsignment(selected.value.id,Number(sold.value),Number(returned.value));store.notify('Демо-сверка выполнена.');selectedId.value=''}}
  catch(e){error.value=e instanceof Error?e.message:'Ошибка сверки'}
}
</script>
<template>
  <PageTitle eyebrow="ОСОБЫЕ УСЛОВИЯ" title="Товар под реализацию" subtitle="Контроль товара, переданного торговым точкам с последующей сверкой" />
  <div class="metrics-grid metrics-grid-three">
    <MetricCard label="Остаток у магазинов" :value="String(totalQty)+' ед.'" icon="package" hint="По неподтверждённым остаткам" />
    <MetricCard label="Учётная стоимость остатка" :value="money(totalValue)" icon="wallet" hint="По демо-ценам передачи" />
    <MetricCard label="Открытые передачи" :value="String(records.filter(c=>consignmentBalance(c)>0).length)" icon="clipboard-list" hint="Требуют сверки" />
  </div>
  <SectionCard title="Реестр передач" description="Остаток = передано − продано − возвращено. Не подменяет бухгалтерский учёт 1С." :flush="true">
    <div class="table-toolbar"><label class="search-control"><AppIcon name="search" :size="18" /><input v-model="search" aria-label="Поиск передач" placeholder="Магазин, контрагент или товар" /></label><span class="toolbar-count">{{rows.length}} записей</span></div>
    <UiTable :rows="rows" :columns="columns" :page-size="12">
      <template #cell-outlet="{row}"><router-link class="text-link" :to="'/outlets/'+row.outletId">{{row.outlet}}</router-link></template>
      <template #cell-balance="{row}"><strong>{{row.balance}}</strong></template>
      <template #cell-value="{row}"><strong>{{money(row.value)}}</strong></template>
      <template #cell-action="{row}"><button v-if="can(store.currentRole,'consignment:edit')&&row.balance>0" type="button" class="btn btn-secondary btn-sm" @click="open(row.id)">Сверить</button><span v-else class="muted">—</span></template>
    </UiTable>
  </SectionCard>
  <div class="inline-notice"><AppIcon name="info" :size="18" /> Консигнация и обычная отсрочка платежа учитываются отдельно. Здесь нельзя автоматически считать передачу оплаченной или проданной без отчёта клиента.</div>
  <ModalShell :open="!!selected" title="Сверка реализации" subtitle="Демо-запись о проданном и возвращённом товаре" @close="selectedId=''">
    <form v-if="selected" class="stack-lg" @submit.prevent="reconcile">
      <div class="money-summary"><span>{{store.data.products.find(p=>p.id===selected?.productId)?.name}}</span><strong>На остатке {{consignmentBalance(selected)}}</strong></div>
      <div class="form-grid"><label class="field"><span>Продано с прошлой сверки</span><input v-model.number="sold" type="number" min="0" step="1" required /></label><label class="field"><span>Возвращено</span><input v-model.number="returned" type="number" min="0" step="1" required /></label></div>
      <div v-if="error" class="form-error">{{error}}</div><div class="form-footer"><button type="button" class="btn btn-secondary" @click="selectedId=''">Отмена</button><button type="submit" class="btn btn-primary">Провести сверку (демо)</button></div>
    </form>
  </ModalShell>
</template>
