<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import PageTitle from '@/components/ui/PageTitle.vue'
import SectionCard from '@/components/ui/SectionCard.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import { useDistributionStore } from '@/stores/distribution'
import { debtBalance, displayDate, isOverdue, money, orderTotal } from '@/utils/domain'
const store=useDistributionStore()
const route=useRoute()
const company=computed(()=>store.visibleCustomers.find(c=>c.id===String(route.params.id)))
const outlets=computed(()=>store.visibleOutlets.filter(o=>o.customerId===company.value?.id))
const orders=computed(()=>store.visibleOrders.filter(o=>o.customerId===company.value?.id).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)))
const debts=computed(()=>store.visibleDebts.filter(d=>d.customerId===company.value?.id).sort((a,b)=>a.dueAt.localeCompare(b.dueAt)))
const total=computed(()=>debts.value.reduce((sum,d)=>sum+debtBalance(d),0))
const overdue=computed(()=>debts.value.filter(d=>isOverdue(d)).reduce((sum,d)=>sum+debtBalance(d),0))
const docs=computed(()=>store.data.documents.filter(d=>d.entityType==='customer'&&d.entityId===company.value?.id))
</script>
<template>
  <div v-if="!company" class="stack-lg">
    <PageTitle title="Компания не найдена" subtitle="Проверьте адрес или права доступа." />
    <router-link class="text-link" to="/companies">Вернуться к компаниям</router-link>
  </div>
  <template v-else>
    <div class="detail-back"><router-link to="/companies">← К списку компаний</router-link></div>
    <PageTitle :title="company.legalName" :subtitle="'БИН '+company.bin" />
    <div class="detail-summary-grid company-facts">
      <div class="detail-stat"><span>Торговые точки</span><strong>{{outlets.length}}</strong></div>
      <div class="detail-stat"><span>Открытый долг</span><strong>{{money(total)}}</strong><small>Просрочено {{money(overdue)}}</small></div>
      <div class="detail-stat"><span>Кредитный лимит</span><strong>{{money(company.creditLimit)}}</strong><small>Отсрочка {{company.termsDays}} дней</small></div>
      <div class="detail-stat"><span>Статус</span><StatusBadge :status="company.status" :label="company.status==='active'?'Активна':'Приостановлена'" /></div>
    </div>
    <div class="company-detail-layout">
      <div class="stack-lg">
        <SectionCard title="Торговые точки" :description="outlets.length+' адресов доставки'">
          <router-link v-for="outlet in outlets" :key="outlet.id" :to="'/outlets/'+outlet.id" class="company-point-link">
            <strong>{{outlet.name}}</strong><span>{{outlet.address}}</span><small>{{store.data.employees.find(e=>e.id===outlet.repId)?.name||'Без представителя'}}</small>
          </router-link>
          <EmptyState v-if="!outlets.length" title="Нет магазинов" />
          <router-link class="text-link company-related" :to="'/outlets?customer='+company.id">Показать в реестре магазинов →</router-link>
        </SectionCard>
        <SectionCard title="Последние заявки">
          <router-link v-for="order in orders.slice(0,8)" :key="order.id" to="/orders" class="company-record-line">
            <div><strong>{{order.number}}</strong><small>{{store.data.outlets.find(o=>o.id===order.outletId)?.name}} · {{displayDate(order.deliveryDate)}}</small></div>
            <strong>{{money(orderTotal(order))}}</strong><StatusBadge :status="order.status" />
          </router-link>
          <EmptyState v-if="!orders.length" title="Заявок нет" />
        </SectionCard>
      </div>
      <div class="stack-lg">
        <SectionCard title="Реквизиты и контакты">
          <dl class="details-list">
            <div><dt>БИН</dt><dd class="mono">{{company.bin}}</dd></div>
            <div><dt>Контакт</dt><dd>{{company.contactName||'—'}}</dd></div>
            <div><dt>Телефон</dt><dd>{{company.phone||'—'}}</dd></div>
            <div><dt>E-mail</dt><dd>{{company.email||'—'}}</dd></div>
            <div><dt>Дата добавления</dt><dd>{{displayDate(company.createdAt)}}</dd></div>
          </dl>
        </SectionCard>
        <SectionCard title="Открытые расчёты" description="Дебиторка по юридическому лицу">
          <div v-for="debt in debts" :key="debt.id" class="company-record-line">
            <div><strong>{{debt.invoice}}</strong><small>До {{displayDate(debt.dueAt)}}</small></div>
            <strong :class="{'text-danger':isOverdue(debt)}">{{money(debtBalance(debt))}}</strong>
          </div>
          <EmptyState v-if="!debts.length" title="Нет документов" />
        </SectionCard>
        <SectionCard title="Документы">
          <div v-for="doc in docs" :key="doc.id" class="company-record-line"><div><strong>{{doc.filename}}</strong><small>Демо-запись, файл не загружен</small></div></div>
          <EmptyState v-if="!docs.length" title="Документы ещё не добавлены" />
        </SectionCard>
      </div>
    </div>
  </template>
</template>
