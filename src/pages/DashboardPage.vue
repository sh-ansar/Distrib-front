<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import AppIcon from '@/components/ui/AppIcon.vue'
import MetricCard from '@/components/ui/MetricCard.vue'
import PageTitle from '@/components/ui/PageTitle.vue'
import SectionCard from '@/components/ui/SectionCard.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import { can } from '@/access'
import { useDistributionStore } from '@/stores/distribution'
import { dayOffset, debtBalance, displayDate, isOverdue, money, orderTotal, qty } from '@/utils/domain'
const store=useDistributionStore()
const outstanding=computed(()=>store.visibleDebts.reduce((sum,d)=>sum+debtBalance(d),0))
const overdue=computed(()=>store.visibleDebts.filter(d=>isOverdue(d)).reduce((sum,d)=>sum+debtBalance(d),0))
const openOrders=computed(()=>store.visibleOrders.filter(o=>!['delivered','cancelled','partial'].includes(o.status)))
const shipments=computed(()=>store.visibleOrders.filter(o=>o.deliveryDate===dayOffset(0) && ['ready','in_route','delivered'].includes(o.status)))
const recentOrders=computed(()=>[...store.visibleOrders].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,6))
const routesToday=computed(()=>store.visibleRoutes.filter(r=>r.date===dayOffset(0)))
const riskCustomers=computed(()=>store.visibleCustomers.map(c=>{
  const debts=store.visibleDebts.filter(d=>d.customerId===c.id)
  return {...c,balance:debts.reduce((s,d)=>s+debtBalance(d),0),
    overdue:debts.filter(d=>isOverdue(d)).reduce((s,d)=>s+debtBalance(d),0)}
}).filter(c=>c.overdue>0||c.status==='on_hold').sort((a,b)=>b.overdue-a.overdue).slice(0,5))
const week=computed(()=>{
  const days=Array.from({length:7},(_,index)=>dayOffset(index-6))
  return days.map(date=>({date,label:new Intl.DateTimeFormat('ru-RU',{weekday:'short'}).format(new Date(date+'T12:00:00')),
    amount:store.visibleOrders.filter(o=>o.createdAt===date).reduce((s,o)=>s+orderTotal(o),0)}))
})
const maxWeek=computed(()=>Math.max(1,...week.value.map(d=>d.amount)))
const todayLabel=computed(()=>new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric'}).format(new Date()))
</script>
<template>
  <PageTitle eyebrow="РАБОЧАЯ ПАНЕЛЬ" title="Обзор дистрибуции" :subtitle="'Оперативная картина на '+todayLabel">
    <RouterLink v-if="can(store.currentRole,'orders')" class="btn btn-secondary" to="/orders"><AppIcon name="clipboard-list" :size="17" /> Все заявки</RouterLink>
    <RouterLink v-if="can(store.currentRole,'routes')" class="btn btn-primary" to="/routes"><AppIcon name="truck" :size="17" /> Рейсы</RouterLink>
  </PageTitle>
  <div class="metrics-grid">
    <MetricCard label="Активные заявки" :value="qty(openOrders.length)" icon="clipboard-list" hint="Ожидают выполнения" to="/orders" />
    <MetricCard v-if="can(store.currentRole,'debts')" label="Дебиторская задолженность" :value="money(outstanding)" icon="wallet" hint="Открытые расчёты · демо" to="/debts" />
    <MetricCard v-if="can(store.currentRole,'debts')" label="Просроченные платежи" :value="money(overdue)" icon="alert-triangle" tone="danger" hint="Требуют внимания" to="/debts" />
    <MetricCard v-if="can(store.currentRole,'routes')" label="Рейсы сегодня" :value="qty(routesToday.length)" icon="truck" :hint="routesToday.filter(r=>r.status==='active').length+' в пути'" to="/routes" />
    <MetricCard v-else label="Доставки сегодня" :value="qty(shipments.length)" icon="truck" hint="По доступным заявкам" />
  </div>

  <div class="dashboard-layout">
    <div class="dashboard-main">
      <SectionCard title="Заявки за 7 дней" description="Объём созданных заявок по дням · демоданные">
        <div class="chart-heading"><strong>{{money(week.reduce((s,d)=>s+d.amount,0))}}</strong><span class="muted small">Всего за период</span></div>
        <div class="bar-chart" aria-label="График сумм созданных заявок за 7 дней">
          <div v-for="(day,index) in week" :key="day.date" class="bar-chart-column">
            <div class="bar-track" :title="day.date+' · '+money(day.amount)">
              <div class="bar-fill" :class="{'bar-today':index===6}" :style="{height:Math.max(day.amount>0?6:0,day.amount/maxWeek*100)+'%'}" />
            </div>
            <span>{{day.label}}</span>
          </div>
        </div>
      </SectionCard>
      <SectionCard title="Последние заявки" description="Состояние заказов и ближайшие доставки" :flush="true">
        <template #action><RouterLink v-if="can(store.currentRole,'orders')" class="text-link" to="/orders">Смотреть все <AppIcon name="arrow-right" :size="15" /></RouterLink></template>
        <div v-for="order in recentOrders" :key="order.id" class="compact-list-row">
          <div class="list-item-icon"><AppIcon name="package" :size="19" /></div>
          <div class="list-row-content"><strong>{{store.data.outlets.find(o=>o.id===order.outletId)?.name}}</strong><span>{{order.number}} · доставка {{displayDate(order.deliveryDate)}}</span></div>
          <span class="money-cell">{{money(orderTotal(order))}}</span><StatusBadge :status="order.status" />
        </div>
        <p v-if="!recentOrders.length" class="muted padded">Заявок пока нет.</p>
      </SectionCard>
    </div>
    <div class="dashboard-aside">
      <SectionCard title="На контроле" description="Просроченные оплаты и блокировки" v-if="can(store.currentRole,'debts')">
        <div v-if="!riskCustomers.length" class="small muted">Нет просроченных задолженностей.</div>
        <RouterLink v-for="customer in riskCustomers" :key="customer.id" class="risk-row" :to="'/outlets?customer='+customer.id">
          <span class="risk-avatar"><AppIcon name="alert-circle" :size="18" /></span>
          <span class="risk-copy"><strong>{{customer.legalName}}</strong><small>{{customer.status==='on_hold'?'Отгрузки на паузе':'Просрочено: '+money(customer.overdue)}}</small></span>
          <AppIcon name="chevron-right" :size="17" />
        </RouterLink>
      </SectionCard>
      <SectionCard title="Доставка сегодня" description="Рейсы и обработка точек" v-if="can(store.currentRole,'routes')">
        <RouterLink v-for="r in routesToday" :key="r.id" class="route-overview-row" :to="'/routes/'+r.id">
          <div class="route-icon"><AppIcon name="truck" /></div><div class="list-row-content"><strong>{{r.number}}</strong><span>{{r.stops.filter(s=>s.status!=='pending').length}} из {{r.stops.length}} точек</span></div>
          <StatusBadge :status="r.status" />
        </RouterLink>
        <div v-if="!routesToday.length" class="muted small">На сегодня рейсов нет.</div>
      </SectionCard>
      <div class="tip-card"><span class="tip-icon"><AppIcon name="sparkles" /></span><h3>Единая картина бизнеса</h3><p>От заявки торгового представителя до подписанной накладной — каждая операция должна быть связана с карточкой магазина.</p><RouterLink to="/outlets">Открыть торговые точки <AppIcon name="arrow-right" :size="15" /></RouterLink></div>
    </div>
  </div>
</template>
