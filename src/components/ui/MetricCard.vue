<script setup lang="ts">
import AppIcon from './AppIcon.vue'
withDefaults(defineProps<{label:string;value:string;icon:string;hint?:string;tone?:'neutral'|'danger'|'positive';to?:string}>(),{tone:'neutral'})
</script>
<template>
  <component :is="to?'router-link':'div'" :to="to" class="metric-card" :class="{'metric-link':!!to}">
    <div class="metric-top"><span>{{label}}</span><span class="metric-icon" :class="'metric-'+tone"><AppIcon :name="icon" :size="20" /></span></div>
    <div class="metric-value">{{value}}</div><div v-if="hint" class="metric-hint">{{hint}}</div>
  </component>
</template>
