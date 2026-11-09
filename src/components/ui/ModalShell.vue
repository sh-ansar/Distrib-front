<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue'
import AppIcon from './AppIcon.vue'
const props=defineProps<{open:boolean;title:string;subtitle?:string;size?:'sm'|'md'|'lg'}>()
const emit=defineEmits<{close:[]}>()
function onKey(e:KeyboardEvent){if(e.key==='Escape' && props.open) emit('close')}
watch(()=>props.open,open=>{if(typeof document!=='undefined')document.body.classList.toggle('modal-open',open)})
onMounted(()=>window.addEventListener('keydown',onKey))
onUnmounted(()=>{window.removeEventListener('keydown',onKey);document.body.classList.remove('modal-open')})
</script>
<template>
  <Teleport to="body">
    <div v-if="open" class="modal-backdrop" @click.self="emit('close')">
      <section class="modal-panel" :class="'modal-'+(size||'md')" role="dialog" aria-modal="true" :aria-label="title">
        <header class="modal-header"><div><h2>{{title}}</h2><p v-if="subtitle" class="muted">{{subtitle}}</p></div><button type="button" class="icon-button" aria-label="Закрыть" @click="emit('close')"><AppIcon name="x" /></button></header>
        <div class="modal-content"><slot /></div>
        <footer v-if="$slots.footer" class="modal-footer"><slot name="footer" /></footer>
      </section>
    </div>
  </Teleport>
</template>
