<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import ModalShell from '@/components/ui/ModalShell.vue'
import PageTitle from '@/components/ui/PageTitle.vue'
import SectionCard from '@/components/ui/SectionCard.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import UiTable from '@/components/ui/UiTable.vue'
import { can, roleLabels } from '@/access'
import { useDistributionStore } from '@/stores/distribution'
import type { Role } from '@/types/domain'
const store=useDistributionStore()
const search=ref('')
const selectedRole=ref('')
const modal=ref(false)
const error=ref('')
const form=reactive<{name:string;role:Role;phone:string}>({name:'',role:'sales',phone:''})
const rows=computed(()=>store.data.employees.filter(e=>(!selectedRole.value||e.role===selectedRole.value)&&e.name.toLowerCase().includes(search.value.toLowerCase())).map(e=>({...e,roleLabel:roleLabels[e.role]})))
const columns=[{key:'name',label:'Сотрудник',sortable:true},{key:'roleLabel',label:'Роль',sortable:true},{key:'phone',label:'Контакт'},{key:'active',label:'Статус'}]
function add(){
  error.value=''
  try{store.addEmployee({...form});modal.value=false;store.notify('Демо-сотрудник создан. Настоящая учётная запись не создаётся.')}
  catch(e){error.value=e instanceof Error?e.message:'Ошибка.'}
}
</script>
<template>
  <PageTitle eyebrow="КОМАНДА И ДОСТУПЫ" title="Сотрудники" subtitle="Участники процесса продаж, отгрузки и доставки">
    <button v-if="can(store.currentRole,'staff:edit')" class="btn btn-primary" @click="modal=true"><AppIcon name="plus" :size="17" /> Добавить сотрудника</button>
  </PageTitle>
  <div class="mini-stats">
    <div><strong>{{store.data.employees.filter(e=>e.active).length}}</strong><span>Активных сотрудников</span></div><div><strong>{{store.data.employees.filter(e=>e.role==='sales').length}}</strong><span>Торговых представителей</span></div><div><strong>{{store.data.employees.filter(e=>e.role==='driver').length}}</strong><span>Водителей</span></div><div><strong>{{store.data.vehicles.length}}</strong><span>Автомобилей</span></div>
  </div>
  <div class="two-col-layout">
    <SectionCard title="Сотрудники и роли" description="Демо-пользователи для проверки экранов" :flush="true">
      <div class="table-toolbar"><label class="search-control"><AppIcon name="search" :size="17" /><input v-model="search" placeholder="Поиск сотрудника" aria-label="Поиск сотрудников" /></label><select v-model="selectedRole" aria-label="Роль"><option value="">Все роли</option><option v-for="(label,key) in roleLabels" :key="key" :value="key">{{label}}</option></select></div>
      <UiTable :rows="rows" :columns="columns" :page-size="12">
        <template #cell-name="{row}"><div class="cell-title"><span class="avatar avatar-small">{{row.initials}}</span><strong>{{row.name}}</strong></div></template>
        <template #cell-active="{row}"><StatusBadge :status="row.active?'active':'on_hold'" :label="row.active?'Активен':'Отключён'" /></template>
      </UiTable>
    </SectionCard>
    <div class="stack-lg">
      <SectionCard title="Автопарк" description="Машины и грузоподъёмность">
        <div v-for="v in store.data.vehicles" :key="v.id" class="fleet-row"><span class="fleet-icon"><AppIcon name="truck" /></span><div><strong>{{v.plate}}</strong><small>{{v.title}}</small><small>{{store.data.employees.find(e=>e.id===v.driverId)?.name}}</small></div><strong>{{v.capacityKg}} кг</strong></div>
      </SectionCard>
      <div class="inline-notice"><AppIcon name="shield-check" :size="18" /><div><strong>Роли — макет доступа</strong><p>Настоящие учётные записи, авторизация, разграничение данных по сотрудникам и разрешения на API должны проверяться на backend.</p></div></div>
    </div>
  </div>
  <ModalShell :open="modal" title="Новый сотрудник" subtitle="Только демо-профиль, без пароля и доступа к серверу" @close="modal=false">
    <form class="stack-lg" @submit.prevent="add">
      <label class="field"><span>Имя сотрудника</span><input v-model="form.name" required /></label><label class="field"><span>Роль</span><select v-model="form.role"><option v-for="(label,key) in roleLabels" :key="key" :value="key">{{label}}</option></select></label><label class="field"><span>Телефон</span><input v-model="form.phone" /></label>
      <div v-if="error" class="form-error">{{error}}</div><div class="form-footer"><button type="button" class="btn btn-secondary" @click="modal=false">Отмена</button><button type="submit" class="btn btn-primary">Добавить в демо</button></div>
    </form>
  </ModalShell>
</template>
