<script setup lang="ts">
import AppIcon from './AppIcon.vue'
defineProps<{
  label:string;value:string;icon?:string;hint?:string;
  tone?:'neutral'|'danger'|'positive';to?:string
}>()
</script>
<template>
  <component :is="to?'router-link':'div'" :to="to" class="metric-card" :class="{'metric-link':!!to,'metric-card-warning':tone==='danger'}">
    <div class="metric-top">
      <span>{{label}}</span>
      <span v-if="icon" class="metric-icon" :class="tone?'metric-'+tone:''"><AppIcon :name="icon" :size="18" :stroke-width="1.8" /></span>
    </div>
    <div class="metric-value">{{value}}</div>
    <div v-if="hint" class="metric-hint">{{hint}}</div>
  </component>
</template>
