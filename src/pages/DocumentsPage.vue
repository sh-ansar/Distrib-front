<script setup lang="ts">
import { computed, onUnmounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppIcon from '@/components/ui/AppIcon.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ModalShell from '@/components/ui/ModalShell.vue'
import PageTitle from '@/components/ui/PageTitle.vue'
import SectionCard from '@/components/ui/SectionCard.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import UiTable from '@/components/ui/UiTable.vue'
import { can } from '@/access'
import { useDistributionStore } from '@/stores/distribution'
import { displayDate, money } from '@/utils/domain'
import { sampleWaybill } from '@/utils/waybill'
import type { EntityType, WaybillSample } from '@/types/domain'

const store=useDistributionStore()
const route=useRoute()
const search=ref('')
const kind=ref('')
const modal=ref(false)
const error=ref('')
const detailId=ref(String(route.query.document??''))
const form=reactive<{entityType:EntityType;entityId:string;filename:string}>({
  entityType:'order',entityId:'',filename:'',
})
const picked=ref<File|null>(null)
const previewUrl=ref('')
const extract=ref<WaybillSample|null>(null)
const entities=computed(()=>{
  if(form.entityType==='outlet')return store.visibleOutlets.map(x=>({id:x.id,label:x.name}))
  if(form.entityType==='customer')return store.visibleCustomers.map(x=>({id:x.id,label:x.legalName}))
  if(form.entityType==='route')return store.visibleRoutes.map(x=>({id:x.id,label:x.number}))
  return store.visibleOrders.map(x=>({id:x.id,label:x.number}))
})
const kinds=[{id:'order',title:'Заявка'},{id:'route',title:'Рейс'},{id:'outlet',title:'Магазин'},{id:'customer',title:'Компания'}]
const allowed=computed(()=>({
  order:new Set(store.visibleOrders.map(x=>x.id)),
  route:new Set(store.visibleRoutes.map(x=>x.id)),
  outlet:new Set(store.visibleOutlets.map(x=>x.id)),
  customer:new Set(store.visibleCustomers.map(x=>x.id)),
  stop:new Set(store.visibleRoutes.flatMap(x=>x.stops.map(s=>s.id))),
}))
function entityName(type:EntityType,id:string){
  if(type==='order')return store.data.orders.find(x=>x.id===id)?.number||'Заявка'
  if(type==='route')return store.data.routes.find(x=>x.id===id)?.number||'Рейс'
  if(type==='customer')return store.data.customers.find(x=>x.id===id)?.legalName||'Компания'
  return store.data.outlets.find(x=>x.id===id)?.name||'Магазин'
}
watch(()=>route.query.document,v=>{detailId.value=String(v??'')})
const rows=computed(()=>store.data.documents.filter(d=>
  allowed.value[d.entityType].has(d.entityId)&&(!kind.value||kind.value===d.entityType)&&
  [d.filename,entityName(d.entityType,d.entityId)].join(' ').toLowerCase().includes(search.value.toLowerCase())
).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).map(d=>({
  ...d,entityLabel:entityName(d.entityType,d.entityId),
  typeLabel:kinds.find(x=>x.id===d.entityType)?.title||'Доставка',
})))
const cols=[{key:'filename',label:'Название'},{key:'typeLabel',label:'Связан с'},{key:'entityLabel',label:'Объект'},
  {key:'createdAt',label:'Дата'},{key:'status',label:'Обработка'}]
const selected=computed(()=>rows.value.find(x=>x.id===detailId.value))
watch(()=>form.entityType,()=>{form.entityId='';extract.value=null})
function clean(){
  if(previewUrl.value)URL.revokeObjectURL(previewUrl.value)
  previewUrl.value='';picked.value=null
}
onUnmounted(clean)
function open(){
  clean()
  error.value='';extract.value=null;form.filename=''
  form.entityType=route.query.route?'route':'order'
  form.entityId=String(route.query.route||'')
  modal.value=true
}
function close(){modal.value=false;clean()}
function attach(event:Event){
  clean()
  const file=(event.target as HTMLInputElement).files?.[0]
  error.value=''
  if(!file)return
  if(!['image/jpeg','image/png','image/webp','application/pdf'].includes(file.type)){
    error.value='Допустимы PDF, JPG, PNG и WEBP.';return
  }
  if(file.size>12*1024*1024){error.value='Размер файла не должен превышать 12 МБ.';return}
  picked.value=file
  previewUrl.value=URL.createObjectURL(file)
  if(!form.filename)form.filename=file.name
}
function simulate(){
  error.value=''
  if(!entities.value.some(e=>e.id===form.entityId)){error.value='Сначала выберите связанную заявку или рейс.';return}
  extract.value=sampleWaybill(form.entityType,form.entityId,store.data)
}
function save(){
  error.value=''
  try{
    if(!entities.value.some(e=>e.id===form.entityId))throw new Error('Выберите доступную заявку, рейс или торговую точку.')
    const doc=store.addDocumentMetadata(form.entityType,form.entityId,
      form.filename.trim()||picked.value?.name||'',picked.value?.type||'application/octet-stream',picked.value?.size||0)
    if(extract.value)store.saveSampleWaybill(doc.id,extract.value)
    close()
    store.notify('Запись о накладной сохранена. Оригинал файла не сохранён.')
    detailId.value=doc.id
  }catch(e){error.value=e instanceof Error?e.message:'Не удалось сохранить.'}
}
function verify(){
  try{if(selected.value){store.verifySampleWaybill(selected.value.id);store.notify('Пример полей отмечен как проверенный вручную.')}}
  catch(e){store.notify(e instanceof Error?e.message:'Не удалось подтвердить','error')}
}
function humanSize(bytes:number){return bytes?Math.round(bytes/1024)+' КБ':'—'}
</script>
<template>
  <PageTitle title="Накладные и документы" subtitle="Связь с заказами и рейсами, просмотр приложенного файла и пример распознавания">
    <button v-if="can(store.currentRole,'documents:edit')" class="btn btn-primary" type="button" @click="open"><AppIcon name="file-plus-2" :size="17" /> Новая накладная</button>
  </PageTitle>
  <SectionCard title="Реестр документов" description="Названия, привязка к объектам и сохранённые образцы полей" :flush="true">
    <div class="table-toolbar">
      <label class="search-control"><AppIcon name="search" :size="16" /><input v-model="search" aria-label="Поиск накладных" placeholder="Документ, магазин, рейс..." /></label>
      <select v-model="kind" aria-label="Связь документа"><option value="">Все документы</option><option v-for="t in kinds" :key="t.id" :value="t.id">{{t.title}}</option></select>
    </div>
    <UiTable :rows="rows" :columns="cols" :page-size="12">
      <template #cell-filename="{row}"><strong>{{row.filename}}</strong><small class="table-subtitle">{{humanSize(row.size)}} · оригинал не сохраняется</small></template>
      <template #cell-createdAt="{row}">{{displayDate(row.createdAt)}}</template>
      <template #cell-status="{row}">
        <button v-if="row.sampleExtraction" type="button" class="btn btn-secondary btn-sm" @click="detailId=row.id">Посмотреть образец</button>
        <span v-else class="muted small">Метаданные</span>
      </template>
    </UiTable>
    <EmptyState v-if="!rows.length" title="Документов не найдено" />
  </SectionCard>
  <div class="document-explainer">
    <strong>Как будет выглядеть распознавание</strong>
    <p>Выберите фотографию или PDF, привяжите к рейсу и откройте пример полей. Пример заполняется из тестовой заявки — программа не читает текст самого файла. В промышленной версии здесь потребуется OCR, сверка с 1С, проверка оператором и защищённое хранилище.</p>
  </div>
  <ModalShell :open="modal" title="Накладная" subtitle="Выбор файла, связанный объект и имитация заполнения полей" size="lg" @close="close">
    <form class="stack-lg" @submit.prevent="save">
      <div class="form-grid">
        <label class="field"><span>Привязать к *</span><select v-model="form.entityType"><option v-for="type in kinds" :key="type.id" :value="type.id">{{type.title}}</option></select></label>
        <label class="field"><span>Объект *</span><select v-model="form.entityId" required><option value="">Выберите</option><option v-for="item in entities" :key="item.id" :value="item.id">{{item.label}}</option></select></label>
        <label class="field field-wide"><span>Название документа</span><input v-model="form.filename" maxlength="255" placeholder="Накладная №..."/></label>
        <label class="field field-wide"><span>Фото или PDF (временный просмотр)</span><input type="file" accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf" @change="attach" /></label>
      </div>
      <div v-if="picked" class="document-preview">
        <strong>{{picked.name}}</strong><span>{{humanSize(picked.size)}} · только в открытой форме</span>
        <img v-if="picked.type.startsWith('image/')" :src="previewUrl" alt="Локальный просмотр выбранной накладной"/>
        <a v-else-if="picked.type==='application/pdf'" :href="previewUrl" target="_blank" rel="noopener noreferrer" class="text-link">Посмотреть PDF в браузере →</a>
      </div>
      <div class="document-sample-actions">
        <button type="button" class="btn btn-secondary" @click="simulate"><AppIcon name="scan-text" :size="17" /> Показать пример распознавания</button>
        <span>Имитация на основе выбранной заявки, не OCR.</span>
      </div>
      <div v-if="extract" class="sample-waybill">
        <strong>ПРИМЕР ЗАПОЛНЕНИЯ — НЕ РЕЗУЛЬТАТ РАСПОЗНАВАНИЯ</strong>
        <dl class="details-list">
          <div><dt>Номер</dt><dd>{{extract.invoiceNumber}}</dd></div>
          <div><dt>Дата</dt><dd>{{displayDate(extract.invoiceDate)}}</dd></div>
          <div><dt>Поставщик</dt><dd>{{extract.supplier}}</dd></div>
          <div><dt>Получатель</dt><dd>{{extract.recipient}}</dd></div>
        </dl>
        <div v-for="(line,i) in extract.items" :key="i" class="company-record-line">
          <div><strong>{{line.name}}</strong><small>{{line.quantity}} {{line.unit}} × {{money(line.price)}}</small></div><strong>{{money(line.quantity*line.price)}}</strong>
        </div>
        <div class="order-total"><span>Итого</span><strong>{{money(extract.total)}}</strong></div>
      </div>
      <div class="document-safety-note">Файл не отправляется на сервер и не сохраняется. После закрытия формы просмотр пропадает; сохраняются только название, связь и выбранный образец полей. Не используйте реальные конфиденциальные документы в тестовой версии.</div>
      <div v-if="error" class="form-error" role="alert">{{error}}</div>
      <div class="form-footer"><button type="button" class="btn btn-secondary" @click="close">Отмена</button><button type="submit" class="btn btn-primary">Сохранить запись</button></div>
    </form>
  </ModalShell>
  <ModalShell :open="!!selected" title="Поля накладной" subtitle="Сохранённый образец заполнения — имитация, не OCR" size="lg" @close="detailId=''">
    <div v-if="selected" class="stack-lg">
      <p class="document-safety-note">Оригинал документа не сохранён. Это шаблон, собранный из тестовых заказов. Для проверки нужен исходный бумажный документ.</p>
      <dl class="details-list">
        <div><dt>Документ</dt><dd>{{selected.filename}}</dd></div>
        <div><dt>Связь</dt><dd>{{selected.entityLabel}}</dd></div>
        <div><dt>Пример номера</dt><dd>{{selected.sampleExtraction?.invoiceNumber||'—'}}</dd></div>
        <div><dt>Получатель</dt><dd>{{selected.sampleExtraction?.recipient||'—'}}</dd></div>
        <div><dt>Итого</dt><dd>{{money(selected.sampleExtraction?.total||0)}}</dd></div>
        <div><dt>Признак</dt><dd><StatusBadge :status="selected.sampleExtraction?.verified?'active':'planned'" :label="selected.sampleExtraction?.verified?'Пользователь отметил пример':'Не проверен вручную'" /></dd></div>
      </dl>
      <div v-for="(line,i) in selected.sampleExtraction?.items||[]" :key="i" class="company-record-line">
        <div><strong>{{line.name}}</strong><small>{{line.quantity}} {{line.unit}} × {{money(line.price)}}</small></div><strong>{{money(line.quantity*line.price)}}</strong>
      </div>
      <button v-if="can(store.currentRole,'documents:edit')&&!selected.sampleExtraction?.verified" class="btn btn-primary" @click="verify">Отметить пример как просмотренный вручную</button>
    </div>
  </ModalShell>
</template>
