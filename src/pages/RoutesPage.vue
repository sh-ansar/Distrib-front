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
const store=useDistributionStore()
const router=useRouter()
const planOpen=ref(false)
const error=ref('')
const plan=reactive({date:dayOffset(1),vehicleId:'v1',driverId:'u8',orderIds:[] as string[]})
watch(()=>plan.date,()=>{plan.orderIds=[]})
const availableOrders=computed(()=>store.visibleOrders.filter(o=>o.status==='ready' && o.deliveryDate===plan.date && !o.routeId))
const selectedOrders=computed(()=>availableOrders.value.filter(o=>plan.orderIds.includes(o.id)))
const selectedWeight=computed(()=>selectedOrders.value.reduce((s,o)=>s+orderWeight(o.items,store.data.products),0))
const vehicle=computed(()=>store.data.vehicles.find(v=>v.id===plan.vehicleId))
const routes=computed(()=>[...store.visibleRoutes].sort((a,b)=>b.date.localeCompare(a.date)))
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
    <div><strong>{{routes.length}}</strong><span>Рейсов всего</span></div>
    <div><strong>{{routes.filter(r=>r.status==='active').length}}</strong><span>В пути</span></div>
    <div><strong>{{routes.reduce((s,r)=>s+r.stops.filter(p=>p.status==='pending').length,0)}}</strong><span>Точек к доставке</span></div>
    <div><strong>{{store.data.vehicles.length}}</strong><span>Автомобилей</span></div>
  </div>
  <SectionCard title="Журнал рейсов" description="Каждая остановка связана с одной или несколькими заявками">
    <div v-if="routes.length" class="route-card-grid">
      <router-link v-for="route in routes" :key="route.id" :to="'/routes/'+route.id" class="route-card">
        <div class="route-card-top"><span class="route-card-icon"><AppIcon name="truck" :size="22" /></span><StatusBadge :status="route.status" /></div>
        <h3>{{route.number}}</h3><p>{{displayDate(route.date)}}</p>
        <div class="route-card-meta"><span><AppIcon name="user-round" :size="16" /> {{store.data.employees.find(e=>e.id===route.driverId)?.name}}</span><span><AppIcon name="truck" :size="16" /> {{store.data.vehicles.find(v=>v.id===route.vehicleId)?.plate}}</span></div>
        <div class="route-progress"><span :style="{width:route.stops.length?100*route.stops.filter(s=>s.status!=='pending').length/route.stops.length+'%':'0%'}" /></div>
        <div class="route-card-bottom"><strong>{{route.stops.filter(s=>s.status!=='pending').length}} / {{route.stops.length}} точек</strong><span>Открыть рейс <AppIcon name="arrow-right" :size="16" /></span></div>
      </router-link>
    </div>
    <EmptyState v-else icon="truck" title="Рейсов пока нет" description="Добавьте готовые к отгрузке заявки и сформируйте первый маршрут." />
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
          <span class="check-row-text"><strong>{{store.data.outlets.find(o=>o.id===order.outletId)?.name}}</strong><small>{{order.number}} · {{money(orderTotal(order))}}</small></span>
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
