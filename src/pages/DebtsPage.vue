<script setup lang="ts">
import { computed, ref } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import MetricCard from '@/components/ui/MetricCard.vue'
import ModalShell from '@/components/ui/ModalShell.vue'
import PageTitle from '@/components/ui/PageTitle.vue'
import SectionCard from '@/components/ui/SectionCard.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import UiTable from '@/components/ui/UiTable.vue'
import { can } from '@/access'
import { useDistributionStore } from '@/stores/distribution'
import { dayOffset, debtBalance, displayDate, isOverdue, money } from '@/utils/domain'
const store=useDistributionStore()
const search=ref('')
const filter=ref('unpaid')
const selectedId=ref('')
const payment=ref<number>(0)
const error=ref('')
const selected=computed(()=>store.visibleDebts.find(d=>d.id===selectedId.value))
const balances=computed(()=>store.visibleDebts.filter(d=>debtBalance(d)>0))
const total=computed(()=>balances.value.reduce((s,d)=>s+debtBalance(d),0))
const overdue=computed(()=>balances.value.filter(d=>isOverdue(d)).reduce((s,d)=>s+debtBalance(d),0))
const overdue30=computed(()=>balances.value.filter(d=>isOverdue(d)&&d.dueAt<dayOffset(-30)).reduce((s,d)=>s+debtBalance(d),0))
const rows=computed(()=>store.visibleDebts.filter(d=>{
  const customer=store.data.customers.find(c=>c.id===d.customerId)
  const match=[d.invoice,customer?.legalName].join(' ').toLowerCase().includes(search.value.toLowerCase())
  return match&&((filter.value==='all'||(filter.value==='overdue'?isOverdue(d):debtBalance(d)>0)))
}).map(d=>({...d,customer:store.data.customers.find(c=>c.id===d.customerId)?.legalName||'—',balance:debtBalance(d),overdue:isOverdue(d)}))
  .sort((a,b)=>Number(b.overdue)-Number(a.overdue)||a.dueAt.localeCompare(b.dueAt)))
const columns=[
  {key:'invoice',label:'Документ',sortable:true},{key:'customer',label:'Контрагент',sortable:true},
  {key:'issuedAt',label:'Реализация',sortable:true},{key:'dueAt',label:'Срок оплаты',sortable:true},
  {key:'amount',label:'Сумма документа',align:'right' as const},
  {key:'balance',label:'Остаток долга',align:'right' as const,sortable:true},{key:'overdue',label:'Состояние'},
]
function startPayment(id:string){selectedId.value=id;payment.value=0;error.value=''}
function pay(){
  error.value=''
  try{if(selected.value){store.registerPayment(selected.value.id,Number(payment.value));store.notify('Оплата отмечена в демонстрационных данных.');selectedId.value=''}}
  catch(e){error.value=e instanceof Error?e.message:'Не удалось зарегистрировать оплату.'}
}
function hold(id:string,shouldHold:boolean){
  try{store.setCustomerHold(id,shouldHold);store.notify(shouldHold?'Отгрузки приостановлены (демо).':'Приостановка снята (демо).')}
  catch(e){store.notify(e instanceof Error?e.message:'Недостаточно прав','error')}
}
const grouped=computed(()=>store.visibleCustomers.map(c=>{
  const debts=balances.value.filter(d=>d.customerId===c.id)
  return {...c,amount:debts.reduce((s,d)=>s+debtBalance(d),0),late:debts.filter(d=>isOverdue(d)).reduce((s,d)=>s+debtBalance(d),0)}
}).filter(c=>c.amount>0).sort((a,b)=>b.late-a.late))
</script>
<template>
  <PageTitle eyebrow="ФИНАНСОВЫЙ КОНТРОЛЬ" title="Дебиторская задолженность" subtitle="Просрочки, кредитные лимиты и условия платежей" />
  <div class="metrics-grid">
    <MetricCard label="Всего к оплате" :value="money(total)" icon="wallet" hint="Открытые суммы" />
    <MetricCard label="Просрочено" :value="money(overdue)" icon="alert-triangle" tone="danger" hint="Срок оплаты прошёл" />
    <MetricCard label="Просрочка свыше 30 дней" :value="money(overdue30)" icon="clock-3" tone="danger" hint="Особый контроль" />
    <MetricCard label="Клиентов с задолженностью" :value="String(grouped.length)" icon="users" hint="По юридическим лицам" />
  </div>
  <div class="two-col-layout">
    <SectionCard title="Документы расчётов" description="Демо-реестр финансовых документов" :flush="true">
      <div class="table-toolbar"><label class="search-control"><AppIcon name="search" :size="17" /><input v-model="search" placeholder="Документ или контрагент" aria-label="Поиск долгов" /></label><select v-model="filter" aria-label="Фильтр по задолженности"><option value="unpaid">Не оплачены</option><option value="overdue">Просрочены</option><option value="all">Все</option></select></div>
      <UiTable :rows="rows" :columns="columns" :page-size="10">
        <template #cell-invoice="{row}"><strong>{{row.invoice}}</strong></template>
        <template #cell-issuedAt="{row}">{{displayDate(row.issuedAt)}}</template>
        <template #cell-dueAt="{row}"><span :class="{'text-danger':row.overdue}">{{displayDate(row.dueAt)}}</span></template>
        <template #cell-amount="{row}">{{money(row.amount)}}</template>
        <template #cell-balance="{row}"><div class="cell-amount-action"><strong>{{money(row.balance)}}</strong><button v-if="can(store.currentRole,'debts:edit')&&row.balance>0" class="text-link" type="button" @click="startPayment(row.id)">Оплата</button></div></template>
        <template #cell-overdue="{row}"><StatusBadge :status="row.balance===0?'delivered':row.overdue?'failed':'planned'" :label="row.balance===0?'Оплачен':row.overdue?'Просрочен':'В срок'" /></template>
      </UiTable>
    </SectionCard>
    <SectionCard title="Риски по контрагентам" description="Приостановка отгрузок — только уполномоченным пользователем">
      <div v-for="c in grouped" :key="c.id" class="customer-risk">
        <div class="customer-risk-head"><div><strong>{{c.legalName}}</strong><small>Долг {{money(c.amount)}}</small></div><StatusBadge :status="c.status" :label="c.status==='on_hold'?'На паузе':'Активен'" /></div>
        <div class="customer-risk-meter"><span :style="{width:Math.min(100,c.creditLimit>0?100*c.amount/c.creditLimit:100)+'%'}" :class="{'high':c.amount>c.creditLimit}" /></div>
        <div class="risk-meter-label"><span>Лимит {{money(c.creditLimit)}}</span><span :class="{'text-danger':c.late>0}">Просрочка {{money(c.late)}}</span></div>
        <div v-if="can(store.currentRole,'debts:edit')" class="risk-actions"><button class="btn btn-ghost btn-sm" type="button" @click="hold(c.id,c.status!=='on_hold')">{{c.status==='on_hold'?'Возобновить отгрузки':'Приостановить отгрузки'}}</button></div>
      </div>
    </SectionCard>
  </div>
  <div class="inline-notice warn-notice"><AppIcon name="info" :size="18" /> В промышленной версии долги, оплаты и лимиты должны поступать из 1С. Кнопка «Оплата» сейчас меняет только вымышленные данные браузера, не проводит платёж.</div>
  <ModalShell :open="!!selected" :title="'Демо-оплата · '+(selected?.invoice||'')" subtitle="В 1С и банковские системы данные не отправляются" @close="selectedId=''">
    <form class="stack-lg" @submit.prevent="pay"><div class="money-summary"><span>Остаток задолженности</span><strong>{{money(selected?debtBalance(selected):0)}}</strong></div>
      <label class="field"><span>Сумма оплаты, ₸</span><input v-model.number="payment" type="number" :max="selected?debtBalance(selected):0" min="1" step="1" required /></label>
      <div v-if="error" class="form-error">{{error}}</div><div class="form-footer"><button class="btn btn-secondary" type="button" @click="selectedId=''">Отмена</button><button class="btn btn-primary" type="submit">Отметить в демо</button></div>
    </form>
  </ModalShell>
</template>
