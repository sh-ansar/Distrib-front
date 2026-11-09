<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '@/components/ui/AppIcon.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ModalShell from '@/components/ui/ModalShell.vue'
import PageTitle from '@/components/ui/PageTitle.vue'
import SectionCard from '@/components/ui/SectionCard.vue'
import { can } from '@/access'
import { useDistributionStore } from '@/stores/distribution'
import { displayDate } from '@/utils/domain'
import type { ReconciliationLine } from '@/types/domain'

const store=useDistributionStore()
const route=useRoute()
const router=useRouter()
const search=ref('')
const status=ref<'all'|'not-filed'|'submitted'|'confirmed'>('all')
const modalStopId=ref('')
const error=ref('')
const notes=ref('')
const draft=reactive<{lines:ReconciliationLine[]}>({lines:[]})
const stops=computed(()=>store.visibleRoutes.flatMap(r=>r.stops
  .filter(s=>s.status==='partial'||s.status==='failed')
  .map(s=>{
    const record=store.data.returnReconciliations.find(x=>x.stopId===s.id)
    const outlet=store.data.outlets.find(o=>o.id===s.outletId)
    const employee=store.data.employees.find(e=>e.id===r.driverId)
    return {stop:s,route:r,record,outlet,employee,
      missing:record?.lines.reduce((sum,line)=>sum+line.missingQty,0)||0,
      total:record?.lines.reduce((sum,line)=>sum+line.orderedQty,0)||0}
  })))
const visible=computed(()=>stops.value.filter(x=>
  (!route.query.stop||route.query.stop===x.stop.id)&&
  (status.value==='all'||status.value===(x.record?.status||'not-filed'))&&
  [x.route.number,x.outlet?.name,x.outlet?.address,x.employee?.name,x.stop.notes]
    .join(' ').toLowerCase().includes(search.value.trim().toLowerCase())
))
const counts=computed(()=>({
  notFiled:stops.value.filter(x=>!x.record).length,
  submitted:stops.value.filter(x=>x.record?.status==='submitted').length,
  confirmed:stops.value.filter(x=>x.record?.status==='confirmed').length,
  shortages:stops.value.filter(x=>x.record?.status==='confirmed'&&x.missing>0).length,
}))
const active=computed(()=>stops.value.find(x=>x.stop.id===modalStopId.value))
const canSubmit=computed(()=>can(store.currentRole,'routes:edit'))
const canConfirm=computed(()=>can(store.currentRole,'inventory:edit'))
function product(id:string){return store.data.products.find(p=>p.id===id)?.name||id}
function expected(stopId:string){
  const current=stops.value.find(x=>x.stop.id===stopId)
  if(!current)return []
  const byProduct=new Map<string,number>()
  for(const id of current.stop.orderIds){
    const order=store.data.orders.find(o=>o.id===id)
    if(!order)continue
    for(const item of order.items)byProduct.set(item.productId,(byProduct.get(item.productId)||0)+item.quantity)
  }
  return [...byProduct].map(([productId,orderedQty]):ReconciliationLine=>({
    productId,orderedQty,acceptedQty:0,returnedQty:orderedQty,missingQty:0,
  }))
}
function unaccounted(line:ReconciliationLine){
  return line.orderedQty-Number(line.acceptedQty||0)-Number(line.returnedQty||0)
}
function open(id:string){
  const item=stops.value.find(x=>x.stop.id===id)
  if(!item||item.record?.status==='confirmed')return
  modalStopId.value=id
  error.value=''
  notes.value=item.record?.notes||''
  draft.lines=(item.record?.lines||expected(id)).map(x=>({...x}))
}
function save(){
  if(!active.value)return
  error.value=''
  try{
    store.submitStopReconciliation(active.value.route.id,active.value.stop.id,
      draft.lines.map(line=>({
        ...line,missingQty:unaccounted(line),
      })),notes.value)
    modalStopId.value=''
    store.notify('Сверка направлена на подтверждение склада.')
  }catch(e){error.value=e instanceof Error?e.message:'Не удалось сохранить сверку.'}
}
function approve(id:string){
  try{
    const rec=store.confirmStopReconciliation(id)
    store.notify(rec.lines.some(line=>line.missingQty>0)?
      'Склад подтвердил сверку. Недостача остаётся зарезервированной до расследования.':
      'Склад подтвердил возврат и приёмку. Резервы пересчитаны.')
  }catch(e){store.notify(e instanceof Error?e.message:'Не удалось подтвердить.','error')}
}
function clearStop(){router.replace({path:'/returns'})}
watch(()=>route.query.stop,()=>{status.value='all'})
</script>
<template>
  <PageTitle title="Возвраты и расхождения" subtitle="Сверка частичных доставок и отказов: экипаж сообщает количества, склад подтверждает учёт" />
  <div class="returns-metrics">
    <div><AppIcon name="clipboard-list" :size="19"/><strong>{{counts.notFiled}}</strong><span>Нет отчёта экипажа</span></div>
    <div><AppIcon name="clock-3" :size="19"/><strong>{{counts.submitted}}</strong><span>Ожидают склад</span></div>
    <div><AppIcon name="check-circle-2" :size="19"/><strong>{{counts.confirmed}}</strong><span>Подтверждено</span></div>
    <div><AppIcon name="alert-triangle" :size="19"/><strong>{{counts.shortages}}</strong><span>Есть недостача</span></div>
  </div>
  <SectionCard title="Сверки по остановкам" description="Не меняйте складские остатки по одному сообщению водителя — требуется подтверждение кладовщика">
    <div v-if="route.query.stop" class="returns-focused"><span>Открыта сверка конкретной остановки</span><button type="button" @click="clearStop">Показать все</button></div>
    <div class="returns-filters">
      <label class="field"><span>Поиск</span><input v-model="search" placeholder="Магазин, рейс, сотрудник..." /></label>
      <label class="field"><span>Состояние</span>
        <select v-model="status" aria-label="Состояние сверки">
          <option value="all">Все</option><option value="not-filed">Без отчёта</option>
          <option value="submitted">На подтверждении</option><option value="confirmed">Подтверждены</option>
        </select>
      </label>
    </div>
    <div class="returns-list">
      <article v-for="item in visible" :key="item.stop.id" class="returns-item">
        <div class="returns-item-top">
          <div><span class="returns-number">{{item.route.number}} · {{displayDate(item.route.date)}}</span>
            <h3>{{item.outlet?.name||'Торговая точка'}}</h3><p>{{item.outlet?.address||'—'}}</p></div>
          <span class="returns-status" :class="'returns-'+(item.record?.status||'none')">
            {{item.record?.status==='confirmed'?'Подтверждено':item.record?.status==='submitted'?'На складе':'Нет отчёта'}}
          </span>
        </div>
        <div class="returns-item-facts">
          <span>Итог: {{item.stop.status==='failed'?'Отказ':'Частичная доставка'}}</span>
          <span>Экипаж: {{item.employee?.name||'—'}}</span>
          <span v-if="item.record">Позиции: {{item.record.lines.length}}</span>
          <span v-if="item.missing>0">Недостача: {{item.missing}} ед.</span>
        </div>
        <p v-if="item.stop.notes" class="returns-notes">{{item.stop.notes}}</p>
        <div v-if="item.record" class="returns-lines">
          <div v-for="line in item.record.lines" :key="line.productId">
            <strong>{{product(line.productId)}}</strong>
            <span>Заявлено: {{line.orderedQty}} · Принято: {{line.acceptedQty}} · Возврат: {{line.returnedQty}} · Недостача: {{line.missingQty}}</span>
          </div>
        </div>
        <div class="returns-actions">
          <button v-if="canSubmit&&item.record?.status!=='confirmed'" type="button" class="btn btn-secondary" @click="open(item.stop.id)">
            <AppIcon name="pencil" :size="16" /> {{item.record?'Исправить отчёт':'Составить отчёт'}}
          </button>
          <button v-if="canConfirm&&item.record?.status==='submitted'" type="button" class="btn btn-primary" @click="approve(item.record!.id)">
            <AppIcon name="check" :size="16"/> Подтвердить складом
          </button>
          <router-link class="btn btn-secondary" :to="'/routes/'+item.route.id">Рейс <AppIcon name="chevron-right" :size="16"/></router-link>
          <router-link v-if="can(store.currentRole,'documents')" class="btn btn-secondary"
            :to="'/documents?stop='+item.stop.id"><AppIcon name="file-image" :size="16"/> Накладная</router-link>
        </div>
        <p v-if="item.record?.status==='confirmed'&&item.missing>0" class="returns-warning">
          <AppIcon name="alert-triangle" :size="15"/> Недостача остаётся в резерве: передайте на расследование, списание автоматически не проводится.
        </p>
        <p v-else-if="item.record?.status==='confirmed'" class="returns-approved">
          <AppIcon name="check-circle-2" :size="15"/> Возврат освобождён из резерва. Принятое магазином отражено в отгрузке.
        </p>
      </article>
      <EmptyState v-if="!visible.length" title="Нет расхождений по выбранным фильтрам" description="Частичные доставки и отказы будут отображены здесь." />
    </div>
  </SectionCard>
  <p class="returns-footnote">Модель учитывает товар в резерве основного склада до подтверждения. Возвращённое не добавляется к остатку повторно, поскольку при выезде резерв не списывался. Недостача остаётся в резерве для расследования. В промышленной версии нужны сканирование партий, акты возврата, 1С и разграничение прав на backend.</p>

  <ModalShell :open="!!active" title="Сверка товаров" subtitle="Заполните фактическое количество по каждой позиции" size="lg" @close="modalStopId=''">
    <form v-if="active" class="stack-lg" @submit.prevent="save">
      <div class="returns-dialog-title"><strong>{{active.outlet?.name}}</strong><span>{{active.route.number}} · {{active.stop.status==='failed'?'Отказ':'Частичная доставка'}}</span></div>
      <div class="returns-input-lines">
        <div v-for="line in draft.lines" :key="line.productId" class="returns-input-line">
          <div class="returns-input-product"><strong>{{product(line.productId)}}</strong><span>По заявке {{line.orderedQty}} ед.</span></div>
          <div class="returns-input-fields">
            <label class="field"><span>Магазин принял</span><input v-model.number="line.acceptedQty" type="number" min="0" :max="line.orderedQty" step="1" required /></label>
            <label class="field"><span>Вернули на склад</span><input v-model.number="line.returnedQty" type="number" min="0" :max="line.orderedQty" step="1" required /></label>
          </div>
          <div class="returns-leftover" :class="{'has-error':unaccounted(line)<0}">
            Недостача / не подтверждено: <strong>{{unaccounted(line)}} ед.</strong>
          </div>
        </div>
      </div>
      <label class="field"><span>Комментарий экипажа</span><textarea v-model="notes" rows="3" placeholder="Причина возврата, состояние груза, расхождения..." maxlength="1500"/></label>
      <p class="returns-footnote">Отчёт экипажа не списывает товар и не подтверждает фактическую приёмку. Перед изменением резервов сотрудник склада проверяет все количества.</p>
      <div v-if="error" class="form-error" role="alert">{{error}}</div>
      <div class="form-footer"><button type="button" class="btn btn-secondary" @click="modalStopId=''">Отмена</button><button type="submit" class="btn btn-primary">Направить на склад</button></div>
    </form>
  </ModalShell>
</template>
