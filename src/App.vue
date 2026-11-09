<script setup lang="ts">
import AppShell from '@/layouts/AppShell.vue'
import { useDistributionStore } from '@/stores/distribution'
const store=useDistributionStore()
</script>
<template>
  <div v-if="!store.demoMode" class="setup-screen">
    <div class="setup-card">
      <span class="brand-icon">D</span>
      <h1>ITP Distribution</h1>
      <p>Режим API включён, но backend и авторизация пока не подключены.</p>
      <p>Приложение не показывает вымышленные данные как реальные и не имитирует успешные операции.</p>
      <code>VITE_DATA_MODE=demo</code>
      <p class="muted">Для просмотра интерактивной демоверсии переключите режим сборки в demo. Для промышленного режима требуется подключить серверное API, права доступа и проверенную авторизацию.</p>
    </div>
  </div>
  <AppShell v-else />
</template>
