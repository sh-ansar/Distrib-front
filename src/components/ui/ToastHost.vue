<script setup lang="ts">
import { useDistributionStore } from '@/stores/distribution'
import AppIcon from './AppIcon.vue'
const store=useDistributionStore()
</script>
<template>
  <div v-if="store.notice" class="toast" :class="'toast-'+store.notice.tone" role="status">
    <AppIcon :name="store.notice.tone==='error'?'alert-circle':'check-circle-2'" />
    <span>{{store.notice.text}}</span><button type="button" class="icon-button" aria-label="Закрыть сообщение" @click="store.notice=null"><AppIcon name="x" :size="16" /></button>
  </div>
</template>
