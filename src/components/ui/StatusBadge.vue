<script setup lang="ts">
import { computed } from 'vue'
import type { OrderStatus, RouteStatus, StopStatus } from '@/types/domain'
import { routeStatuses, statuses } from '@/utils/domain'
const props=defineProps<{status:string;label?:string}>()
const text=computed(()=>props.label || statuses[props.status as OrderStatus] || routeStatuses[props.status as RouteStatus] || ({
  pending:'Ожидает',delivered:'Доставлено',partial:'Частично',failed:'Не доставлено',
  active:'Активен',on_hold:'Приостановлен',
})[props.status as StopStatus] || props.status)
const tone=computed(()=>{
  if(['delivered','completed','active','ready'].includes(props.status))return 'success'
  if(['cancelled','failed','on_hold'].includes(props.status))return 'danger'
  if(['partial','loading','picking','in_route'].includes(props.status))return 'warning'
  if(['confirmed','planned','new'].includes(props.status))return 'info'
  return 'neutral'
})
</script>
<template><span class="status-badge" :class="'status-'+tone"><span class="status-dot" />{{ text }}</span></template>
