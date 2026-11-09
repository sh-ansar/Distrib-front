<script setup lang="ts">
defineProps<{title:string;description?:string;flush?:boolean}>()
</script>
<template><section class="section-card"><header class="section-card-header"><div><h2>{{title}}</h2><p v-if="description" class="muted">{{description}}</p></div><div class="section-actions"><slot name="action" /></div></header><div :class="flush?'section-card-body-flush':'section-card-body'"><slot /></div></section></template>
