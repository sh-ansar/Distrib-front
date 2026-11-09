<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import CompanyForm from '@/components/CompanyForm.vue'
import ModalShell from '@/components/ui/ModalShell.vue'
import { useRoute, useRouter } from 'vue-router'
import PageTitle from '@/components/ui/PageTitle.vue'
import SectionCard from '@/components/ui/SectionCard.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import UiTable from '@/components/ui/UiTable.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import { useDistributionStore } from '@/stores/distribution'
import { can } from '@/access'
import { companyProfile } from '@/utils/company'
import { routesForCompany } from '@/utils/routeProgress'
import { debtBalance, isOverdue, money } from '@/utils/domain'
import { matchesSearch } from '@/utils/search'

const store = useDistributionStore()
const router = useRouter()
const route = useRoute()
const search = ref(String(route.query.q ?? ''))
const state = ref('')
const category = ref('')
const newCompanyOpen=ref(false)
watch(() => route.query.q, q => { search.value = String(q ?? '') })

const customers = computed(() => store.visibleCustomers.map(customer => {
  const points = store.visibleOutlets.filter(outlet => outlet.customerId === customer.id)
  const debts = store.visibleDebts.filter(debt => debt.customerId === customer.id)
  const profile = companyProfile(customer.profile)
  const relatedRoutes = routesForCompany(customer.id,store.visibleRoutes,store.visibleOutlets)
  return {
    ...customer,
    points,
    pointsCount: points.length,
    category:profile.category,
    routesCount:relatedRoutes.length,
    debt: debts.reduce((sum, debt) => sum + debtBalance(debt), 0),
    overdue: debts.filter(debt => isOverdue(debt)).reduce((sum, debt) => sum + debtBalance(debt), 0),
    searchable: [customer.legalName, customer.bin, customer.contactName, customer.phone,
      customer.email,profile.tradingName,profile.category,profile.directorName,
      profile.territory,profile.contractNumber,profile.legalAddress,profile.actualAddress,
      profile.deliveryRequirements, ...points.flatMap(point => [point.name,point.address,point.phone])],
  }
}))
const rows = computed(() => customers.value.filter(customer =>
  (!state.value || state.value === customer.status) && (!category.value || category.value === customer.category) && matchesSearch(search.value, customer.searchable)
).sort((a,b) => b.overdue - a.overdue || a.legalName.localeCompare(b.legalName,'ru')))
const totalPoints = computed(() => customers.value.reduce((sum,c) => sum+c.pointsCount,0))
const categories=computed(()=>[...new Set(customers.value.map(c=>c.category).filter(Boolean))].sort())
const withOverdue = computed(() => customers.value.filter(c => c.overdue > 0).length)
const columns = [
  {key:'legalName',label:'Компания',sortable:true},
  {key:'bin',label:'БИН',sortable:true},
  {key:'contactName',label:'Контакт'},
  {key:'pointsCount',label:'Магазинов',sortable:true,align:'right' as const},
  {key:'debt',label:'Задолженность',sortable:true,align:'right' as const},
  {key:'status',label:'Статус'},
]
</script>
<template>
  <PageTitle title="Компании" subtitle="Юридические лица, торговые точки, маршруты и условия сотрудничества">
    <button v-if="can(store.currentRole,'companies:edit')" type="button" class="btn btn-primary" @click="newCompanyOpen=true">Добавить компанию</button>
  </PageTitle>
  <div class="directory-summary">
    <div><strong>{{customers.length}}</strong><span>Компаний</span></div>
    <div><strong>{{totalPoints}}</strong><span>Торговых точек</span></div>
    <div><strong>{{withOverdue}}</strong><span>С просрочкой</span></div>
  </div>
  <SectionCard title="Справочник компаний" description="Поиск по названию, БИН, телефону, магазину или адресу" :flush="true">
    <div class="table-toolbar directory-toolbar">
      <label class="search-control"><input v-model="search" aria-label="Поиск компании" autocomplete="off" placeholder="Компания, БИН, адрес, телефон" /></label>
      <select v-model="state" aria-label="Статус компании">
        <option value="">Все компании</option><option value="active">Активные</option><option value="on_hold">Приостановлены</option>
      </select>
      <select v-model="category" aria-label="Категория клиента"><option value="">Все категории</option><option v-for="name in categories" :key="name" :value="name">{{name}}</option></select>
      <span class="toolbar-count">Найдено: {{rows.length}}</span>
    </div>
    <UiTable :rows="rows" :columns="columns" :page-size="12" clickable @row-click="row => router.push('/companies/'+row.id)">
      <template #cell-legalName="{row}">
        <div class="directory-name"><strong>{{row.legalName}}</strong><small>{{row.points[0]?.name||'Нет торговых точек'}}</small></div>
      </template>
      <template #cell-bin="{row}"><span class="mono">{{row.bin}}</span></template>
      <template #cell-pointsCount="{row}">{{row.pointsCount}}</template>
      <template #cell-debt="{row}"><strong :class="{'text-danger':row.overdue>0}">{{money(row.debt)}}</strong><small v-if="row.overdue>0" class="table-subtitle text-danger">Просрочено {{money(row.overdue)}}</small></template>
      <template #cell-status="{row}"><StatusBadge :status="row.status" :label="row.status==='active'?'Работает':'Приостановлена'" /></template>
    </UiTable>
    <EmptyState v-if="!customers.length" title="Нет доступных компаний" description="Компании появятся здесь после добавления юридических лиц." />
  </SectionCard>
  <p class="directory-footnote">Справочник содержит вымышленные демонстрационные записи. Реальные данные и балансы появятся только после интеграции с 1С.</p>
  <ModalShell :open="newCompanyOpen" title="Новая компания" subtitle="Реквизиты, контакты и условия поставок" size="lg" @close="newCompanyOpen=false">
    <CompanyForm @saved="id=>{newCompanyOpen=false;router.push('/companies/'+id)}" @cancel="newCompanyOpen=false" />
  </ModalShell>
</template>
