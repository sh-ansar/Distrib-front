<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import EmptyState from '@/components/ui/EmptyState.vue'
import ModalShell from '@/components/ui/ModalShell.vue'
import PageTitle from '@/components/ui/PageTitle.vue'
import SectionCard from '@/components/ui/SectionCard.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import UiTable from '@/components/ui/UiTable.vue'
import { can } from '@/access'
import { useDistributionStore } from '@/stores/distribution'
import { dayOffset, displayDate, qty } from '@/utils/domain'
import { expiryLabel, expiryState, outletLastChecks } from '@/utils/expiry'
import { matchesSearch } from '@/utils/search'

const store=useDistributionStore()
const route=useRoute()
const router=useRouter()
const search=ref('')
const selectedId=ref(String(route.query.outlet||''))
const modal=ref(false)
const error=ref('')
const filter=ref('')
const form=reactive({outletId:'',productId:'p1',batchNumber:'',expiryDate:dayOffset(90),quantity:0,notes:''})
const outlets=computed(()=>store.visibleOutlets.filter(o=>matchesSearch(search.value,[o.name,o.address,store.data.customers.find(c=>c.id===o.customerId)?.legalName])))
const selected=computed(()=>store.visibleOutlets.find(o=>o.id===selectedId.value))
const shipments=computed(()=>store.data.outletShipments.filter(x=>x.outletId===selectedId.value)
  .map(x=>({...x,productName:store.data.products.find(p=>p.id===x.productId)?.name||x.productId}))
  .sort((a,b)=>b.deliveredAt.localeCompare(a.deliveredAt)))
const checkRows=computed(()=>outletLastChecks(store.data.outletStockChecks,selectedId.value).map(c=>({
  ...c,productName:store.data.products.find(p=>p.id===c.productId)?.name||c.productId,
  status:expiryState(c.expiryDate),
})).filter(c=>(!filter.value||c.status===filter.value)&&matchesSearch(search.value,[c.productName,c.batchNumber])))
const urgent=computed(()=>checkRows.value.filter(c=>c.status==='expired'||c.status==='urgent'))
const shipmentCols=[
  {key:'deliveredAt',label:'Отгружено'}, {key:'productName',label:'Товар'},
  {key:'batchNumber',label:'Партия'}, {key:'quantity',label:'Количество'},
  {key:'expiryDate',label:'Срок годности'}, {key:'orderId',label:'Заявка'},
]
const checkCols=[
  {key:'checkedAt',label:'Проверено'}, {key:'productName',label:'Товар'}, {key:'batchNumber',label:'Партия'},
  {key:'quantity',label:'На полке'}, {key:'expiryDate',label:'Годен до'}, {key:'status',label:'Статус'},
]
watch(()=>route.query.outlet,id=>{selectedId.value=String(id??'')})
watch(selectedId,id=>{form.outletId=id;router.replace({path:'/store-stock',query:id?{outlet:id}:{}})})
function open(){
  if(!selected.value)return
  form.outletId=selected.value!.id
  form.productId='p1';form.batchNumber='';form.quantity=0;form.notes='';error.value='';modal.value=true
}
function save(){
  error.value=''
  try{store.recordOutletCheck({...form});modal.value=false;store.notify('Сверка остатков магазина сохранена.')}
  catch(e){error.value=e instanceof Error?e.message:'Ошибка сверки'}
}
function who(id:string){return store.data.employees.find(e=>e.id===id)?.name||'Сотрудник'}
</script>
<template>
  <PageTitle title="Товар у клиентов" subtitle="Поставки по партиям и фактически сверенные остатки в магазинах">
    <button v-if="selected&&can(store.currentRole,'visits:edit')" class="btn btn-primary" @click="open">Проверить остаток магазина</button>
  </PageTitle>
  <div class="outlet-stock-layout">
    <SectionCard title="Выбор торговой точки" description="Найдите магазин или юридическое лицо">
      <label class="field"><span>Поиск магазинов</span><input v-model="search" placeholder="Компания, магазин, адрес..." /></label>
      <label class="field"><span>Торговая точка</span>
        <select v-model="selectedId"><option value="">Выберите магазин</option>
          <option v-for="o in outlets" :key="o.id" :value="o.id">{{o.name}} · {{o.district}}</option>
        </select>
      </label>
      <div v-if="selected" class="store-stock-selected">
        <strong>{{selected.name}}</strong>
        <span>{{selected.address}}</span>
        <span>{{store.data.customers.find(c=>c.id===selected.customerId)?.legalName}}</span>
        <router-link class="text-link" :to="'/outlets/'+(selected?.id||'')">Карточка магазина →</router-link>
      </div>
      <div v-else class="muted small">Выберите точку, чтобы посмотреть историю отгрузок и результаты пересчёта.</div>
    </SectionCard>
    <div class="stack-lg">
      <template v-if="selected">
        <div class="stock-monitor-stats">
          <div><strong>{{shipments.length}}</strong><span>Записей об отгрузках</span></div>
          <div><strong>{{checkRows.length}}</strong><span>Сверено партий</span></div>
          <div><strong>{{urgent.length}}</strong><span>Требуют проверки срока</span></div>
        </div>
        <SectionCard title="Подтверждённые остатки" description="Последний ручной пересчёт по каждой партии, не расчёт по отгрузкам" :flush="true">
          <div class="table-toolbar"><select v-model="filter" aria-label="Статус срока годности">
            <option value="">Все сроки</option><option value="expired">Просрочен</option><option value="urgent">До 30 дней</option><option value="soon">До 90 дней</option><option value="ok">В норме</option>
          </select></div>
          <UiTable :rows="checkRows" :columns="checkCols" :page-size="12">
            <template #cell-checkedAt="{row}"><span>{{displayDate(row.checkedAt)}}</span><small class="table-subtitle">{{who(row.checkedBy)}}</small></template>
            <template #cell-expiryDate="{row}">{{displayDate(row.expiryDate)}}</template>
            <template #cell-status="{row}"><StatusBadge :status="row.status==='expired'?'failed':row.status==='urgent'?'partial':'active'" :label="expiryLabel(row.expiryDate)" /></template>
          </UiTable>
          <EmptyState v-if="!checkRows.length" title="Не было сверки полок" description="Торговый представитель может внести фактический остаток и срок партии." />
        </SectionCard>
        <SectionCard title="История отгрузок" description="Сколько, когда и какой партией передали в торговую точку" :flush="true">
          <UiTable :rows="shipments" :columns="shipmentCols" :page-size="12">
            <template #cell-deliveredAt="{row}">{{displayDate(row.deliveredAt)}}</template>
            <template #cell-expiryDate="{row}">{{displayDate(row.expiryDate)}}</template>
            <template #cell-quantity="{row}"><strong>{{qty(row.quantity)}}</strong></template>
            <template #cell-orderId="{row}">{{store.data.orders.find(o=>o.id===row.orderId)?.number||'—'}}</template>
          </UiTable>
          <EmptyState v-if="!shipments.length" title="Отгрузок пока нет" />
        </SectionCard>
        <p class="directory-footnote">Важно: «отгружено» не равно «есть сейчас». Продажи, списания и возвраты у магазина не могут быть рассчитаны без сверки.</p>
      </template>
      <SectionCard v-else title="Состояние товара у клиентов"><EmptyState title="Выберите магазин" description="История поступлений и результаты сверок появятся здесь." /></SectionCard>
    </div>
  </div>
  <ModalShell :open="modal" title="Проверка товарного остатка" subtitle="Фактический пересчёт партии на полке" size="lg" @close="modal=false">
    <form class="stack-lg" @submit.prevent="save">
      <div class="form-grid">
        <label class="field field-wide"><span>Магазин</span><input :value="selected?.name" disabled /></label>
        <label class="field field-wide"><span>Товар *</span><select v-model="form.productId"><option v-for="p in store.data.products" :key="p.id" :value="p.id">{{p.name}}</option></select></label>
        <label class="field"><span>Партия *</span><input v-model="form.batchNumber" placeholder="Номер на упаковке" required /></label>
        <label class="field"><span>Годен до *</span><input v-model="form.expiryDate" type="date" required /></label>
        <label class="field"><span>Количество *</span><input v-model.number="form.quantity" type="number" min="0" step="1" required /></label>
        <label class="field field-wide"><span>Примечание</span><textarea v-model="form.notes" rows="2" placeholder="Что нашли на полке, возврат, выкладка..." /></label>
      </div>
      <div v-if="error" class="form-error" role="alert">{{error}}</div>
      <div class="form-footer"><button type="button" class="btn btn-secondary" @click="modal=false">Отмена</button><button class="btn btn-primary" type="submit">Сохранить пересчёт</button></div>
    </form>
  </ModalShell>
</template>
