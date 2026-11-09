<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import CompanyForm from '@/components/CompanyForm.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ModalShell from '@/components/ui/ModalShell.vue'
import PageTitle from '@/components/ui/PageTitle.vue'
import SectionCard from '@/components/ui/SectionCard.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import { can } from '@/access'
import { useDistributionStore } from '@/stores/distribution'
import { companyProfile } from '@/utils/company'
import { debtBalance, displayDate, isOverdue, money, orderTotal, phoneLink } from '@/utils/domain'
import { routeProgress, routesForCompany } from '@/utils/routeProgress'

const store=useDistributionStore()
const route=useRoute()
const editorOpen=ref(false)
const company=computed(()=>store.visibleCustomers.find(c=>c.id===String(route.params.id)))
const profile=computed(()=>companyProfile(company.value?.profile))
const outlets=computed(()=>store.visibleOutlets.filter(o=>o.customerId===company.value?.id))
const orders=computed(()=>store.visibleOrders.filter(o=>o.customerId===company.value?.id).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)))
const debts=computed(()=>store.visibleDebts.filter(d=>d.customerId===company.value?.id).sort((a,b)=>a.dueAt.localeCompare(b.dueAt)))
const total=computed(()=>debts.value.reduce((sum,d)=>sum+debtBalance(d),0))
const overdue=computed(()=>debts.value.filter(d=>isOverdue(d)).reduce((sum,d)=>sum+debtBalance(d),0))
const docs=computed(()=>store.data.documents.filter(d=>d.entityType==='customer'&&d.entityId===company.value?.id))
const history=computed(()=>store.data.activities.filter(a=>a.entityType==='customer'&&a.entityId===company.value?.id).slice().sort((a,b)=>b.createdAt.localeCompare(a.createdAt)))
const routes=computed(()=>company.value?routesForCompany(company.value.id,store.visibleRoutes,store.visibleOutlets).sort((a,b)=>b.date.localeCompare(a.date)):[])
const deliveries=computed(()=>routes.value.flatMap(r=>r.stops.filter(stop=>outlets.value.some(o=>o.id===stop.outletId))
  .map(stop=>({route:r,stop}))))
const incidents=computed(()=>deliveries.value.filter(x=>x.stop.status==='failed'||x.stop.status==='partial'))
function outletName(id:string){return store.data.outlets.find(o=>o.id===id)?.name||'Торговая точка'}
function driverName(id:string){return store.data.employees.find(e=>e.id===id)?.name||'Не назначен'}
function vehicleName(id:string){return store.data.vehicles.find(v=>v.id===id)?.plate||'—'}
function eventTime(value?:string){return value?new Date(value).toLocaleString('ru-RU',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}):'Нет подтверждений'}
const vatNames={unknown:'Не указано',vat:'Плательщик НДС',no_vat:'Без НДС'}
const paymentNames={bank:'Безналичная',cash:'Наличная',mixed:'Смешанная'}
</script>
<template>
  <div v-if="!company" class="stack-lg"><PageTitle title="Компания не найдена" subtitle="Проверьте адрес или права доступа." /><router-link class="text-link" to="/companies">К списку компаний</router-link></div>
  <template v-else>
    <div class="detail-back"><router-link to="/companies">← Все компании</router-link></div>
    <PageTitle :title="company.legalName" :subtitle="'БИН '+company.bin+(profile.tradingName?' · '+profile.tradingName:'')">
      <button v-if="can(store.currentRole,'companies:edit')" class="btn btn-primary" type="button" @click="editorOpen=true">Редактировать компанию</button>
    </PageTitle>
    <div class="detail-summary-grid company-facts">
      <div class="detail-stat"><span>Торговые точки</span><strong>{{outlets.length}}</strong><small>Закреплённые адреса</small></div>
      <div class="detail-stat"><span>Открытый долг</span><strong :class="{'text-danger':overdue>0}">{{money(total)}}</strong><small>Просрочено {{money(overdue)}}</small></div>
      <div class="detail-stat"><span>Рейсы с заказами</span><strong>{{routes.length}}</strong><small>Точек по маршрутам {{deliveries.length}}</small></div>
      <div class="detail-stat"><span>Статус сотрудничества</span><StatusBadge :status="company.status" :label="company.status==='active'?'Активна':'Отгрузки приостановлены'" /><small>{{profile.category||'Категория не указана'}}</small></div>
    </div>
    <div class="company-detail-layout">
      <div class="stack-lg">
        <SectionCard title="Досье компании" description="Реквизиты, контакты и коммерческая информация">
          <dl class="details-list">
            <div><dt>Юридическое наименование</dt><dd>{{company.legalName}}</dd></div>
            <div><dt>БИН / ИИН</dt><dd class="mono">{{company.bin}}</dd></div>
            <div><dt>Торговое название</dt><dd>{{profile.tradingName||'—'}}</dd></div>
            <div><dt>Категория</dt><dd>{{profile.category||'—'}}</dd></div>
            <div><dt>Руководитель</dt><dd>{{profile.directorName||'—'}}</dd></div>
            <div><dt>Юридический адрес</dt><dd>{{profile.legalAddress||'—'}}</dd></div>
            <div><dt>Фактический адрес</dt><dd>{{profile.actualAddress||'—'}}</dd></div>
            <div><dt>НДС</dt><dd>{{vatNames[profile.vatStatus]}}</dd></div>
            <div><dt>Договор</dt><dd>{{profile.contractNumber||'—'}} <span v-if="profile.contractDate">от {{displayDate(profile.contractDate)}}</span></dd></div>
          </dl>
        </SectionCard>
        <SectionCard title="Торговые точки" :description="outlets.length+' адресов доставки'">
          <router-link v-for="outlet in outlets" :key="outlet.id" :to="'/outlets/'+outlet.id" class="company-point-link">
            <strong>{{outlet.name}}</strong><span>{{outlet.address}}</span>
            <small>Представитель: {{store.data.employees.find(e=>e.id===outlet.repId)?.name||'Не назначен'}} · Приёмка: {{outlet.receivingWindow||profile.receivingWindow||'уточнить'}}</small>
            <small v-if="outlet.accessInstructions">{{outlet.accessInstructions}}</small>
          </router-link>
          <EmptyState v-if="!outlets.length" title="Нет магазинов" />
          <router-link class="text-link company-related" :to="'/outlets?customer='+company.id">Все точки в реестре →</router-link>
        </SectionCard>
        <SectionCard title="Рейсы и доставка" description="Фактические отметки водителей, не GPS-мониторинг">
          <div v-for="r in routes" :key="r.id" class="company-route-row">
            <div class="company-route-top">
              <div><strong>{{r.number}} · {{displayDate(r.date)}}</strong><small>{{driverName(r.driverId)}} · {{vehicleName(r.vehicleId)}}</small></div>
              <StatusBadge :status="r.status" />
            </div>
            <div class="route-progress"><span :style="{width:routeProgress(r).percent+'%'}" /></div>
            <div class="company-route-progress">
              <span>Подтверждено: {{routeProgress(r).completed}} / {{routeProgress(r).total}} точек</span>
              <span v-if="routeProgress(r).problems>0" class="text-danger">Проблем: {{routeProgress(r).problems}}</span>
            </div>
            <p v-if="routeProgress(r).last" class="company-route-event">Последняя отметка: {{outletName(routeProgress(r).last!.outletId)}} · {{eventTime(routeProgress(r).lastEventAt)}}</p>
            <p v-if="routeProgress(r).next" class="company-route-event">Следующая точка: {{outletName(routeProgress(r).next!.outletId)}}</p>
            <p v-if="!routeProgress(r).last" class="company-route-event">Ещё нет подтверждений доставки</p>
            <router-link v-if="can(store.currentRole,'routes')" class="text-link" :to="'/routes/'+r.id">Открыть маршрут →</router-link>
          </div>
          <EmptyState v-if="!routes.length" title="Пока нет назначенных рейсов" description="После формирования рейса здесь будет виден его статус и порядок остановок." />
          <p class="directory-footnote">Местоположение автомобиля и точное время прибытия недоступны, пока не подключён GPS или мобильный трекер.</p>
        </SectionCard>
        <SectionCard v-if="incidents.length" title="Проблемы с доставками" description="Частичные поставки и отказы требуют сверки">
          <div v-for="incident in incidents" :key="incident.stop.id" class="company-record-line">
            <div><strong>{{outletName(incident.stop.outletId)}} · {{incident.route.number}}</strong><small>{{incident.stop.notes||'Требуется сверка'}}</small></div>
            <StatusBadge :status="incident.stop.status" />
          </div>
        </SectionCard>
        <SectionCard title="Последние заявки">
          <router-link v-for="order in orders.slice(0,10)" :key="order.id" to="/orders" class="company-record-line">
            <div><strong>{{order.number}}</strong><small>{{outletName(order.outletId)}} · {{displayDate(order.deliveryDate)}}</small></div>
            <strong>{{money(orderTotal(order))}}</strong><StatusBadge :status="order.status" />
          </router-link>
          <EmptyState v-if="!orders.length" title="Заявок нет" />
        </SectionCard>
      </div>
      <div class="stack-lg">
        <SectionCard title="Контакты">
          <dl class="details-list">
            <div><dt>Ответственный</dt><dd>{{company.contactName||'—'}}</dd></div>
            <div><dt>Должность</dt><dd>{{profile.contactPosition||'—'}}</dd></div>
            <div><dt>Телефон</dt><dd><a v-if="company.phone" class="text-link" :href="phoneLink(company.phone)">{{company.phone}}</a><span v-else>—</span></dd></div>
            <div><dt>WhatsApp</dt><dd>{{profile.whatsapp||'—'}}</dd></div>
            <div><dt>E-mail</dt><dd>{{company.email||'—'}}</dd></div>
            <div><dt>Сайт</dt><dd>{{profile.website||'—'}}</dd></div>
          </dl>
        </SectionCard>
        <SectionCard title="Условия поставок">
          <dl class="details-list">
            <div><dt>Район</dt><dd>{{profile.territory||'—'}}</dd></div>
            <div><dt>Рабочие часы</dt><dd>{{profile.workingHours||'—'}}</dd></div>
            <div><dt>Дни поставки</dt><dd>{{profile.deliveryDays||'—'}}</dd></div>
            <div><dt>Время приёмки</dt><dd>{{profile.receivingWindow||'—'}}</dd></div>
            <div><dt>Оплата</dt><dd>{{paymentNames[profile.paymentMethod]}}</dd></div>
            <div><dt>Лимит</dt><dd>{{money(company.creditLimit)}}</dd></div>
            <div><dt>Отсрочка</dt><dd>{{company.termsDays}} дней</dd></div>
            <div><dt>Требования к доставке</dt><dd>{{profile.deliveryRequirements||'—'}}</dd></div>
            <div><dt>Примечания</dt><dd>{{profile.notes||'—'}}</dd></div>
          </dl>
        </SectionCard>
        <SectionCard title="Открытая задолженность">
          <div v-for="debt in debts" :key="debt.id" class="company-record-line">
            <div><strong>{{debt.invoice}}</strong><small>До {{displayDate(debt.dueAt)}}</small></div><strong :class="{'text-danger':isOverdue(debt)}">{{money(debtBalance(debt))}}</strong>
          </div>
          <EmptyState v-if="!debts.length" title="Нет документов задолженности" />
        </SectionCard>
        <SectionCard title="Документы">
          <div v-for="doc in docs" :key="doc.id" class="company-record-line"><div><strong>{{doc.filename}}</strong><small>Демо-запись, файл не загружен</small></div></div>
          <EmptyState v-if="!docs.length" title="Документы ещё не добавлены" />
        </SectionCard>
        <SectionCard title="История работы" description="Изменения и события по компании">
          <div v-for="event in history.slice(0,8)" :key="event.id" class="company-record-line">
            <div><strong>{{event.message}}</strong><small>{{eventTime(event.createdAt)}}</small></div>
          </div>
          <EmptyState v-if="!history.length" title="История пока пустая" />
        </SectionCard>
      </div>
    </div>
    <ModalShell :open="editorOpen" title="Редактировать компанию" subtitle="Реквизиты, контакты, приёмка и условия сотрудничества" size="lg" @close="editorOpen=false">
      <CompanyForm :customer="company" @saved="editorOpen=false" @cancel="editorOpen=false" />
    </ModalShell>
  </template>
</template>
