<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import ModalShell from '@/components/ui/ModalShell.vue'
import PageTitle from '@/components/ui/PageTitle.vue'
import SectionCard from '@/components/ui/SectionCard.vue'
import { can } from '@/access'
import { useDistributionStore } from '@/stores/distribution'
import { money, orderTotal } from '@/utils/domain'

const store=useDistributionStore()
const month=ref(new Date().toISOString().slice(0,7))
const selected=ref('')
const editing=ref(false)
const error=ref('')
const edit=reactive({employeeId:'',month:'',revenueTarget:0,visitsTarget:0,outletsTarget:0,notes:''})
const sales=computed(()=>store.data.employees.filter(e=>e.role==='sales'&&e.active &&
  (store.currentRole!=='sales'||e.id===store.currentUserId)))
const rows=computed(()=>sales.value.map(rep=>{
  const plan=store.data.salesPlans.find(p=>p.employeeId===rep.id&&p.month===month.value)
  const visits=store.data.visits.filter(v=>v.repId===rep.id&&v.plannedDate.startsWith(month.value)&&v.status==='completed')
  const closedOutlets=new Set(visits.map(v=>v.outletId)).size
  const orders=store.data.orders.filter(o=>o.createdBy===rep.id&&o.createdAt.startsWith(month.value)&&o.status==='delivered')
  const actual=orders.reduce((sum,o)=>sum+orderTotal(o),0)
  return {...rep,plan,visitsCount:visits.length,closedOutlets,actual,
    revenuePercent:plan?.revenueTarget?Math.round(100*actual/plan.revenueTarget):0,
    visitPercent:plan?.visitsTarget?Math.round(100*visits.length/plan.visitsTarget):0,
  }
}))
const totals=computed(()=>({
  sales:rows.value.reduce((sum,r)=>sum+r.actual,0),
  target:rows.value.reduce((sum,r)=>sum+(r.plan?.revenueTarget??0),0),
  visits:rows.value.reduce((sum,r)=>sum+r.visitsCount,0),
}))
function open(repId:string){
  const p=store.data.salesPlans.find(p=>p.employeeId===repId&&p.month===month.value)
  Object.assign(edit,{employeeId:repId,month:month.value,revenueTarget:p?.revenueTarget??0,
    visitsTarget:p?.visitsTarget??0,outletsTarget:p?.outletsTarget??0,notes:p?.notes??''})
  selected.value=repId;editing.value=true;error.value=''
}
function save(){
  error.value=''
  try{store.saveSalesPlan({...edit});editing.value=false;store.notify('План сотрудника сохранён.')}
  catch(e){error.value=e instanceof Error?e.message:'Не удалось сохранить план.'}
}
</script>
<template>
  <PageTitle title="Планы торговой команды" subtitle="Месячные цели по продажам, посещениям и охвату торговых точек" />
  <div class="plan-month-picker"><label class="field"><span>Отчётный месяц</span><input v-model="month" type="month" /></label>
    <span>План/факт рассчитывается по доступным заявкам и подтверждённым визитам. Данные учебные.</span>
  </div>
  <div class="metrics-grid metrics-grid-three">
    <div class="metric-card"><span class="metric-top">План выручки</span><strong class="metric-value">{{money(totals.target)}}</strong></div>
    <div class="metric-card"><span class="metric-top">Учитываемые продажи</span><strong class="metric-value">{{money(totals.sales)}}</strong></div>
    <div class="metric-card"><span class="metric-top">Завершено визитов</span><strong class="metric-value">{{totals.visits}}</strong></div>
  </div>
  <div class="sales-plan-grid">
    <SectionCard v-for="rep in rows" :key="rep.id" :title="rep.name" :description="'Представитель · '+(rep.plan?'План установлен':'План не установлен')">
      <template #action><button v-if="can(store.currentRole,'plans:edit')" type="button" class="btn btn-secondary btn-sm" @click="open(rep.id)">Изменить план</button></template>
      <div class="sales-plan-metric">
        <div><span>Продажи</span><strong>{{money(rep.actual)}} / {{money(rep.plan?.revenueTarget??0)}}</strong></div>
        <div class="route-progress"><span :style="{width:Math.min(100,rep.revenuePercent)+'%'}" /></div>
        <small>{{rep.plan?.revenueTarget?rep.revenuePercent+'% плана':'План не установлен'}}</small>
      </div>
      <div class="sales-plan-metric">
        <div><span>Посещения магазинов</span><strong>{{rep.visitsCount}} / {{rep.plan?.visitsTarget??0}}</strong></div>
        <div class="route-progress"><span :style="{width:Math.min(100,rep.visitPercent)+'%'}" /></div>
        <small>{{rep.plan?.visitsTarget?rep.visitPercent+'% плана':'План не установлен'}}</small>
      </div>
      <dl class="details-list">
        <div><dt>Уникальных точек с визитом</dt><dd>{{rep.closedOutlets}}</dd></div>
        <div><dt>Цель по охвату</dt><dd>{{rep.plan?.outletsTarget??0}}</dd></div>
        <div><dt>Примечание</dt><dd>{{rep.plan?.notes||'—'}}</dd></div>
      </dl>
      <router-link v-if="can(store.currentRole,'visits')" class="text-link" to="/visits">Посещения →</router-link>
    </SectionCard>
  </div>
  <div class="inline-notice">Планы не создают автоматически заказы или выручку. Для боевой аналитики потребуются 1С, правила расчёта продаж и распределение ответственности между представителями.</div>
  <ModalShell :open="editing" title="План торгового представителя" size="lg" @close="editing=false">
    <form class="stack-lg" @submit.prevent="save">
      <label class="field"><span>Сотрудник</span><input :value="sales.find(x=>x.id===selected)?.name" disabled /></label>
      <label class="field"><span>Месяц</span><input :value="edit.month" type="month" disabled /></label>
      <div class="form-grid">
        <label class="field"><span>Целевая выручка, ₸ *</span><input v-model.number="edit.revenueTarget" type="number" min="0" step="1" required /></label>
        <label class="field"><span>План визитов *</span><input v-model.number="edit.visitsTarget" type="number" min="0" step="1" required /></label>
        <label class="field"><span>Уникальных магазинов *</span><input v-model.number="edit.outletsTarget" type="number" min="0" step="1" required /></label>
        <label class="field field-wide"><span>Задачи на месяц</span><textarea v-model="edit.notes" rows="3" /></label>
      </div>
      <div v-if="error" class="form-error">{{error}}</div>
      <div class="form-footer"><button type="button" class="btn btn-secondary" @click="editing=false">Отмена</button><button class="btn btn-primary">Сохранить</button></div>
    </form>
  </ModalShell>
</template>
