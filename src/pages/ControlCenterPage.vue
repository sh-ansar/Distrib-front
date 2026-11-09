<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppIcon from '@/components/ui/AppIcon.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import PageTitle from '@/components/ui/PageTitle.vue'
import { useControlItems } from '@/composables/useControlItems'
import { controlCategories, controlCategory, type ControlCategory, type ControlItem, type ControlPriority } from '@/utils/controlCenter'
import { displayDate } from '@/utils/domain'
import { matchesSearch } from '@/utils/search'

const route=useRoute()
const {items,critical,attention}=useControlItems()
const category=ref<ControlCategory|'all'>('all')
const priority=ref<ControlPriority|'all'>('all')
const search=ref('')
const limit=ref(16)

function updateQuery(){
  const requested=String(route.query.category??'')
  category.value=controlCategories.some(c=>c.id===requested)?requested as ControlCategory:'all'
}
updateQuery()
watch(()=>route.query.category,updateQuery)
watch([category,priority,search],()=>{limit.value=16})

const categories=computed(()=>controlCategories
  .map(entry=>({...entry,count:items.value.filter(item=>item.category===entry.id).length}))
  .filter(entry=>entry.count>0)
)
const filtered=computed(()=>items.value.filter(item=>
  (category.value==='all'||item.category===category.value) &&
  (priority.value==='all'||item.priority===priority.value) &&
  matchesSearch(search.value,[item.title,item.detail,item.owner,item.metric,item.action])
))
const shown=computed(()=>filtered.value.slice(0,limit.value))
const criticalShown=computed(()=>shown.value.filter(item=>item.priority==='critical'))
const attentionShown=computed(()=>shown.value.filter(item=>item.priority==='attention'))
function priorityLabel(value:ControlPriority){return value==='critical'?'Срочно':'На контроле'}
function priorityIcon(value:ControlPriority){return value==='critical'?'alert-circle':'clock-3'}
function formatDeadline(value?:string){return value?displayDate(value):'—'}
function actionDescription(item:ControlItem){return item.action+' — '+item.title}
</script>
<template>
  <PageTitle title="Центр контроля" subtitle="Задачи и отклонения из складского учёта, визитов, рейсов, расчётов и документов" />
  <div class="control-summary">
    <button class="control-summary-item" type="button" :class="{'is-selected':priority==='all'}" @click="priority='all'">
      <span class="control-summary-label"><AppIcon name="clipboard-check" :size="17"/> Всего задач</span>
      <strong>{{items.length}}</strong>
      <small>Доступны вашей роли</small>
    </button>
    <button class="control-summary-item" type="button" :class="{'is-selected':priority==='critical'}" @click="priority='critical'">
      <span class="control-summary-label"><AppIcon name="alert-circle" :size="17"/> Требуют решения</span>
      <strong>{{critical}}</strong>
      <small>Просрочки и отказы</small>
    </button>
    <button class="control-summary-item" type="button" :class="{'is-selected':priority==='attention'}" @click="priority='attention'">
      <span class="control-summary-label"><AppIcon name="clock-3" :size="17"/> На контроле</span>
      <strong>{{attention}}</strong>
      <small>Приближаются сроки</small>
    </button>
  </div>

  <div class="control-layout">
    <aside class="control-filters" aria-label="Категории контроля">
      <h2>Направления</h2>
      <button type="button" :class="{'active':category==='all'}" @click="category='all'">
        <AppIcon name="layout-dashboard" :size="17"/><span>Все направления</span><strong>{{items.length}}</strong>
      </button>
      <button v-for="entry in categories" :key="entry.id" type="button"
        :class="{'active':category===entry.id}" @click="category=entry.id">
        <AppIcon :name="entry.icon" :size="17"/><span>{{entry.label}}</span><strong>{{entry.count}}</strong>
      </button>
      <p>Показываются только записи из доступных вам разделов.</p>
    </aside>

    <section class="control-content" aria-labelledby="control-items-title">
      <div class="control-content-head">
        <div><h2 id="control-items-title">{{category==='all'?'Задачи и отклонения':controlCategory(category).label}}</h2>
          <span>Найдено: {{filtered.length}}</span></div>
        <label class="control-search">
          <AppIcon name="search" :size="17" />
          <input v-model="search" placeholder="Номер, компания, товар, сотрудник..." aria-label="Поиск задач" />
        </label>
      </div>
      <div class="control-mobile-categories">
        <label class="field"><span>Направление</span>
          <select v-model="category" aria-label="Направление контроля">
            <option value="all">Все направления ({{items.length}})</option>
            <option v-for="entry in categories" :key="entry.id" :value="entry.id">{{entry.label}} ({{entry.count}})</option>
          </select>
        </label>
      </div>
      <div class="control-filter-label"><span>{{priority==='all'?'По срочности':priorityLabel(priority)}}</span><button v-if="category!=='all'||priority!=='all'||search" type="button" @click="category='all';priority='all';search=''">Сбросить фильтры</button></div>
      <div v-if="criticalShown.length" class="control-group">
        <div class="control-group-heading"><AppIcon name="alert-circle" :size="16"/><h3>Срочно</h3><span>{{criticalShown.length}} из {{filtered.filter(x=>x.priority==='critical').length}}</span></div>
        <router-link v-for="item in criticalShown" :key="item.id" :to="item.to"
          class="control-record" :aria-label="actionDescription(item)">
          <div class="control-record-mark critical"><AppIcon :name="controlCategory(item.category).icon" :size="19"/></div>
          <div class="control-record-body">
            <div class="control-record-context"><span>{{controlCategory(item.category).label}}</span><span>{{priorityLabel(item.priority)}}</span></div>
            <strong>{{item.title}}</strong><p>{{item.detail}}</p>
            <div class="control-record-meta">
              <span><AppIcon name="user-round" :size="13"/> {{item.owner}}</span>
              <span v-if="item.deadline"><AppIcon name="calendar-days" :size="13"/> {{formatDeadline(item.deadline)}}</span>
              <span v-if="item.metric">{{item.metric}}</span>
            </div>
          </div>
          <span class="control-record-action">{{item.action}} <AppIcon name="chevron-right" :size="17"/></span>
        </router-link>
      </div>
      <div v-if="attentionShown.length" class="control-group">
        <div class="control-group-heading"><AppIcon name="clock-3" :size="16"/><h3>На контроле</h3><span>{{attentionShown.length}} из {{filtered.filter(x=>x.priority==='attention').length}}</span></div>
        <router-link v-for="item in attentionShown" :key="item.id" :to="item.to"
          class="control-record" :aria-label="actionDescription(item)">
          <div class="control-record-mark attention"><AppIcon :name="controlCategory(item.category).icon" :size="19"/></div>
          <div class="control-record-body">
            <div class="control-record-context"><span>{{controlCategory(item.category).label}}</span><span>{{priorityLabel(item.priority)}}</span></div>
            <strong>{{item.title}}</strong><p>{{item.detail}}</p>
            <div class="control-record-meta">
              <span><AppIcon name="user-round" :size="13"/> {{item.owner}}</span>
              <span v-if="item.deadline"><AppIcon name="calendar-days" :size="13"/> {{formatDeadline(item.deadline)}}</span>
              <span v-if="item.metric">{{item.metric}}</span>
            </div>
          </div>
          <span class="control-record-action">{{item.action}} <AppIcon name="chevron-right" :size="17"/></span>
        </router-link>
      </div>
      <div v-if="!filtered.length" class="control-empty"><EmptyState icon="check-circle-2" title="Активных задач по фильтру нет" description="Проверьте другие направления или измените поисковый запрос." /></div>
      <div v-if="shown.length<filtered.length" class="control-more">
        <button type="button" class="btn btn-secondary" @click="limit+=16">Показать ещё ({{filtered.length-shown.length}})</button>
      </div>
      <p class="control-footnote">Это оперативные сигналы из тестовых записей, а не автоматические поручения в 1С. Задача исчезает только после изменения исходного статуса, оплаты или новой сверки. Ответственный отдел указывается там, где конкретный сотрудник не назначен.</p>
    </section>
  </div>
</template>
