<script setup lang="ts">
defineProps<{
  label:string; value:string; icon?:string; hint?:string; tone?:'neutral'|'danger'|'positive'; to?:string
}>()
</script>
<template>
  <component :is="to?'router-link':'div'" :to="to" class="metric-card" :class="{'metric-link':!!to}">
    <div class="metric-top">{{label}}</div>
    <div class="metric-value">{{value}}</div>
    <div v-if="hint" class="metric-hint">{{hint}}</div>
  </component>
</template>
