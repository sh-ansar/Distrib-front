<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import AppIcon from '@/components/ui/AppIcon.vue'
import ModalShell from '@/components/ui/ModalShell.vue'
import PageTitle from '@/components/ui/PageTitle.vue'
import SectionCard from '@/components/ui/SectionCard.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import { can } from '@/access'
import { useDistributionStore } from '@/stores/distribution'
import { displayDate, money, orderTotal, orderWeight, phoneLink } from '@/utils/domain'
import { routeProgress } from '@/utils/routeProgress'
import { estimatedVolume } from '@/utils/expiry'
import type { RouteStatus, StopStatus } from '@/types/domain'
const store=useDistributionStore()
const params=useRoute()
const route=computed(()=>store.visibleRoutes.find(r=>r.id===String(params.params.id)))
const vehicle=computed(()=>store.data.vehicles.find(v=>v.id===route.value?.vehicleId))
const driver=computed(()=>store.data.employees.find(e=>e.id===route.value?.driverId))
const forwarder=computed(()=>store.data.employees.find(e=>e.id===route.value?.forwarderId))
const selectedStopId=ref('')
const outcome=ref<Exclude<StopStatus,'pending'>>('delivered')
const notes=ref('')
const error=ref('')
const selectedStop=computed(()=>route.value?.stops.find(s=>s.id===selectedStopId.value))
const sortedStops=computed(()=>[...(route.value?.stops||[])].sort((a,b)=>a.position-b.position))
const routeOrders=computed(()=>store.data.orders.filter(o=>route.value?.stops.some(s=>s.orderIds.includes(o.id))))
const weight=computed(()=>routeOrders.value.reduce((s,o)=>s+orderWeight(o.items,store.data.products),0))
const volume=computed(()=>routeOrders.value.reduce((s,o)=>s+estimatedVolume(o.items,store.data.products),0))
const done=computed(()=>route.value?.stops.filter(s=>s.status!=='pending').length||0)
const progress=computed(()=>route.value?routeProgress(route.value):null)
const nextStatus=computed<RouteStatus|null>(()=>route.value?.status==='planned'?'loading':route.value?.status==='loading'?'active':route.value?.status==='active'?'completed':null)
const nextLabel=computed(()=>nextStatus.value==='loading'?'Начать загрузку':nextStatus.value==='active'?'Выехать в рейс':nextStatus.value==='completed'?'Завершить рейс':'')
function move(){
  try{if(route.value&&nextStatus.value){store.moveRoute(route.value.id,nextStatus.value);store.notify('Этап рейса изменён.')}}
  catch(e){store.notify(e instanceof Error?e.message:'Ошибка рейса','error')}
}
function openStop(id:string){selectedStopId.value=id;outcome.value='delivered';notes.value='';error.value=''}
function finish(){
  error.value=''
  try{if(route.value && selectedStop.value){store.finishStop(route.value.id,selectedStop.value.id,outcome.value,notes.value);selectedStopId.value='';store.notify('Результат доставки сохранён.')}}
  catch(e){error.value=e instanceof Error?e.message:'Не удалось сохранить результат'}
}
function printPage(){window.print()}
function outletName(id:string){return store.data.outlets.find(o=>o.id===id)?.name||'Магазин'}
function companyName(id:string){const o=store.data.outlets.find(o=>o.id===id);return store.data.customers.find(c=>c.id===o?.customerId)?.legalName||'Контрагент'}
function eventTime(value?:string){return value?new Date(value).toLocaleString('ru-RU',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}):'Ещё нет подтверждения'}
function orderFor(id:string){return store.data.orders.find(o=>o.id===id)}
</script>
<template>
  <div v-if="!route"><PageTitle title="Рейс не найден" subtitle="Маршрут отсутствует или недоступен вашему пользователю." /><router-link class="btn btn-secondary" to="/routes"><AppIcon name="arrow-left" /> Все рейсы</router-link></div>
  <template v-else>
    <div class="detail-back"><router-link to="/routes"><AppIcon name="arrow-left" :size="17" /> Все рейсы</router-link></div>
    <PageTitle eyebrow="МАРШРУТНЫЙ ЛИСТ" :title="'Рейс '+route.number" :subtitle="'Дата доставки: '+displayDate(route.date)">
      <router-link class="btn btn-secondary no-print" :to="'/documents?route='+route.id">Накладные</router-link>
      <button class="btn btn-secondary no-print" @click="printPage"><AppIcon name="printer" :size="17" /> Печать</button>
      <button v-if="can(store.currentRole,'routes:edit')&&nextStatus" class="btn btn-primary no-print" :disabled="nextStatus==='completed'&&done<route.stops.length" @click="move"><AppIcon name="check" :size="17" /> {{nextLabel}}</button>
    </PageTitle>
    <div class="route-head-stats">
      <div><span>Статус рейса</span><StatusBadge :status="route.status" /></div>
      <div><span>Автомобиль</span><strong>{{vehicle?.plate||'—'}}</strong><small>{{vehicle?.title}}</small></div>
      <div><span>Водитель</span><strong>{{driver?.name||'—'}}</strong><small>Экспедитор: {{forwarder?.name||'Не назначен'}}</small></div>
      <div><span>Точки</span><strong>{{done}} / {{route.stops.length}}</strong></div>
      <div><span>Вес загрузки</span><strong>{{weight.toFixed(1)}} кг</strong><small>{{vehicle?.capacityKg?Math.round(weight/vehicle.capacityKg*100):0}}% от {{vehicle?.capacityKg}} кг</small></div>
      <div><span>Объём кузова</span><strong>{{volume.toFixed(2)}} м³</strong><small>{{vehicle?.volumeM3?Math.round(volume/vehicle.volumeM3*100)+'%':''}} от {{vehicle?.volumeM3??'—'}} м³</small></div>
    </div>
    <div class="route-progress route-progress-wide"><span :style="{width:route.stops.length?done/route.stops.length*100+'%':'0%'}" /></div>
    <section class="route-live-summary">
      <div><span>Последняя подтверждённая остановка</span><strong>{{progress?.last?outletName(progress.last.outletId):'Ещё нет отметок'}}</strong><small v-if="progress?.lastEventAt">{{eventTime(progress.lastEventAt)}}</small></div>
      <div><span>Следующая по маршрутному листу</span><strong>{{progress?.next?outletName(progress.next.outletId):'Все точки обработаны'}}</strong><small v-if="progress?.next">{{companyName(progress.next.outletId)}}</small></div>
      <div><span>Проблемные поставки</span><strong :class="{'text-danger':(progress?.problems||0)>0}">{{progress?.problems||0}}</strong><small>Требуют сверки, если есть</small></div>
    </section>
    <p class="route-disclaimer">Контроль по отметкам водителя. Живое местоположение автомобиля и ETA недоступны: GPS пока не подключён.</p>
    <div class="two-col-layout route-detail-grid">
      <SectionCard title="Маршрутный лист" :description="route.stops.length+' торговых точек по порядку'">
        <div class="stop-list">
          <div v-for="stop in sortedStops" :key="stop.id" class="stop-card" :class="{'stop-complete':stop.status!=='pending'}">
            <span class="stop-number" :class="{'stop-done':stop.status==='delivered'}">{{stop.position}}</span>
            <div class="stop-content">
              <div class="stop-head"><h3>{{store.data.outlets.find(o=>o.id===stop.outletId)?.name}}</h3><StatusBadge :status="stop.status" /></div>
              <router-link v-if="can(store.currentRole,'companies')" class="text-link stop-company-name" :to="'/companies/'+store.data.outlets.find(o=>o.id===stop.outletId)?.customerId">{{companyName(stop.outletId)}}</router-link>
              <span v-else class="stop-company-name">{{companyName(stop.outletId)}}</span>
              <div class="stop-address"><AppIcon name="map-pin" :size="15" /> {{store.data.outlets.find(o=>o.id===stop.outletId)?.address}}</div>
              <div class="stop-delivery-info">
                <div><span>Приёмка</span><strong>{{store.data.outlets.find(o=>o.id===stop.outletId)?.receivingWindow||store.data.customers.find(c=>c.id===store.data.outlets.find(o=>o.id===stop.outletId)?.customerId)?.profile?.receivingWindow||'Уточнить'}}</strong></div>
                <div><span>Контакт</span><strong>{{store.data.outlets.find(o=>o.id===stop.outletId)?.contactName||'Уточнить'}}</strong></div>
                <div><span>Телефон</span><a v-if="store.data.outlets.find(o=>o.id===stop.outletId)?.phone" class="text-link" :href="phoneLink(store.data.outlets.find(o=>o.id===stop.outletId)?.phone||'')">{{store.data.outlets.find(o=>o.id===stop.outletId)?.phone}}</a><span v-else>—</span></div>
              </div>
              <p v-if="store.data.outlets.find(o=>o.id===stop.outletId)?.accessInstructions" class="stop-instructions">{{store.data.outlets.find(o=>o.id===stop.outletId)?.accessInstructions}}</p>
              <div class="stop-order-list"><span v-for="id in stop.orderIds" :key="id" class="stop-order">{{orderFor(id)?.number}} · {{money(orderTotal(orderFor(id)||{items:[]}))}}</span></div>
              <small v-if="stop.completedAt" class="stop-event-time">Отметка: {{eventTime(stop.completedAt)}}</small>
              <p v-if="stop.notes" class="stop-notes">{{stop.notes}}</p>
              <button v-if="route.status==='active'&&stop.status==='pending'&&can(store.currentRole,'routes:edit')" class="btn btn-secondary btn-sm no-print" type="button" @click="openStop(stop.id)"><AppIcon name="clipboard-check" :size="16" /> Отметить доставку</button>
            </div>
          </div>
        </div>
      </SectionCard>
      <div class="stack-lg">
        <SectionCard title="Информация о грузе" description="Заявки, назначенные на рейс">
          <div v-for="order in routeOrders" :key="order.id" class="order-brief"><div><strong>{{order.number}}</strong><small>{{store.data.outlets.find(o=>o.id===order.outletId)?.name}}</small></div><strong>{{money(orderTotal(order))}}</strong></div>
        </SectionCard>
        <div class="inline-notice warn-notice"><AppIcon name="file-image" :size="19" /><div><strong>Накладные и подтверждения</strong><p>Сейчас отметки доставки тестовые. Фото подписанных накладных будут загружаться после подключения защищённого хранилища. Отказы и частичные поставки требуют сверки с 1С.</p></div></div>
      </div>
    </div>
    <ModalShell :open="!!selectedStop" title="Результат доставки" subtitle="Выберите исход посещения точки" @close="selectedStopId=''">
      <form class="stack-lg" @submit.prevent="finish">
        <div v-if="selectedStop" class="money-summary"><span>Точка</span><strong>{{store.data.outlets.find(o=>o.id===selectedStop?.outletId)?.name}}</strong></div>
        <label class="field"><span>Результат *</span><select v-model="outcome"><option value="delivered">Доставлено полностью</option><option value="partial">Доставлено частично</option><option value="failed">Не доставлено / отказ</option></select></label>
        <label class="field"><span>{{outcome==='delivered'?'Комментарий':'Причина и детали *'}}</span><textarea v-model="notes" rows="3" :required="outcome!=='delivered'" placeholder="Например, магазин закрыт, часть заказа не принята..." /></label>
        <div class="inline-notice"><AppIcon name="info" :size="18" /> Статус «частично» не означает автоматической корректировки денежных сумм или остатков: нужна сверка с фактической накладной в 1С.</div>
        <div v-if="error" class="form-error" role="alert">{{error}}</div>
        <div class="form-footer"><button class="btn btn-secondary" type="button" @click="selectedStopId=''">Отмена</button><button class="btn btn-primary" type="submit">Сохранить результат</button></div>
      </form>
    </ModalShell>
  </template>
</template>
