<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import ModalShell from '@/components/ui/ModalShell.vue'
import PageTitle from '@/components/ui/PageTitle.vue'
import SectionCard from '@/components/ui/SectionCard.vue'
import UiTable from '@/components/ui/UiTable.vue'
import { can } from '@/access'
import { useDistributionStore } from '@/stores/distribution'
import { displayDate } from '@/utils/domain'
import type { EntityType } from '@/types/domain'
const store=useDistributionStore()
const search=ref('')
const entityFilter=ref('')
const modal=ref(false)
const error=ref('')
const form=reactive<{entityType:EntityType;entityId:string;filename:string}>({entityType:'outlet',entityId:'',filename:''})
const entityTypes=[{key:'outlet',label:'Магазин'},{key:'customer',label:'Контрагент'},{key:'order',label:'Заявка'},{key:'route',label:'Рейс'}]
const entities=computed(()=>{
  if(form.entityType==='outlet')return store.visibleOutlets.map(o=>({id:o.id,label:o.name}))
  if(form.entityType==='customer')return store.visibleCustomers.map(c=>({id:c.id,label:c.legalName}))
  if(form.entityType==='order')return store.visibleOrders.map(o=>({id:o.id,label:o.number}))
  if(form.entityType==='route')return store.visibleRoutes.map(r=>({id:r.id,label:r.number}))
  return []
})
const visibleIds=computed(()=>({
  customer:new Set(store.visibleCustomers.map(c=>c.id)),outlet:new Set(store.visibleOutlets.map(o=>o.id)),
  order:new Set(store.visibleOrders.map(o=>o.id)),route:new Set(store.visibleRoutes.map(r=>r.id)),
  stop:new Set<string>(),
}))
function entityName(type:EntityType,id:string){
  if(type==='outlet')return store.data.outlets.find(o=>o.id===id)?.name||'—'
  if(type==='customer')return store.data.customers.find(c=>c.id===id)?.legalName||'—'
  if(type==='order')return store.data.orders.find(o=>o.id===id)?.number||'—'
  if(type==='route')return store.data.routes.find(r=>r.id===id)?.number||'—'
  return 'Точка маршрута'
}
const rows=computed(()=>store.data.documents.filter(d=>
  visibleIds.value[d.entityType].has(d.entityId) && (!entityFilter.value||d.entityType===entityFilter.value) &&
  [d.filename,entityName(d.entityType,d.entityId)].join(' ').toLowerCase().includes(search.value.toLowerCase())
).map(d=>({...d,entityLabel:entityName(d.entityType,d.entityId),typeLabel:entityTypes.find(e=>e.key===d.entityType)?.label||'Доставка'}))
  .sort((a,b)=>b.createdAt.localeCompare(a.createdAt)))
const columns=[{key:'filename',label:'Документ',sortable:true},{key:'typeLabel',label:'Связь'},{key:'entityLabel',label:'Объект'},{key:'createdAt',label:'Добавлен',sortable:true},{key:'status',label:'Доступность'}]
function add(){
  error.value=''
  try{
    if(!entities.value.some(e=>e.id===form.entityId))throw new Error('Выберите доступный объект.')
    store.addDocumentMetadata(form.entityType,form.entityId,form.filename,'application/octet-stream',0)
    modal.value=false;form.filename='';store.notify('Запись создана. Сам файл не загружался.')
  }catch(e){error.value=e instanceof Error?e.message:'Ошибка.'}
}
</script>
<template>
  <PageTitle eyebrow="ФАЙЛЫ И ПОДТВЕРЖДЕНИЯ" title="Документы" subtitle="Договоры, накладные, акты сверок и подтверждения доставки">
    <button v-if="can(store.currentRole,'documents:edit')" class="btn btn-primary" @click="modal=true"><AppIcon name="plus" :size="17" /> Добавить запись</button>
  </PageTitle>
  <div class="inline-notice warn-notice"><AppIcon name="lock-keyhole" :size="19" /><div><strong>Загрузка файлов пока выключена</strong><p>Демоверсия хранит только названия и связи документов. Фото, PDF и оригиналы договоров нельзя сохранять в браузерную демо-базу. Для настоящей загрузки потребуется приватное хранилище, backend, антивирусная проверка и доступ по ролям.</p></div></div>
  <SectionCard title="Реестр документов" description="Единая карточка объекта для дальнейшего документооборота" :flush="true">
    <div class="table-toolbar"><label class="search-control"><AppIcon name="search" :size="18" /><input v-model="search" placeholder="Поиск по названию или объекту" aria-label="Поиск документов" /></label>
      <select v-model="entityFilter" aria-label="Тип связи"><option value="">Все типы</option><option v-for="t in entityTypes" :key="t.key" :value="t.key">{{t.label}}</option></select>
      <span class="toolbar-count">{{rows.length}} записей</span>
    </div>
    <UiTable :rows="rows" :columns="columns">
      <template #cell-filename="{row}"><div class="cell-title"><span class="entity-avatar"><AppIcon name="file-text" :size="19" /></span><div><strong>{{row.filename}}</strong><small>Только метаданные · файл отсутствует</small></div></div></template>
      <template #cell-createdAt="{row}">{{displayDate(row.createdAt)}}</template>
      <template #cell-status><span class="status-badge status-neutral">Демо-запись</span></template>
    </UiTable>
  </SectionCard>
  <ModalShell :open="modal" title="Новая запись документа" subtitle="Название и связь без хранения самого файла" @close="modal=false">
    <form class="stack-lg" @submit.prevent="add">
      <label class="field"><span>Тип объекта *</span><select v-model="form.entityType" @change="form.entityId=''"><option v-for="t in entityTypes" :key="t.key" :value="t.key">{{t.label}}</option></select></label>
      <label class="field"><span>Объект *</span><select v-model="form.entityId" required><option value="">Выберите</option><option v-for="e in entities" :key="e.id" :value="e.id">{{e.label}}</option></select></label>
      <label class="field"><span>Название *</span><input v-model="form.filename" required placeholder="Накладная №123, акт сверки..." /></label>
      <div v-if="error" class="form-error">{{error}}</div>
      <div class="form-footer"><button class="btn btn-secondary" type="button" @click="modal=false">Отмена</button><button class="btn btn-primary" type="submit">Создать запись</button></div>
    </form>
  </ModalShell>
</template>
