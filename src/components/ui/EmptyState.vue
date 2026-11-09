<script setup lang="ts">
import AppIcon from './AppIcon.vue'
withDefaults(defineProps<{icon?:string;title:string;description?:string}>(),{icon:'package-open'})
</script>
<template>
  <div class="empty-state">
    <span class="empty-icon"><AppIcon :name="icon" :size="25" /></span>
    <h3>{{title}}</h3><p v-if="description">{{description}}</p><slot />
  </div>
</template>
