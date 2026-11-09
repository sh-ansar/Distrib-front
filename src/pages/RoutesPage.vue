<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '@/components/ui/AppIcon.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ModalShell from '@/components/ui/ModalShell.vue'
import PageTitle from '@/components/ui/PageTitle.vue'
import SectionCard from '@/components/ui/SectionCard.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import { can } from '@/access'
import { useDistributionStore } from '@/stores/distribution'
import { dayOffset, displayDate, money, orderTotal, orderWeight } from '@/utils/domain'
import { routeProgress } from '@/utils/routeProgress'
import { matchesSearch } from '@/utils/search'
const store=useDistributionStore()
const router=useRouter()
const planOpen=ref(false)
const error=ref('')
const routeSearch=ref('')
const routeStatus=ref('')
const routeDate=ref('')
const plan=reactive({date:dayOffset(1),vehicleId:'v1',driverId:'u8',orderIds:[] as string[]})
watch(()=>plan.date,()=>{plan.orderIds=[]})
const availableOrders=computed(()=>store.visibleOrders.filter(o=>o.status==='ready' && o.deliveryDate===plan.date && !o.routeId))
const selectedOrders=computed(()=>availableOrders.value.filter(o=>plan.orderIds.includes(o.id)))
const selectedWeight=computed(()=>selectedOrders.value.reduce((s,o)=>s+orderWeight(o.items,store.data.products),0))
const vehicle=computed(()=>store.data.vehicles.find(v=>v.id===plan.vehicleId))
const allRoutes=computed(()=>[...store.visibleRoutes].sort((a,b)=>b.date.localeCompare(a.date)))
function storeName(id:string){return store.data.outlets.find(o=>o.id===id)?.name||'Торговая точка'}
function companyName(id:string){
  const outlet=store.data.outlets.find(o=>o.id===id)
  return store.data.customers.find(c=>c.id===outlet?.customerId)?.legalName||'Компания не найдена'
}
function companyCount(id:string){
  const route=allRoutes.value.find(r=>r.id===id)
  return new Set(route?.stops.map(s=>store.data.outlets.find(o=>o.id===s.outletId)?.customerId).filter(Boolean)).size
}
const routes=computed(()=>allRoutes.value.filter(r=>
  (!routeStatus.value||r.status===routeStatus.value) && (!routeDate.value||r.date===routeDate.value) &&
  matchesSearch(routeSearch.value,[
    r.number,store.data.employees.find(e=>e.id===r.driverId)?.name,
    store.data.vehicles.find(v=>v.id===r.vehicleId)?.plate,
    ...r.stops.flatMap(s=>[storeName(s.outletId),companyName(s.outletId),store.data.outlets.find(o=>o.id===s.outletId)?.address]),
  ])
))
function createRoute(){
  error.value=''
  try{const r=store.planRoute({...plan});planOpen.value=false;store.notify('Рейс '+r.number+' создан (демо).');router.push('/routes/'+r.id)}
  catch(e){error.value=e instanceof Error?e.message:'Ошибка формирования рейса.'}
}
</script>
<template>
  <PageTitle eyebrow="ЛОГИСТИКА И ДОСТАВКА" title="Рейсы и маршруты" subtitle="Вечернее планирование доставок, маршруты и подтверждающие документы">
    <button v-if="can(store.currentRole,'routes:edit')" type="button" class="btn btn-primary" @click="planOpen=true"><AppIcon name="plus" :size="18" /> Сформировать рейс</button>
  </PageTitle>
  <div class="mini-stats">
    <div><strong>{{allRoutes.length}}</strong><span>Рейсов всего</span></div>
    <div><strong>{{allRoutes.filter(r=>r.status==='active').length}}</strong><span>В пути</span></div>
    <div><strong>{{allRoutes.reduce((sum,r)=>sum+routeProgress(r).pending,0)}}</strong><span>Точек к доставке</span></div>
    <div><strong>{{store.data.vehicles.length}}</strong><span>Автомобилей</span></div>
  </div>
  <SectionCard title="Контроль рейсов" description="Статусы, очередность точек, водитель и последняя подтверждённая доставка">
    <div class="route-filter-bar">
      <label class="field"><span>Поиск</span><input v-model="routeSearch" aria-label="Поиск рейсов" placeholder="Рейс, водитель, компания, магазин..." /></label>
      <label class="field"><span>Дата</span><input v-model="routeDate" type="date" aria-label="Дата рейса" /></label>
      <label class="field"><span>Статус</span><select v-model="routeStatus" aria-label="Статус рейса"><option value="">Все статусы</option><option value="planned">Запланирован</option><option value="loading">Загрузка</option><option value="active">В пути</option><option value="completed">Завершён</option></select></label>
    </div>
    <div v-if="routes.length" class="route-monitor-list">
      <router-link v-for="r in routes" :key="r.id" :to="'/routes/'+r.id" class="route-monitor-card">
        <div class="route-monitor-top">
          <div><strong>{{r.number}}</strong><small>{{displayDate(r.date)}} · {{companyCount(r.id)}} компаний · {{r.stops.length}} точек</small></div>
          <StatusBadge :status="r.status" />
        </div>
        <div class="route-monitor-meta">
          <div><span>Водитель</span><strong>{{store.data.employees.find(e=>e.id===r.driverId)?.name||'—'}}</strong></div>
          <div><span>Машина</span><strong>{{store.data.vehicles.find(v=>v.id===r.vehicleId)?.plate||'—'}}</strong></div>
          <div><span>Выполнено</span><strong>{{routeProgress(r).completed}} / {{routeProgress(r).total}}</strong></div>
          <div v-if="routeProgress(r).problems"><span>Проблемы</span><strong class="text-danger">{{routeProgress(r).problems}}</strong></div>
        </div>
        <div class="route-progress"><span :style="{width:routeProgress(r).percent+'%'}" /></div>
        <div class="route-monitor-events">
          <p v-if="routeProgress(r).last"><span>Последняя отметка</span><strong>{{storeName(routeProgress(r).last!.outletId)}}</strong></p>
          <p v-if="routeProgress(r).next"><span>Следующая точка</span><strong>{{storeName(routeProgress(r).next!.outletId)}}</strong><small>{{companyName(routeProgress(r).next!.outletId)}}</small></p>
          <p v-if="!routeProgress(r).last"><span>Доставка</span><strong>Подтверждений ещё нет</strong></p>
          <span class="route-monitor-link">Маршрутный лист →</span>
        </div>
      </router-link>
    </div>
    <EmptyState v-else icon="truck" title="Рейсы не найдены" description="Измените фильтры или создайте маршрут из готовых заявок." />
    <p class="route-disclaimer">Позиция машины и ETA пока недоступны: отображаются только подтверждённые водителем остановки, без GPS.</p>
  </SectionCard>
  <SectionCard title="Принцип вечернего планирования" description="Сначала доступный и контролируемый процесс, затем оптимизация">
    <div class="steps-grid">
      <div><span>01</span><strong>Заявки</strong><p>Выберите готовые заказы на одну дату доставки.</p></div>
      <div><span>02</span><strong>Автомобиль</strong><p>Проверьте грузоподъёмность и назначьте водителя.</p></div>
      <div><span>03</span><strong>Маршрут</strong><p>Объедините заказы по торговым точкам и утвердите рейс.</p></div>
      <div><span>04</span><strong>Доставка</strong><p>Отмечайте выполнение и причины недоставки.</p></div>
    </div>
  </SectionCard>
  <ModalShell :open="planOpen" title="Планирование рейса" subtitle="Готовые заявки выбранного дня · контроль веса" size="lg" @close="planOpen=false">
    <form class="stack-lg" @submit.prevent="createRoute">
      <div class="form-grid">
        <label class="field"><span>Дата доставки</span><input v-model="plan.date" type="date" :min="dayOffset(0)" required /></label>
        <label class="field"><span>Автомобиль</span><select v-model="plan.vehicleId" required><option v-for="v in store.data.vehicles" :key="v.id" :value="v.id">{{v.plate}} · {{v.capacityKg}} кг</option></select></label>
        <label class="field field-wide"><span>Водитель</span><select v-model="plan.driverId" required><option v-for="driver in store.data.employees.filter(e=>e.role==='driver'&&e.active)" :key="driver.id" :value="driver.id">{{driver.name}}</option></select></label>
      </div>
      <div class="form-section-title"><strong>Готовые заявки — {{availableOrders.length}}</strong><span class="muted small">Доступны только заказы со статусом «Готова»</span></div>
      <div v-if="availableOrders.length" class="check-list">
        <label v-for="order in availableOrders" :key="order.id" class="check-row">
          <input v-model="plan.orderIds" type="checkbox" :value="order.id" />
          <span class="check-row-text"><strong>{{store.data.outlets.find(o=>o.id===order.outletId)?.name}}</strong><small>{{companyName(order.outletId)}} · {{order.number}} · {{money(orderTotal(order))}}</small><small>Приёмка: {{store.data.outlets.find(o=>o.id===order.outletId)?.receivingWindow||'Уточнить'}}</small></span>
          <strong>{{orderWeight(order.items,store.data.products).toFixed(0)}} кг</strong>
        </label>
      </div>
      <EmptyState v-else icon="package-open" title="Нет готовых заявок" description="Сначала подтвердите и соберите заказы в разделе «Заявки»." />
      <div class="weight-banner" :class="{'over-capacity':selectedWeight>(vehicle?.capacityKg||0)}"><span>Вес выбранных заказов</span><strong>{{selectedWeight.toFixed(1)}} / {{vehicle?.capacityKg}} кг</strong></div>
      <div v-if="error" class="form-error" role="alert">{{error}}</div>
      <div class="form-footer"><button type="button" class="btn btn-secondary" @click="planOpen=false">Отмена</button><button type="submit" class="btn btn-primary" :disabled="!plan.orderIds.length">Сформировать рейс</button></div>
    </form>
  </ModalShell>
</template>
