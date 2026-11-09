<script setup lang="ts">
defineProps<{eyebrow?:string;title:string;subtitle?:string}>()
</script>
<template>
  <div class="page-title-wrap">
    <div><h1 class="page-title">{{title}}</h1><p v-if="subtitle" class="page-subtitle">{{subtitle}}</p></div>
    <div class="page-title-actions"><slot /></div>
  </div>
</template>
