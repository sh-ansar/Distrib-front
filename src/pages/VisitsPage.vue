<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import AppIcon from '@/components/ui/AppIcon.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ModalShell from '@/components/ui/ModalShell.vue'
import PageTitle from '@/components/ui/PageTitle.vue'
import SectionCard from '@/components/ui/SectionCard.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import { can } from '@/access'
import { useDistributionStore } from '@/stores/distribution'
import { displayDate, isoDay } from '@/utils/domain'
import type { VisitStatus } from '@/types/domain'
import { planWorkingVisits } from '@/utils/visitPlanner'
const store=useDistributionStore()
const route=useRoute()
const search=ref('')
const day=ref(String(route.query.date??isoDay()))
const focusedOutlet=ref(String(route.query.outlet??''))
const status=ref('')
const repId=ref('')
const showNew=ref(false)
const showPlanner=ref(false)
const plannerStart=ref(isoDay())
const plannerLimit=ref(6)
const plannerRep=ref('')
const outcomeId=ref('')
const outcome=ref<'completed'|'skipped'>('completed')
const outcomeNotes=ref('')
const error=ref('')
const form=reactive({outletId:'',plannedDate:isoDay(),purpose:'Плановый визит: проверить остатки и собрать заявку'})
watch(()=>route.query.date,v=>{day.value=String(v??isoDay())})
watch(()=>route.query.outlet,v=>{focusedOutlet.value=String(v??'')})
const all=computed(()=>store.visibleVisits)
const visits=computed(()=>all.value.filter(v=>{
  const outlet=store.data.outlets.find(o=>o.id===v.outletId)
  const customer=store.data.customers.find(c=>c.id===outlet?.customerId)
  return (!focusedOutlet.value||v.outletId===focusedOutlet.value)&&(!day.value||v.plannedDate===day.value)&&(!status.value||v.status===status.value)&&
    (!repId.value||v.repId===repId.value)&&[outlet?.name,outlet?.address,customer?.legalName,v.purpose,v.notes].join(' ').toLowerCase().includes(search.value.toLowerCase())
}).sort((a,b)=>a.plannedDate.localeCompare(b.plannedDate)||a.status.localeCompare(b.status)))
const byDay=computed(()=>all.value.filter(v=>(!focusedOutlet.value||v.outletId===focusedOutlet.value)&&(!day.value||v.plannedDate===day.value)))
const dayTotal=computed(()=>byDay.value.length)
const completed=computed(()=>byDay.value.filter(v=>v.status==='completed').length)
const skipped=computed(()=>byDay.value.filter(v=>v.status==='skipped').length)
const unfinished=computed(()=>byDay.value.filter(v=>['planned','in_progress'].includes(v.status)).length)
const reps=computed(()=>store.data.employees.filter(e=>e.role==='sales'&&e.active&&store.visibleOutlets.some(o=>o.repId===e.id)))
const selected=computed(()=>store.visibleVisits.find(v=>v.id===outcomeId.value))
watch(()=>form.outletId,()=>{error.value=''})
function outletName(id:string){return store.data.outlets.find(o=>o.id===id)?.name||'Неизвестная точка'}
function address(id:string){return store.data.outlets.find(o=>o.id===id)?.address||'Адрес не указан'}
function repName(id:string){return store.data.employees.find(e=>e.id===id)?.name||'Без представителя'}
function openNew(){
  error.value=''
  form.plannedDate=day.value>=isoDay()?day.value:isoDay()
  form.outletId=''
  showNew.value=true
}
function createVisit(){
  error.value=''
  try{
    store.createVisit({...form})
    showNew.value=false
    day.value=form.plannedDate
    store.notify('Визит запланирован.')
  }catch(e){error.value=e instanceof Error?e.message:'Не удалось создать визит.'}
}
function startVisit(id:string){
  try{store.startVisit(id);store.notify('Визит начат.')}
  catch(e){store.notify(e instanceof Error?e.message:'Не удалось начать визит.','error')}
}
function finishOpen(id:string,kind:'completed'|'skipped'){
  outcomeId.value=id;outcome.value=kind;outcomeNotes.value='';error.value=''
}
function finish(){
  error.value=''
  try{
    if(!selected.value)throw new Error('Визит не найден.')
    store.finishVisit(selected.value.id,outcome.value,outcomeNotes.value)
    outcomeId.value=''
    store.notify(outcome.value==='completed'?'Визит завершён.':'Пропуск визита зафиксирован.')
  }catch(e){error.value=e instanceof Error?e.message:'Не удалось завершить визит.'}
}
const report=computed(()=>{
  const total=dayTotal.value
  return total?Math.round(100*completed.value/total):0
})
const plannerReps=computed(()=>{
  const ids=new Set(store.visibleOutlets.map(o=>o.repId))
  return store.data.employees.filter(e=>e.role==='sales'&&e.active&&ids.has(e.id))
})
const plannerPlan=computed(()=>{
  try{return planWorkingVisits({
    outlets:store.visibleOutlets,visits:store.visibleVisits,
    startDate:plannerStart.value,dailyLimit:plannerLimit.value,repId:plannerRep.value,
  })}catch{return {dates:[] as string[],proposals:[] as ReturnType<typeof planWorkingVisits>['proposals']}}
})
const plannerError=computed(()=>{
  if(!/^\d{4}-\d{2}-\d{2}$/.test(plannerStart.value) || !plannerPlan.value.dates.length)return 'Проверьте дату начала и дневной лимит.'
  if(!plannerPlan.value.proposals.length)return 'Все доступные места заняты или торговые точки уже включены в план.'
  return ''
})
function openPlanner(){
  plannerStart.value=day.value>=isoDay()?day.value:isoDay()
  plannerRep.value=store.currentRole==='sales'?store.currentUserId:repId.value
  // Preserve the user's selected daily limit when reopening the preview.
  error.value=''
  showPlanner.value=true
}
function savePlanner(){
  error.value=''
  try{
    const proposals=plannerPlan.value.proposals
    if(!proposals.length)throw new Error('Нет новых визитов для сохранения.')
    const created=store.createVisitsBatch({items:proposals.map(p=>({
      outletId:p.outletId,plannedDate:p.plannedDate,purpose:p.purpose,
    })),dailyLimit:plannerLimit.value})
    showPlanner.value=false
    day.value=plannerPlan.value.dates[0]||day.value
    store.notify('План сохранён: '+created.length+' визитов на пять рабочих дней.')
  }catch(e){error.value=e instanceof Error?e.message:'Не удалось сохранить план визитов.'}
}
const statuses:Record<VisitStatus,string>={planned:'Запланирован',in_progress:'В работе',completed:'Завершён',skipped:'Не состоялся'}
</script>
<template>
  <PageTitle eyebrow="ПОЛЕВАЯ КОМАНДА" title="Визиты торговых представителей" subtitle="Планирование посещений магазинов, итоги встреч и история работы с точками">
    <button v-if="can(store.currentRole,'visits:edit')" class="btn btn-secondary" @click="openPlanner"><AppIcon name="calendar-days" :size="18" /> План на неделю</button>
    <button v-if="can(store.currentRole,'visits:edit')" class="btn btn-primary" @click="openNew"><AppIcon name="plus" :size="18" /> Запланировать визит</button>
  </PageTitle>
  <div class="metrics-grid">
    <div class="metric-card"><div class="metric-top">Визитов за день <AppIcon name="calendar-days" :size="20" /></div><div class="metric-value">{{dayTotal}}</div><div class="metric-hint">В выбранную дату</div></div>
    <div class="metric-card"><div class="metric-top">Выполнено <AppIcon name="check-circle-2" :size="20" /></div><div class="metric-value">{{completed}}</div><div class="metric-hint">Подтверждённых визитов</div></div>
    <div class="metric-card"><div class="metric-top">Ожидают <AppIcon name="clock-3" :size="20" /></div><div class="metric-value">{{unfinished}}</div><div class="metric-hint">Плановые и текущие</div></div>
    <div class="metric-card"><div class="metric-top">Не состоялись <AppIcon name="alert-triangle" :size="20" /></div><div class="metric-value">{{skipped}}</div><div class="metric-hint">Есть причина пропуска</div></div>
  </div>
  <div class="visits-layout">
    <SectionCard title="План посещений" description="У каждого визита есть торговая точка, представитель и подтверждённый результат">
      <div v-if="focusedOutlet" class="control-visit-focus"><span>Фильтр магазина: {{outletName(focusedOutlet)}}</span><button type="button" @click="focusedOutlet=''">Показать все точки</button></div>
    <div class="table-toolbar" style="margin:-5px -3px 20px;border:1px solid var(--line);border-radius:9px">
        <label class="search-control"><AppIcon name="search" :size="17" /><input v-model="search" placeholder="Поиск магазина или цели" aria-label="Поиск визитов" /></label>
        <input v-model="day" type="date" aria-label="Дата визитов" class="btn btn-secondary" style="max-width:180px" />
        <select v-model="status" aria-label="Статус визита"><option value="">Все статусы</option><option v-for="(label,key) in statuses" :key="key" :value="key">{{label}}</option></select>
        <select v-if="reps.length>1" v-model="repId" aria-label="Торговый представитель"><option value="">Все представители</option><option v-for="rep in reps" :key="rep.id" :value="rep.id">{{rep.name}}</option></select>
      </div>
      <div v-if="visits.length" class="visit-list">
        <article v-for="visit in visits" :key="visit.id" class="visit-item">
          <span class="visit-symbol" :class="'visit-symbol-'+visit.status"><AppIcon :name="visit.status==='completed'?'check-circle-2':visit.status==='skipped'?'alert-circle':'map-pin'" :size="19" /></span>
          <div class="visit-content">
            <div class="visit-content-top"><RouterLink class="text-link" :to="'/outlets/'+visit.outletId"><strong>{{outletName(visit.outletId)}}</strong> <AppIcon name="arrow-up-right" :size="14" /></RouterLink><StatusBadge :status="visit.status" :label="statuses[visit.status]" /></div>
            <p class="visit-purpose">{{visit.purpose}}</p>
            <div class="visit-meta"><span><AppIcon name="map-pin" :size="14" /> {{address(visit.outletId)}}</span><span><AppIcon name="user-round" :size="14" /> {{repName(visit.repId)}}</span><span><AppIcon name="calendar-days" :size="14" /> {{displayDate(visit.plannedDate)}}</span></div>
            <p v-if="visit.notes" class="visit-note">{{visit.notes}}</p>
            <div v-if="can(store.currentRole,'visits:edit')" class="visit-actions">
              <button v-if="visit.status==='planned'&&visit.plannedDate<=isoDay()" class="btn btn-secondary btn-sm" type="button" @click="startVisit(visit.id)"><AppIcon name="check" :size="15" /> Начать визит</button>
              <button v-if="visit.status==='in_progress'" class="btn btn-primary btn-sm" type="button" @click="finishOpen(visit.id,'completed')">Завершить визит</button>
              <button v-if="visit.status==='planned'||visit.status==='in_progress'" class="btn btn-ghost btn-sm" type="button" @click="finishOpen(visit.id,'skipped')">Не состоялся</button>
              <RouterLink v-if="can(store.currentRole,'orders:edit')" class="btn btn-secondary btn-sm" :to="'/outlets/'+visit.outletId"><AppIcon name="clipboard-list" :size="15" /> Заявки точки</RouterLink>
            </div>
          </div>
        </article>
      </div>
      <EmptyState v-else icon="calendar-days" title="Визитов не найдено" description="Измените дату и фильтры или запланируйте новый визит." />
    </SectionCard>
    <div class="stack-lg">
      <SectionCard title="Исполнение плана" description="Статусы посещений на выбранную дату">
        <div class="visits-summary">
          <div class="visits-summary-row"><span>Выполнено</span><strong>{{completed}}</strong></div>
          <div class="visits-summary-row"><span>Не состоялись</span><strong>{{skipped}}</strong></div>
          <div class="visits-summary-row"><span>В работе / ожидают</span><strong>{{unfinished}}</strong></div>
        </div>
        <div class="visit-progress"><span :style="{width:report+'%'}" /></div>
        <span class="visit-progress-caption">Выполнение плана: {{report}}%</span>
      </SectionCard>
      <SectionCard title="Для торгового представителя" description="Последовательный процесс посещения">
        <div class="steps-grid" style="grid-template-columns:1fr 1fr">
          <div><span>01</span><strong>Открыть визит</strong><p>Проверить магазин, историю заказов и долг.</p></div>
          <div><span>02</span><strong>Проверить остатки</strong><p>Уточнить потребность в ассортименте.</p></div>
          <div><span>03</span><strong>Собрать заявку</strong><p>Оформить заказ в карточке магазина.</p></div>
          <div><span>04</span><strong>Закрыть визит</strong><p>Зафиксировать результат и комментарий.</p></div>
        </div>
      </SectionCard>
      <div class="inline-notice"><AppIcon name="info" :size="18" /><div><strong>GPS и фотоотчёты пока не включены</strong><p>В демо не собираются координаты сотрудников. Геоотметки и фотографии требуют согласованных правил хранения и прав доступа.</p></div></div>
    </div>
  </div>
  <ModalShell :open="showPlanner" title="План визитов на пять рабочих дней" subtitle="Предпросмотр без изменения данных до подтверждения" size="lg" @close="showPlanner=false">
    <form class="stack-lg" @submit.prevent="savePlanner">
      <div class="form-grid">
        <label class="field"><span>Начало периода</span><input v-model="plannerStart" type="date" :min="isoDay()" required /></label>
        <label class="field"><span>Визитов в день на сотрудника</span><input v-model.number="plannerLimit" type="number" min="1" max="12" step="1" required /></label>
        <label v-if="plannerReps.length>1&&store.currentRole!=='sales'" class="field field-wide"><span>Торговый представитель</span>
          <select v-model="plannerRep"><option value="">Вся торговая команда</option><option v-for="rep in plannerReps" :key="rep.id" :value="rep.id">{{rep.name}}</option></select>
        </label>
      </div>
      <p class="muted small">Рабочие дни: понедельник–пятница. Группировка по району условная, без расчёта расстояний и времени в пути. Существующие визиты не меняются, повторные точки не назначаются.</p>
      <div class="planner-summary">
        <div><strong>{{plannerPlan.proposals.length}}</strong><span>Новых визитов</span></div>
        <div><strong>{{new Set(plannerPlan.proposals.map(p=>p.repId)).size}}</strong><span>Представителей</span></div>
        <div><strong>{{plannerPlan.dates.length}}</strong><span>Рабочих дней</span></div>
      </div>
      <div v-if="plannerPlan.dates.length" class="planner-days">
        <div v-for="date in plannerPlan.dates" :key="date">
          <strong>{{displayDate(date)}}</strong>
          <span>{{plannerPlan.proposals.filter(p=>p.plannedDate===date).length}} новых визитов</span>
        </div>
      </div>
      <div v-if="plannerPlan.proposals.length" class="planner-preview">
        <strong>Предварительный список — первые 15 точек</strong>
        <div v-for="proposal in plannerPlan.proposals.slice(0,15)" :key="proposal.outletId">
          <span>{{displayDate(proposal.plannedDate)}} · {{repName(proposal.repId)}}</span>
          <strong>{{proposal.outletName}}</strong>
          <small>{{proposal.district}}</small>
        </div>
        <p v-if="plannerPlan.proposals.length>15" class="muted small">Ещё {{plannerPlan.proposals.length-15}} точек будут добавлены после подтверждения.</p>
      </div>
      <p v-if="plannerError" class="inline-notice" role="status">{{plannerError}}</p>
      <p v-if="error" class="form-error" role="alert">{{error}}</p>
      <div class="form-footer">
        <button type="button" class="btn btn-secondary" @click="showPlanner=false">Отмена</button>
        <button type="submit" class="btn btn-primary" :disabled="!plannerPlan.proposals.length||!!plannerError">Сохранить {{plannerPlan.proposals.length}} визитов</button>
      </div>
    </form>
  </ModalShell>
  <ModalShell :open="showNew" title="Новый визит" subtitle="Назначьте посещение магазина и цель работы" @close="showNew=false">
    <form class="stack-lg" @submit.prevent="createVisit">
      <label class="field"><span>Торговая точка *</span><select v-model="form.outletId" required><option value="">Выберите магазин</option><option v-for="o in store.visibleOutlets.filter(o=>o.active)" :key="o.id" :value="o.id">{{o.name}} · {{o.district}}</option></select></label>
      <label class="field"><span>Дата визита *</span><input v-model="form.plannedDate" type="date" :min="isoDay()" required /></label>
      <label class="field"><span>Цель визита *</span><textarea v-model="form.purpose" rows="3" required /></label>
      <div class="inline-notice"><AppIcon name="info" :size="17" /> Представитель назначается по карточке магазина. На одну дату можно создать только один активный визит в эту точку.</div>
      <div v-if="error" class="form-error" role="alert">{{error}}</div>
      <div class="form-footer"><button type="button" class="btn btn-secondary" @click="showNew=false">Отмена</button><button type="submit" class="btn btn-primary">Запланировать</button></div>
    </form>
  </ModalShell>
  <ModalShell :open="!!selected" :title="outcome==='completed'?'Завершить визит':'Отметить пропуск'" subtitle="Итог сохраняется в истории торговой точки" @close="outcomeId=''">
    <form class="stack-lg" @submit.prevent="finish">
      <div v-if="selected" class="money-summary"><span>Магазин</span><strong>{{outletName(selected.outletId)}}</strong></div>
      <label class="field"><span>{{outcome==='completed'?'Результат встречи *':'Причина пропуска *'}}</span><textarea v-model="outcomeNotes" rows="4" minlength="5" required placeholder="Опишите результат, договорённости или причину пропуска..." /></label>
      <div v-if="error" class="form-error" role="alert">{{error}}</div>
      <div class="form-footer"><button type="button" class="btn btn-secondary" @click="outcomeId=''">Отмена</button><button type="submit" class="btn btn-primary">Сохранить результат</button></div>
    </form>
  </ModalShell>
</template>
