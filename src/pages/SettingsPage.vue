<script setup lang="ts">
import { computed, ref } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import PageTitle from '@/components/ui/PageTitle.vue'
import SectionCard from '@/components/ui/SectionCard.vue'
import { roleLabels, can, nav } from '@/access'
import { useDistributionStore } from '@/stores/distribution'
import { displayDate } from '@/utils/domain'
import type { Role } from '@/types/domain'
const store=useDistributionStore()
const confirmReset=ref(false)
const recent=computed(()=>[...store.data.activities].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,12))
const roles=Object.keys(roleLabels) as Role[]
const sections=nav.filter(n=>n.section!=='settings')
function reset(){if(confirmReset.value){store.resetDemo();confirmReset.value=false}}
</script>
<template>
  <PageTitle eyebrow="ПАРАМЕТРЫ СИСТЕМЫ" title="Настройки и интеграции" subtitle="Источники данных, безопасность, журнал изменений и роли" />
  <div class="settings-grid">
    <SectionCard title="Состояние подключений" description="Промышленный запуск будет отдельным этапом">
      <div class="connection-row"><span class="connection-icon"><AppIcon name="database" /></span><div><strong>1С: Предприятие</strong><small>Номенклатура, цены, контрагенты, долги, остатки</small></div><span class="status-badge status-neutral">Не подключена</span></div>
      <div class="connection-row"><span class="connection-icon"><AppIcon name="shield-check" /></span><div><strong>Серверная авторизация</strong><small>Сессии, роли, аудит и доступ к данным</small></div><span class="status-badge status-neutral">Не подключена</span></div>
      <div class="connection-row"><span class="connection-icon"><AppIcon name="files" /></span><div><strong>Хранилище накладных</strong><small>PDF, фото, документы и права доступа</small></div><span class="status-badge status-neutral">Не подключено</span></div>
      <div class="connection-row"><span class="connection-icon"><AppIcon name="truck" /></span><div><strong>Мобильная система представителей</strong><small>Импорт заявок, обратные статусы</small></div><span class="status-badge status-neutral">Требует обследования</span></div>
    </SectionCard>
    <SectionCard title="Режим демонстрации" description="Все данные вымышлены и хранятся локально">
      <div class="settings-demo"><span class="demo-large-icon"><AppIcon name="sparkles" :size="28" /></span><div><strong>Интерактивная демоверсия</strong><p>Можно создавать магазины и заявки, планировать рейсы, менять статусы и моделировать сверки. Изменения не уходят в 1С.</p></div></div>
      <div class="demo-actions">
        <label class="checkbox-label"><input v-model="confirmReset" type="checkbox" /> Я понимаю, что все изменения демоверсии в этом браузере будут потеряны.</label>
        <button type="button" class="btn btn-outline-danger" :disabled="!confirmReset" @click="reset"><AppIcon name="refresh-cw" :size="17" /> Сбросить демоданные</button>
      </div>
    </SectionCard>
    <SectionCard title="Роли и видимость" description="Первый уровень UX-ограничений, не замена backend RBAC">
      <div class="permissions-scroll"><table class="permissions-table"><thead><tr><th>Роль</th><th v-for="s in sections" :key="s.section" :title="s.label">{{s.label}}</th></tr></thead><tbody>
        <tr v-for="role in roles" :key="role"><th>{{roleLabels[role]}}</th><td v-for="s in sections" :key="s.section"><AppIcon :name="can(role,s.section)?'check':'x'" :size="16" :class="can(role,s.section)?'text-success':'muted-faint'" /></td></tr>
      </tbody></table></div>
    </SectionCard>
    <SectionCard title="Журнал действий" description="Локальные демонстрационные события">
      <div v-for="a in recent" :key="a.id" class="activity-row"><span class="activity-mark"><AppIcon name="history" :size="16" /></span><div><strong>{{a.message}}</strong><small>{{displayDate(a.createdAt)}} · {{store.data.employees.find(e=>e.id===a.actorId)?.name||'Система'}}</small></div></div>
      <p v-if="!recent.length" class="muted small">Пока нет записей.</p>
    </SectionCard>
  </div>
</template>
