<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from './AppIcon.vue'
import type { OrderStatus, RouteStatus, StopStatus } from '@/types/domain'
import { routeStatuses, statuses } from '@/utils/domain'
const props=defineProps<{status:string;label?:string}>()
const text=computed(()=>props.label || statuses[props.status as OrderStatus] || routeStatuses[props.status as RouteStatus] || ({
  pending:'Ожидает',delivered:'Доставлено',partial:'Частично',failed:'Не доставлено',
  in_progress:'В работе',skipped:'Не состоялся',
  active:'Активен',on_hold:'Приостановлен',
})[props.status as StopStatus] || props.status)
const tone=computed(()=>{
  if(['delivered','completed','active','ready'].includes(props.status))return 'success'
  if(['cancelled','failed','on_hold','skipped'].includes(props.status))return 'danger'
  if(['partial','loading','picking','in_route','in_progress'].includes(props.status))return 'warning'
  if(['confirmed','planned','new'].includes(props.status))return 'info'
  return 'neutral'
})
const statusIcon=computed(()=>tone.value==='success'?'check-circle-2':
  tone.value==='danger'?'alert-circle':tone.value==='warning'?'alert-triangle':
  tone.value==='info'?'clock-3':'circle')
</script>
<template>
  <span class="status-badge" :class="'status-'+tone">
    <AppIcon :name="statusIcon" :size="13" :stroke-width="1.9" />
    <span>{{text}}</span>
  </span>
</template>
