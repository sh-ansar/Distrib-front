<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '@/components/ui/AppIcon.vue'
import ModalShell from '@/components/ui/ModalShell.vue'
import PageTitle from '@/components/ui/PageTitle.vue'
import SectionCard from '@/components/ui/SectionCard.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import UiTable from '@/components/ui/UiTable.vue'
import { can } from '@/access'
import { useDistributionStore } from '@/stores/distribution'
import { debtBalance, money } from '@/utils/domain'
const store=useDistributionStore()
const route=useRoute()
const router=useRouter()
const search=ref(String(route.query.q??''))
const district=ref('')
const customerFilter=ref(String(route.query.customer??''))
const isCreateOpen=ref(false)
const isCustomerOpen=ref(false)
const error=ref('')
const customerError=ref('')
const form=reactive({customerId:'',name:'',address:'Астана, ',district:'Есиль',contactName:'',phone:'',repId:store.currentRole==='sales'?store.currentUserId:'u4',notes:''})
const customerForm=reactive({legalName:'',bin:'',contactName:'',phone:'',email:'',creditLimit:500000,termsDays:14})
watch(()=>route.query.q,q=>search.value=String(q??''))
watch(()=>route.query.customer,q=>customerFilter.value=String(q??''))
const districts=computed(()=>[...new Set(store.data.outlets.map(o=>o.district))].sort())
const rows=computed(()=>store.visibleOutlets.filter(o=>{
  const c=store.data.customers.find(c=>c.id===o.customerId)
  const match=[o.name,o.address,c?.legalName,o.contactName,o.phone].join(' ').toLowerCase().includes(search.value.toLowerCase())
  return match && (!district.value||district.value===o.district) && (!customerFilter.value||customerFilter.value===o.customerId)
}).map(o=>({...o,customerName:store.data.customers.find(c=>c.id===o.customerId)?.legalName||'—',
  repName:store.data.employees.find(e=>e.id===o.repId)?.name||'—',debt:store.data.debts.filter(d=>d.customerId===o.customerId).reduce((sum,d)=>sum+debtBalance(d),0),
  customerStatus:store.data.customers.find(c=>c.id===o.customerId)?.status||'active'})))
const columns=[
  {key:'name',label:'Торговая точка',sortable:true},
  {key:'customerName',label:'Контрагент',sortable:true},
  {key:'district',label:'Район',sortable:true},
  {key:'repName',label:'Представитель'},
  {key:'debt',label:'Задолженность',align:'right' as const,sortable:true},
  {key:'customerStatus',label:'Статус'},
]
function createOutlet(){
  error.value=''
  try{const outlet=store.createOutlet({...form});isCreateOpen.value=false;router.push('/outlets/'+outlet.id);store.notify('Новая торговая точка добавлена.')}
  catch(e){error.value=e instanceof Error?e.message:'Не удалось создать торговую точку.'}
}
function createCustomer(){
  customerError.value=''
  try{const customer=store.createCustomer({...customerForm});form.customerId=customer.id;isCustomerOpen.value=false;store.notify('Контрагент создан. Добавьте его торговую точку.')}
  catch(e){customerError.value=e instanceof Error?e.message:'Не удалось создать контрагента.'}
}
</script>
<template>
  <PageTitle eyebrow="КЛИЕНТСКАЯ БАЗА" title="Торговые точки" :subtitle="store.visibleOutlets.length+' магазинов в доступном реестре'">
    <button v-if="can(store.currentRole,'outlets:edit')" class="btn btn-primary" @click="isCreateOpen=true"><AppIcon name="plus" :size="18" /> Добавить магазин</button>
  </PageTitle>
  <div class="mini-stats">
    <div><strong>{{store.visibleCustomers.length}}</strong><span>Контрагентов</span></div>
    <div><strong>{{store.visibleOutlets.length}}</strong><span>Торговых точек</span></div>
    <div><strong>{{districts.length}}</strong><span>Районов</span></div>
    <div><strong>{{store.visibleOutlets.filter(o=>o.active).length}}</strong><span>Активных точек</span></div>
  </div>
  <SectionCard title="Реестр магазинов" description="Карточки, контакты, ответственное лицо и финансовая информация" :flush="true">
    <div class="table-toolbar">
      <label class="search-control"><AppIcon name="search" :size="18" /><input v-model="search" aria-label="Поиск магазинов" placeholder="Название, адрес, контрагент..." /></label>
      <select v-model="district" aria-label="Район"><option value="">Все районы</option><option v-for="d in districts" :key="d" :value="d">{{d}}</option></select>
      <button v-if="customerFilter" class="btn btn-secondary btn-sm" @click="customerFilter='';router.replace('/outlets')">Сбросить контрагента <AppIcon name="x" :size="14" /></button>
      <span class="toolbar-count">Найдено: {{rows.length}}</span>
    </div>
    <UiTable :rows="rows" :columns="columns" :page-size="10" clickable @row-click="row=>router.push('/outlets/'+row.id)">
      <template #cell-name="{row}"><div class="cell-title"><span class="entity-avatar"><AppIcon name="store" :size="18" /></span><div><strong>{{row.name}}</strong><small>{{row.address}}</small></div></div></template>
      <template #cell-debt="{row}"><span :class="{'text-danger':row.debt>0}">{{money(row.debt)}}</span></template>
      <template #cell-customerStatus="{row}"><StatusBadge :status="row.customerStatus" :label="row.customerStatus==='active'?'Активен':'Приостановлен'" /></template>
    </UiTable>
  </SectionCard>
  <ModalShell :open="isCreateOpen" title="Новая торговая точка" subtitle="Привяжите магазин к юридическому контрагенту" size="lg" @close="isCreateOpen=false">
    <form class="stack-lg" @submit.prevent="createOutlet">
      <div class="form-grid">
        <label class="field field-wide"><span>Контрагент *</span><select v-model="form.customerId" required><option value="">Выберите компанию</option><option v-for="customer in store.visibleCustomers" :key="customer.id" :value="customer.id">{{customer.legalName}}</option></select></label>
        <div class="field-inline field-wide" v-if="can(store.currentRole,'outlets:edit')"><span class="muted small">Нет нужной компании?</span><button class="text-link" type="button" @click="isCustomerOpen=true">Создать контрагента <AppIcon name="plus" :size="15" /></button></div>
        <label class="field"><span>Название магазина *</span><input v-model="form.name" required placeholder="Маркет «Арман»" /></label>
        <label class="field"><span>Район *</span><select v-model="form.district" required><option v-for="d in ['Есиль','Нура','Сарыарка','Алматы','Байконыр']" :key="d">{{d}}</option></select></label>
        <label class="field field-wide"><span>Адрес доставки *</span><input v-model="form.address" required /></label>
        <label class="field"><span>Контактное лицо</span><input v-model="form.contactName" placeholder="Имя контактного лица" /></label>
        <label class="field"><span>Телефон</span><input v-model="form.phone" placeholder="+7 7XX XXX XX XX" /></label>
        <label class="field field-wide"><span>Торговый представитель *</span><select v-model="form.repId" :disabled="store.currentRole==='sales'"><option v-for="employee in store.data.employees.filter(e=>e.role==='sales'&&e.active)" :key="employee.id" :value="employee.id">{{employee.name}}</option></select></label>
        <label class="field field-wide"><span>Примечание</span><textarea v-model="form.notes" rows="2" placeholder="Особенности точки, время приёмки..." /></label>
      </div>
      <div v-if="error" class="form-error" role="alert">{{error}}</div>
      <div class="form-footer"><button type="button" class="btn btn-secondary" @click="isCreateOpen=false">Отмена</button><button type="submit" class="btn btn-primary">Сохранить магазин</button></div>
    </form>
  </ModalShell>
  <ModalShell :open="isCustomerOpen" title="Новый контрагент" subtitle="Юридическая компания, у которой может быть несколько магазинов" @close="isCustomerOpen=false">
    <form class="stack-lg" @submit.prevent="createCustomer">
      <div class="form-grid">
        <label class="field field-wide"><span>Юридическое название *</span><input v-model="customerForm.legalName" required /></label>
        <label class="field"><span>БИН (12 цифр) *</span><input v-model="customerForm.bin" inputmode="numeric" maxlength="12" required /></label>
        <label class="field"><span>Контактное лицо</span><input v-model="customerForm.contactName" /></label>
        <label class="field"><span>Телефон</span><input v-model="customerForm.phone" /></label>
        <label class="field"><span>E-mail</span><input v-model="customerForm.email" type="email" /></label>
        <label class="field"><span>Кредитный лимит, ₸</span><input v-model.number="customerForm.creditLimit" min="0" type="number" /></label>
        <label class="field"><span>Отсрочка, дней</span><input v-model.number="customerForm.termsDays" min="0" type="number" /></label>
      </div>
      <div v-if="customerError" class="form-error" role="alert">{{customerError}}</div>
      <div class="form-footer"><button type="button" class="btn btn-secondary" @click="isCustomerOpen=false">Отмена</button><button type="submit" class="btn btn-primary">Создать компанию</button></div>
    </form>
  </ModalShell>
</template>
