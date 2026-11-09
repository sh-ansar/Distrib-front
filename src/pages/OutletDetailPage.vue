<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppIcon from '@/components/ui/AppIcon.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ModalShell from '@/components/ui/ModalShell.vue'
import OrderForm from '@/components/ui/OrderForm.vue'
import PageTitle from '@/components/ui/PageTitle.vue'
import SectionCard from '@/components/ui/SectionCard.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import { can } from '@/access'
import { useDistributionStore } from '@/stores/distribution'
import { consignmentBalance, debtBalance, displayDate, isOverdue, money, orderTotal, phoneLink } from '@/utils/domain'
const store=useDistributionStore()
const route=useRoute()
const outlet=computed(()=>store.visibleOutlets.find(o=>o.id===String(route.params.id)))
const customer=computed(()=>store.data.customers.find(c=>c.id===outlet.value?.customerId))
const debts=computed(()=>store.visibleDebts.filter(d=>d.customerId===outlet.value?.customerId))
const orders=computed(()=>store.visibleOrders.filter(o=>o.outletId===outlet.value?.id).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)))
const consignments=computed(()=>store.data.consignments.filter(c=>c.outletId===outlet.value?.id))
const docs=computed(()=>store.data.documents.filter(d=>(d.entityType==='outlet'&&d.entityId===outlet.value?.id)||(d.entityType==='customer'&&d.entityId===customer.value?.id)))
const history=computed(()=>store.data.activities.filter(a=>(a.entityType==='outlet'&&a.entityId===outlet.value?.id)||(a.entityType==='customer'&&a.entityId===customer.value?.id)).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)))
const balance=computed(()=>debts.value.reduce((s,d)=>s+debtBalance(d),0))
const overdue=computed(()=>debts.value.filter(d=>isOverdue(d)).reduce((s,d)=>s+debtBalance(d),0))
const activeTab=ref('overview')
const orderOpen=ref(false)
const editOpen=ref(false)
const documentOpen=ref(false)
const note=ref('')
const error=ref('')
const docName=ref('')
const edit=reactive({name:'',address:'',contactName:'',phone:'',notes:''})
watch(outlet,o=>{if(o)Object.assign(edit,{name:o.name,address:o.address,contactName:o.contactName,phone:o.phone,notes:o.notes})},{immediate:true})
function update(){
  error.value=''
  try {if(outlet.value){store.updateOutlet(outlet.value.id,{...edit});editOpen.value=false;store.notify('Данные магазина обновлены.')}}catch(e){error.value=e instanceof Error?e.message:'Ошибка сохранения.'}
}
function addNote(){
  error.value=''
  try{if(outlet.value){store.addOutletNote(outlet.value.id,note.value);note.value='';store.notify('Событие добавлено в историю.')}}catch(e){error.value=e instanceof Error?e.message:'Не удалось добавить запись.'}
}
function addDoc(){
  error.value=''
  try{if(outlet.value){store.addDocumentMetadata('outlet',outlet.value.id,docName.value,'application/octet-stream',0);documentOpen.value=false;docName.value='';store.notify('Сохранено название документа. Файл не загружен — демо.')}}catch(e){error.value=e instanceof Error?e.message:'Ошибка.'}
}
</script>
<template>
  <div v-if="!outlet"><PageTitle title="Магазин не найден" subtitle="Возможно, точка недоступна вашей роли." /><router-link to="/outlets" class="btn btn-secondary"><AppIcon name="arrow-left" /> Вернуться в реестр</router-link></div>
  <template v-else>
    <div class="detail-back"><router-link to="/outlets"><AppIcon name="arrow-left" :size="17" /> Все торговые точки</router-link></div>
    <PageTitle :eyebrow="outlet.district.toUpperCase()+' · ТОРГОВАЯ ТОЧКА'" :title="outlet.name" :subtitle="outlet.address">
      <button v-if="can(store.currentRole,'outlets:edit')" class="btn btn-secondary" @click="editOpen=true"><AppIcon name="pencil" :size="17" /> Редактировать</button>
      <button v-if="can(store.currentRole,'orders:edit')" class="btn btn-primary" @click="orderOpen=true"><AppIcon name="plus" :size="17" /> Новая заявка</button>
    </PageTitle>
    <div class="detail-summary-grid">
      <div class="detail-stat"><span>Контрагент</span><strong>{{customer?.legalName}}</strong><small>БИН {{customer?.bin}}</small></div>
      <div class="detail-stat"><span>Долг по компании</span><strong :class="{'text-danger':balance>0}">{{money(balance)}}</strong><small>Просрочено {{money(overdue)}}</small></div>
      <div class="detail-stat"><span>Активные заявки</span><strong>{{orders.filter(o=>!['delivered','cancelled','partial'].includes(o.status)).length}}</strong><small>Всего {{orders.length}} заявок</small></div>
      <div class="detail-stat"><span>Контакт</span><strong>{{outlet.contactName||'—'}}</strong><a v-if="outlet.phone" :href="phoneLink(outlet.phone)">{{outlet.phone}}</a><small v-else>Телефон не указан</small></div>
    </div>
    <div class="tab-bar" role="tablist" aria-label="Разделы карточки">
      <button v-for="tab in [{id:'overview',label:'Обзор'},{id:'orders',label:'Заявки'},{id:'debts',label:'Дебиторка'},{id:'consignment',label:'Под реализацию'},{id:'documents',label:'Документы'},{id:'history',label:'История'}].filter(t=>t.id!=='debts'&&t.id!=='consignment'||can(store.currentRole,t.id==='debts'?'debts':'consignment'))"
        :key="tab.id" type="button" role="tab" :aria-selected="activeTab===tab.id" :class="{'selected':activeTab===tab.id}" @click="activeTab=tab.id">{{tab.label}}</button>
    </div>
    <div v-if="activeTab==='overview'" class="two-col-layout">
      <SectionCard title="Информация о магазине">
        <dl class="details-list">
          <div><dt>Адрес</dt><dd>{{outlet.address}}</dd></div>
          <div><dt>Район</dt><dd>{{outlet.district}}</dd></div>
          <div><dt>Ответственный</dt><dd>{{store.data.employees.find(e=>e.id===outlet?.repId)?.name}}</dd></div>
          <div><dt>Юридическое лицо</dt><dd>{{customer?.legalName}}</dd></div>
          <div><dt>Кредитный лимит</dt><dd>{{money(customer?.creditLimit||0)}}</dd></div>
          <div><dt>Отсрочка платежа</dt><dd>{{customer?.termsDays}} дней</dd></div>
          <div><dt>Статус</dt><dd><StatusBadge :status="customer?.status||'active'" :label="customer?.status==='active'?'Активен':'Приостановлен'" /></dd></div>
          <div><dt>Примечание</dt><dd>{{outlet.notes||'Пока нет примечаний'}}</dd></div>
        </dl>
      </SectionCard>
      <SectionCard title="Последние события" description="Записи представителей и отдела контроля">
        <div v-for="a in history.slice(0,5)" :key="a.id" class="activity-row"><div class="activity-mark"><AppIcon name="history" :size="16" /></div><div><strong>{{a.message}}</strong><small>{{displayDate(a.createdAt)}} · {{store.data.employees.find(e=>e.id===a.actorId)?.name||'Система'}}</small></div></div>
        <p v-if="!history.length" class="muted small">Событий пока нет.</p>
        <form v-if="can(store.currentRole,'outlets:edit')" class="note-form" @submit.prevent="addNote"><label class="field"><span>Новая запись в истории</span><textarea v-model="note" rows="3" placeholder="Итог визита, договорённости, комментарий..." /></label><div v-if="error" class="form-error">{{error}}</div><button class="btn btn-secondary" type="submit"><AppIcon name="plus" :size="16" /> Добавить запись</button></form>
      </SectionCard>
    </div>
    <SectionCard v-else-if="activeTab==='orders'" title="Заявки магазина" description="От создания до подтверждённой доставки">
      <EmptyState v-if="!orders.length" title="Заявок нет" />
      <router-link v-for="order in orders" :key="order.id" to="/orders" class="detail-item-row"><div><strong>{{order.number}}</strong><small>Доставка {{displayDate(order.deliveryDate)}} · {{order.items.length}} позиций</small></div><strong>{{money(orderTotal(order))}}</strong><StatusBadge :status="order.status" /><AppIcon name="chevron-right" :size="17" /></router-link>
    </SectionCard>
    <SectionCard v-else-if="activeTab==='debts'" title="Расчёты по контрагенту" description="Задолженность учитывается на уровне юридического лица, не отдельного магазина">
      <div v-for="debt in debts" :key="debt.id" class="detail-item-row"><div><strong>{{debt.invoice}}</strong><small>Срок оплаты {{displayDate(debt.dueAt)}}</small></div><strong :class="{'text-danger':isOverdue(debt)}">{{money(debtBalance(debt))}}</strong><StatusBadge :status="isOverdue(debt)?'failed':'planned'" :label="isOverdue(debt)?'Просрочено':'В срок'" /></div>
      <EmptyState v-if="!debts.length" title="Открытых документов нет" />
    </SectionCard>
    <SectionCard v-else-if="activeTab==='consignment'" title="Товар под реализацию" description="Учёт остатков по передачам и сверкам">
      <div v-for="record in consignments" :key="record.id" class="detail-item-row"><div><strong>{{store.data.products.find(p=>p.id===record.productId)?.name}}</strong><small>Передано: {{record.sent}}, продано: {{record.sold}}, возвращено: {{record.returned}}</small></div><strong>{{consignmentBalance(record)}} ост.</strong><span class="muted">{{money(consignmentBalance(record)*record.price)}}</span></div>
      <EmptyState v-if="!consignments.length" title="Передач на реализацию нет" />
    </SectionCard>
    <SectionCard v-else-if="activeTab==='documents'" title="Досье документов" description="Демоверсия сохраняет только названия, не файлы">
      <template #action><button v-if="can(store.currentRole,'documents:edit')" class="btn btn-secondary btn-sm" @click="documentOpen=true"><AppIcon name="file-plus-2" :size="16" /> Добавить запись</button></template>
      <div v-for="doc in docs" :key="doc.id" class="detail-item-row"><AppIcon name="file-text" /><div><strong>{{doc.filename}}</strong><small>{{displayDate(doc.createdAt)}} · демо-запись, без файла</small></div></div>
      <EmptyState v-if="!docs.length" title="Документы пока не добавлены" />
    </SectionCard>
    <SectionCard v-else title="История взаимодействий" description="События и заметки по магазину и контрагенту">
      <div v-for="a in history" :key="a.id" class="activity-row"><span class="activity-mark"><AppIcon name="clock-3" :size="16" /></span><div><strong>{{a.message}}</strong><small>{{displayDate(a.createdAt)}} · {{store.data.employees.find(e=>e.id===a.actorId)?.name||'Система'}}</small></div></div>
      <EmptyState v-if="!history.length" title="История пока пуста" />
    </SectionCard>
    <ModalShell :open="orderOpen" title="Новая заявка" subtitle="Добавьте товары и дату доставки" size="lg" @close="orderOpen=false"><OrderForm :initial-outlet-id="outlet.id" @created="orderOpen=false;activeTab='orders'" @cancel="orderOpen=false" /></ModalShell>
    <ModalShell :open="editOpen" title="Редактирование магазина" @close="editOpen=false"><form class="stack-lg" @submit.prevent="update">
      <label class="field"><span>Название</span><input v-model="edit.name" required /></label><label class="field"><span>Адрес</span><input v-model="edit.address" required /></label><label class="field"><span>Контакт</span><input v-model="edit.contactName" /></label><label class="field"><span>Телефон</span><input v-model="edit.phone" /></label><label class="field"><span>Примечание</span><textarea v-model="edit.notes" rows="3" /></label>
      <div v-if="error" class="form-error">{{error}}</div><div class="form-footer"><button class="btn btn-secondary" type="button" @click="editOpen=false">Отмена</button><button class="btn btn-primary" type="submit">Сохранить</button></div>
    </form></ModalShell>
    <ModalShell :open="documentOpen" title="Запись о документе" subtitle="Файл не загружается в демоверсии" @close="documentOpen=false"><form class="stack-lg" @submit.prevent="addDoc"><label class="field"><span>Название документа</span><input v-model="docName" required placeholder="Накладная №..., договор..." /></label><div class="inline-notice"><AppIcon name="info" :size="18" /> Загрузка фотографий и PDF будет доступна после подключения защищённого файлового API.</div><div v-if="error" class="form-error">{{error}}</div><div class="form-footer"><button class="btn btn-secondary" type="button" @click="documentOpen=false">Отмена</button><button class="btn btn-primary" type="submit">Сохранить запись</button></div></form></ModalShell>
  </template>
</template>
