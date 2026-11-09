<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '@/components/ui/AppIcon.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ModalShell from '@/components/ui/ModalShell.vue'
import PageTitle from '@/components/ui/PageTitle.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import { can } from '@/access'
import { useDistributionStore } from '@/stores/distribution'
import { displayDate, money, orderTotal, phoneLink } from '@/utils/domain'
import { routeProgress } from '@/utils/routeProgress'
import type { RouteStatus, StopStatus } from '@/types/domain'

const store=useDistributionStore()
const currentUrl=useRoute()
const router=useRouter()
const allRoutes=computed(()=>[...store.visibleRoutes].sort((a,b)=>
  Number(b.status==='active')-Number(a.status==='active')||b.date.localeCompare(a.date)))
const selected=computed(()=>allRoutes.value.find(r=>r.id===currentUrl.query.route)||allRoutes.value[0])
const progress=computed(()=>selected.value?routeProgress(selected.value):null)
const stops=computed(()=>[...(selected.value?.stops??[])].sort((a,b)=>a.position-b.position))
const lastArrival=computed(()=>stops.value.filter(s=>s.arrivedAt).sort((a,b)=>(b.arrivedAt||'').localeCompare(a.arrivedAt||''))[0])
const nextStatus=computed<RouteStatus|null>(()=>selected.value?.status==='planned'?'loading':selected.value?.status==='loading'?'active':selected.value?.status==='active'?'completed':null)
const nextLabel=computed(()=>nextStatus.value==='loading'?'Начать загрузку':nextStatus.value==='active'?'Выехать':nextStatus.value==='completed'?'Завершить рейс':'')
const editAllowed=computed(()=>can(store.currentRole,'routes:edit'))
const selectedStopId=ref('')
const form=reactive<{outcome:Exclude<StopStatus,'pending'>;notes:string;receivedBy:string}>({
  outcome:'delivered',notes:'',receivedBy:'',
})
const error=ref('')
const editingStop=computed(()=>stops.value.find(s=>s.id===selectedStopId.value))
function selectRoute(event:Event){router.replace({path:'/delivery',query:{route:(event.target as HTMLSelectElement).value}})}
function outlet(id:string){return store.data.outlets.find(o=>o.id===id)}
function customerName(outletId:string){
  return store.data.customers.find(c=>c.id===outlet(outletId)?.customerId)?.legalName||'Компания'
}
function employeeName(id?:string){return store.data.employees.find(e=>e.id===id)?.name||'Не назначен'}
function orderTotalByStop(ids:string[]){
  return ids.reduce((sum,id)=>{const order=store.data.orders.find(o=>o.id===id);return sum+(order?orderTotal(order):0)},0)
}
function proofCount(stopId:string){return store.data.documents.filter(d=>d.entityType==='stop'&&d.entityId===stopId).length}
function timestamp(v?:string){return v?new Date(v).toLocaleString('ru-RU',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}):'Не отмечено'}
function changeStage(){
  if(!selected.value||!nextStatus.value)return
  try{store.moveRoute(selected.value.id,nextStatus.value);store.notify('Этап рейса обновлён.')}
  catch(e){store.notify(e instanceof Error?e.message:'Не удалось обновить рейс.','error')}
}
function arrive(id:string){
  if(!selected.value)return
  try{store.arriveStop(selected.value.id,id);store.notify('Прибытие отмечено вручную.')}
  catch(e){store.notify(e instanceof Error?e.message:'Не удалось отметить прибытие.','error')}
}
function openResult(id:string){
  selectedStopId.value=id
  Object.assign(form,{outcome:'delivered',notes:'',receivedBy:''})
  error.value=''
}
function saveResult(){
  error.value=''
  if(!selected.value||!editingStop.value)return
  try{
    store.finishStop(selected.value.id,editingStop.value.id,form.outcome,form.notes,form.receivedBy)
    selectedStopId.value=''
    store.notify('Итог по точке сохранён. Контроль рейса обновлён.')
  }catch(e){error.value=e instanceof Error?e.message:'Не удалось сохранить доставку.'}
}
</script>

<template>
  <PageTitle title="Моя доставка" subtitle="Рейс, остановки, прибытие и подтверждение результата без лишних экранов">
    <router-link class="btn btn-secondary" to="/routes"><AppIcon name="route" :size="16"/> Все рейсы</router-link>
  </PageTitle>
  <div v-if="!selected" class="delivery-empty"><EmptyState icon="truck" title="Назначенных рейсов нет" description="Когда диспетчер назначит рейс, его маршрут появится здесь." /></div>
  <template v-else>
    <div class="delivery-toolbar">
      <label class="field">
        <span>Выберите рейс</span>
        <select :value="selected.id" aria-label="Рейс доставки" @change="selectRoute">
          <option v-for="item in allRoutes" :key="item.id" :value="item.id">{{item.number}} · {{displayDate(item.date)}} · {{item.status==='active'?'В пути':item.status==='completed'?'Завершён':'Ожидает'}}</option>
        </select>
      </label>
      <router-link :to="'/routes/'+selected.id" class="text-link delivery-detail-link">Полный маршрутный лист <AppIcon name="chevron-right" :size="16"/></router-link>
    </div>
    <div class="delivery-route-header">
      <div class="delivery-route-heading">
        <div><span class="eyebrow">{{displayDate(selected.date)}}</span><h2>{{selected.number}}</h2></div>
        <StatusBadge :status="selected.status" />
      </div>
      <div class="delivery-route-facts">
        <div><span>Водитель</span><strong>{{employeeName(selected.driverId)}}</strong></div>
        <div><span>Экспедитор</span><strong>{{employeeName(selected.forwarderId)}}</strong></div>
        <div><span>Автомобиль</span><strong>{{store.data.vehicles.find(v=>v.id===selected.vehicleId)?.plate||'—'}}</strong></div>
        <div><span>Обработано точек</span><strong>{{progress?.completed}} / {{progress?.total}}</strong></div>
      </div>
      <div class="route-progress"><span :style="{width:(progress?.percent||0)+'%'}" /></div>
      <div class="delivery-route-footer">
        <p v-if="lastArrival"><AppIcon name="map-pin" :size="14"/> Последнее прибытие: {{timestamp(lastArrival.arrivedAt)}}</p>
        <p v-else><AppIcon name="info" :size="14"/> Прибытий пока не отмечено</p>
        <button v-if="editAllowed&&nextStatus" class="btn btn-primary" type="button"
          :disabled="nextStatus==='completed'&&(progress?.pending||0)>0" @click="changeStage">{{nextLabel}}</button>
      </div>
    </div>

    <div v-if="progress?.next" class="delivery-next">
      <AppIcon name="map-pin" :size="18"/>
      <div><strong>Следующая точка: {{outlet(progress.next.outletId)?.name}}</strong>
        <small>{{outlet(progress.next.outletId)?.address}}</small></div>
    </div>
    <div v-else class="delivery-next delivery-done">
      <AppIcon name="check-circle-2" :size="18"/>
      <div><strong>Все торговые точки обработаны</strong><small>Если были отказы и частичные поставки, проверьте причины и возвраты.</small></div>
    </div>

    <section class="delivery-stops" aria-labelledby="delivery-stops-title">
      <div class="delivery-stops-head"><h2 id="delivery-stops-title">Точки маршрута</h2><span>{{stops.length}} адресов</span></div>
      <article v-for="stop in stops" :key="stop.id" class="delivery-stop-card"
        :class="{'is-next':progress?.next?.id===stop.id,'is-done':stop.status!=='pending'}">
        <div class="delivery-stop-heading">
          <span class="delivery-stop-number">{{stop.position}}</span>
          <div><h3>{{outlet(stop.outletId)?.name||'Торговая точка'}}</h3><p>{{customerName(stop.outletId)}}</p></div>
          <StatusBadge :status="stop.status" />
        </div>
        <p class="delivery-stop-address"><AppIcon name="map-pin" :size="16"/>{{outlet(stop.outletId)?.address||'Адрес не указан'}}</p>
        <div class="delivery-stop-facts">
          <div><span>Приёмка</span><strong>{{outlet(stop.outletId)?.receivingWindow||'Уточнить'}}</strong></div>
          <div><span>Заказов</span><strong>{{stop.orderIds.length}}</strong></div>
          <div><span>Сумма</span><strong>{{money(orderTotalByStop(stop.orderIds))}}</strong></div>
        </div>
        <p v-if="outlet(stop.outletId)?.accessInstructions" class="delivery-stop-instructions">{{outlet(stop.outletId)?.accessInstructions}}</p>
        <div class="delivery-stop-events">
          <span><AppIcon name="clock-3" :size="14"/> Прибытие: {{timestamp(stop.arrivedAt)}}</span>
          <span v-if="stop.completedAt"><AppIcon name="check-circle-2" :size="14"/> Итог: {{timestamp(stop.completedAt)}}</span>
          <span v-if="stop.receivedBy"><AppIcon name="user-round" :size="14"/> Принял: {{stop.receivedBy}}</span>
          <span v-if="stop.notes">{{stop.notes}}</span>
        </div>
        <div class="delivery-stop-actions">
          <a v-if="outlet(stop.outletId)?.phone" class="btn btn-secondary" :href="phoneLink(outlet(stop.outletId)?.phone||'')">
            <AppIcon name="phone" :size="16"/> Позвонить</a>
          <button v-if="editAllowed&&selected.status==='active'&&stop.status==='pending'&&!stop.arrivedAt"
            type="button" class="btn btn-secondary" @click="arrive(stop.id)">
            <AppIcon name="map-pin" :size="16"/> Я прибыл
          </button>
          <button v-if="editAllowed&&selected.status==='active'&&stop.status==='pending'&&stop.arrivedAt"
            type="button" class="btn btn-primary" @click="openResult(stop.id)">
            <AppIcon name="clipboard-check" :size="16"/> Результат доставки
          </button>
          <router-link v-if="can(store.currentRole,'documents')" class="btn btn-secondary"
            :to="'/documents?stop='+encodeURIComponent(stop.id)">
            <AppIcon name="file-image" :size="16"/> Накладная{{proofCount(stop.id)?' ('+proofCount(stop.id)+')':''}}
          </router-link>
        </div>
        <div v-if="stop.status==='partial'||stop.status==='failed'" class="delivery-stop-warning">
          <AppIcon name="alert-circle" :size="15"/> Нужна сверка возврата и накладной с учётом склада.
        </div>
      </article>
    </section>
    <p class="delivery-disclaimer">Прибытие отмечается вручную и не подтверждает GPS-координаты. Итог доставки не является электронной подписью. Фото/PDF доступны только для локального просмотра и не хранятся после закрытия формы.</p>
  </template>

  <ModalShell :open="!!editingStop" title="Результат доставки" subtitle="Сохраните исход визита и имя получателя (необязательно)" @close="selectedStopId=''">
    <form class="stack-lg" @submit.prevent="saveResult">
      <div class="delivery-result-outlet">{{outlet(editingStop?.outletId||'')?.name||'Торговая точка'}}</div>
      <label class="field"><span>Итог *</span>
        <select v-model="form.outcome" aria-label="Итог доставки">
          <option value="delivered">Доставлено полностью</option>
          <option value="partial">Доставлено частично</option>
          <option value="failed">Не доставлено / отказ</option>
        </select>
      </label>
      <label v-if="form.outcome!=='failed'" class="field">
        <span>Кто принял груз</span><input v-model="form.receivedBy" maxlength="120" placeholder="Контакт получателя" />
      </label>
      <label class="field"><span>{{form.outcome==='delivered'?'Комментарий':'Причина, неполученные позиции и детали *'}}</span>
        <textarea v-model="form.notes" rows="3" :required="form.outcome!=='delivered'" placeholder="Например: часть товара не приняли из-за брака" />
      </label>
      <p class="delivery-disclaimer">Частичная и несостоявшаяся поставка не изменяет автоматически количество отгруженных товаров. После оформления требуется ручная складская сверка.</p>
      <div v-if="error" role="alert" class="form-error">{{error}}</div>
      <div class="form-footer"><button type="button" class="btn btn-secondary" @click="selectedStopId=''">Отмена</button>
        <button type="submit" class="btn btn-primary">Сохранить итог</button></div>
    </form>
  </ModalShell>
</template>
