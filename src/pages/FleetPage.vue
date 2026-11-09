<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ModalShell from '@/components/ui/ModalShell.vue'
import PageTitle from '@/components/ui/PageTitle.vue'
import SectionCard from '@/components/ui/SectionCard.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import { can } from '@/access'
import { useDistributionStore } from '@/stores/distribution'
import { dayOffset, orderWeight } from '@/utils/domain'
import { estimatedVolume } from '@/utils/expiry'

const store=useDistributionStore()
const date=ref(dayOffset(1))
const modal=ref(false)
const staffModal=ref(false)
const error=ref('')
const vehicle=reactive({plate:'',title:'',capacityKg:1500,volumeM3:10,maxPallets:4,driverId:'u8',year:2024,notes:''})
const employee=reactive<{name:string;phone:string;role:'driver'|'forwarder'}>({name:'',phone:'',role:'driver'})
const roster=computed(()=>store.data.employees.filter(e=>e.active&&['driver','forwarder'].includes(e.role)))
const activeVehicles=computed(()=>store.data.vehicles.filter(v=>v.active!==false))
function capacity(id:string){
  const routes=store.data.routes.filter(r=>r.vehicleId===id&&r.date===date.value)
  const orders=routes.flatMap(r=>store.data.orders.filter(o=>r.stops.some(stop=>stop.orderIds.includes(o.id))))
  const weight=orders.reduce((sum,o)=>sum+orderWeight(o.items,store.data.products),0)
  const volume=orders.reduce((sum,o)=>sum+estimatedVolume(o.items,store.data.products),0)
  const capacity=store.data.vehicles.find(v=>v.id===id)!
  return {routes,weight,volume,pct:Math.round(weight/capacity.capacityKg*100),
    volumePct:capacity.volumeM3?Math.round(volume/capacity.volumeM3*100):0}
}
const busy=computed(()=>activeVehicles.value.filter(v=>capacity(v.id).routes.length>0).length)
function addVehicle(){
  error.value=''
  try{store.addVehicle({...vehicle});modal.value=false;store.notify('Автомобиль добавлен в справочник.')
    vehicle.plate='';vehicle.title=''}
  catch(e){error.value=e instanceof Error?e.message:'Не удалось сохранить автомобиль'}
}
function addStaff(){
  error.value=''
  try{store.addEmployee({...employee});staffModal.value=false;store.notify('Сотрудник добавлен в справочник.');employee.name='';employee.phone=''}
  catch(e){error.value=e instanceof Error?e.message:'Не удалось сохранить сотрудника'}
}
function name(id?:string){return store.data.employees.find(e=>e.id===id)?.name||'Не назначен'}
</script>
<template>
  <PageTitle title="Автопарк и экипажи" subtitle="Машины, водители, экспедиторы, рейсы и загрузка на выбранную дату">
    <button v-if="can(store.currentRole,'staff:edit')" class="btn btn-secondary" @click="staffModal=true">Добавить сотрудника</button>
    <button v-if="can(store.currentRole,'fleet:edit')" class="btn btn-primary" @click="error='';modal=true">Добавить машину</button>
  </PageTitle>
  <div class="fleet-date-selector"><label class="field"><span>Дата загрузки</span><input v-model="date" type="date" /></label><span>Загрузка оценивается по назначенным заказам: вес и объём кузова.</span></div>
  <div class="metrics-grid metrics-grid-three">
    <div class="metric-card"><span class="metric-top">Автомобилей</span><strong class="metric-value">{{activeVehicles.length}}</strong></div>
    <div class="metric-card"><span class="metric-top">Назначены на рейс</span><strong class="metric-value">{{busy}}</strong></div>
    <div class="metric-card"><span class="metric-top">Свободные</span><strong class="metric-value">{{activeVehicles.length-busy}}</strong></div>
  </div>
  <div class="fleet-directory-grid">
    <SectionCard v-for="v in activeVehicles" :key="v.id" :title="v.plate" :description="v.title">
      <div class="fleet-facts">
        <div><span>Грузоподъёмность</span><strong>{{v.capacityKg.toLocaleString('ru-RU')}} кг</strong></div>
        <div><span>Объём кузова</span><strong>{{v.volumeM3??'Не указан'}} м³</strong></div>
        <div><span>Паллет</span><strong>{{v.maxPallets??'—'}}</strong></div>
        <div><span>Водитель (справочник)</span><strong>{{name(v.driverId)}}</strong></div>
      </div>
      <div class="fleet-progress-line"><span>Вес: {{capacity(v.id).weight.toFixed(1)}} / {{v.capacityKg}} кг</span><strong>{{capacity(v.id).pct}}%</strong></div>
      <div class="route-progress"><span :style="{width:Math.min(100,capacity(v.id).pct)+'%'}" /></div>
      <div class="fleet-progress-line"><span>Объём: {{capacity(v.id).volume.toFixed(2)}} / {{v.volumeM3??'—'}} м³</span><strong>{{capacity(v.id).volumePct}}%</strong></div>
      <div class="route-progress"><span :style="{width:Math.min(100,capacity(v.id).volumePct)+'%'}" /></div>
      <div class="fleet-route-link" v-if="capacity(v.id).routes.length">
        <router-link v-for="r in capacity(v.id).routes" :key="r.id" :to="'/routes/'+r.id">
          <strong>{{r.number}}</strong><span>{{name(r.driverId)}} · Экспедитор: {{name(r.forwarderId)}} · {{r.stops.length}} точек</span><StatusBadge :status="r.status" />
        </router-link>
      </div>
      <p v-else class="small muted">На выбранную дату машина не назначена.</p>
    </SectionCard>
  </div>
  <SectionCard title="Водители и экспедиторы" description="Люди, которых можно назначить на доставку">
    <div class="fleet-staff-list">
      <div v-for="e in roster" :key="e.id" class="fleet-staff-row">
        <strong>{{e.name}}</strong><span>{{e.role==='driver'?'Водитель':'Экспедитор'}}</span>
        <span>{{e.phone==='—'?'Телефон не указан':e.phone}}</span>
        <small>{{store.data.routes.filter(r=>r.date===date&&(r.driverId===e.id||r.forwarderId===e.id)).length?'Занят(а)':'Свободен(на)'}}</small>
      </div>
    </div>
    <EmptyState v-if="!roster.length" title="Пока нет сотрудников доставки" />
  </SectionCard>
  <p class="directory-footnote">Фактический вес груза и рабочие смены будут подтверждаться по документам склада и графику персонала. Данные на этой странице учебные.</p>
  <ModalShell :open="modal" title="Новый автомобиль" subtitle="Справочник транспорта и вместимости" size="lg" @close="modal=false">
    <form class="stack-lg" @submit.prevent="addVehicle">
      <div class="form-grid">
        <label class="field"><span>Госномер *</span><input v-model="vehicle.plate" required placeholder="123 ABC 01" /></label>
        <label class="field"><span>Модель *</span><input v-model="vehicle.title" required placeholder="Hyundai HD78" /></label>
        <label class="field"><span>Грузоподъёмность, кг *</span><input v-model.number="vehicle.capacityKg" type="number" min="1" step="1" required /></label>
        <label class="field"><span>Объём кузова, м³ *</span><input v-model.number="vehicle.volumeM3" type="number" min=".1" step=".1" required /></label>
        <label class="field"><span>Паллет</span><input v-model.number="vehicle.maxPallets" type="number" min="0" step="1" /></label>
        <label class="field"><span>Год</span><input v-model.number="vehicle.year" type="number" min="1990" max="2035" step="1" /></label>
        <label class="field field-wide"><span>Закреплённый водитель</span><select v-model="vehicle.driverId"><option v-for="d in roster.filter(e=>e.role==='driver')" :key="d.id" :value="d.id">{{d.name}}</option></select></label>
        <label class="field field-wide"><span>Примечание</span><textarea v-model="vehicle.notes" rows="2" /></label>
      </div>
      <div v-if="error" class="form-error">{{error}}</div>
      <div class="form-footer"><button type="button" class="btn btn-secondary" @click="modal=false">Отмена</button><button class="btn btn-primary">Добавить машину</button></div>
    </form>
  </ModalShell>
  <ModalShell :open="staffModal" title="Новый сотрудник доставки" subtitle="Водитель или экспедитор без реальной учётной записи" @close="staffModal=false">
    <form class="stack-lg" @submit.prevent="addStaff">
      <label class="field"><span>Имя и фамилия *</span><input v-model="employee.name" required /></label>
      <label class="field"><span>Специализация</span><select v-model="employee.role"><option value="driver">Водитель</option><option value="forwarder">Экспедитор</option></select></label>
      <label class="field"><span>Телефон</span><input v-model="employee.phone" type="tel" /></label>
      <div v-if="error" class="form-error">{{error}}</div>
      <div class="form-footer"><button type="button" class="btn btn-secondary" @click="staffModal=false">Отмена</button><button class="btn btn-primary">Сохранить</button></div>
    </form>
  </ModalShell>
</template>
