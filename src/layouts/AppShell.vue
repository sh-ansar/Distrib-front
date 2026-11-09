<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '@/components/ui/AppIcon.vue'
import ToastHost from '@/components/ui/ToastHost.vue'
import { can, nav, roleLabels, type Section } from '@/access'
import { useDistributionStore } from '@/stores/distribution'

const store=useDistributionStore()
const route=useRoute()
const router=useRouter()
const mobileOpen=ref(false)
const userDropdown=ref(false)
const items=computed(()=>nav.filter(item=>can(store.currentRole,item.section)))
const pageTitle=computed(()=>String(route.meta.title||'Обзор'))
const initials=computed(()=>store.currentUser?.initials||'—')
watch(()=>route.fullPath,()=>{mobileOpen.value=false;userDropdown.value=false})
watch(()=>store.currentUserId,()=>{if(!can(store.currentRole,(route.meta.section as Section)||'dashboard'))router.push('/')})
function switchUser(event:Event){store.changeDemoUser((event.target as HTMLSelectElement).value)}
function navigateSearch(){
  const query=store.search.trim()
  if(query && can(store.currentRole,'outlets'))router.push({path:'/outlets',query:{q:query}})
  else if(query && can(store.currentRole,'orders'))router.push({path:'/orders',query:{q:query}})
}
</script>
<template>
  <div class="app-frame">
    <div v-if="mobileOpen" class="sidebar-scrim" @click="mobileOpen=false" />
    <aside class="sidebar" :class="{'sidebar-open':mobileOpen}">
      <router-link to="/" class="brand" aria-label="ITP Distribution — главная">
        <span class="brand-symbol"><span>D</span></span><span class="brand-text">ITP <strong>Distribution</strong><small>Управление дистрибуцией</small></span>
      </router-link>
      <div class="demo-indicator"><span class="demo-pulse" /> ДЕМОНСТРАЦИЯ <span>· без 1С</span></div>
      <nav class="main-nav" aria-label="Разделы системы">
        <template v-for="group in ['main','operations','admin']" :key="group">
          <div v-if="items.some(item=>item.group===group)" class="nav-group">
            <p class="nav-group-label">{{group==='main'?'УПРАВЛЕНИЕ':group==='operations'?'ОПЕРАЦИИ':'СИСТЕМА'}}</p>
            <router-link v-for="item in items.filter(item=>item.group===group)" :key="item.section" :to="item.path"
              class="nav-link" :class="{'active':route.meta.section===item.section}" :aria-current="route.meta.section===item.section?'page':undefined">
              <AppIcon :name="item.icon" :size="19" /><span>{{item.label}}</span>
            </router-link>
          </div>
        </template>
      </nav>
      <div class="sidebar-bottom">
        <div class="sidebar-help"><AppIcon name="shield-check" :size="18" /><div><strong>Данные защищены</strong><span>Демо без реальных клиентов</span></div></div>
        <div class="sidebar-profile"><span class="avatar">{{initials}}</span><div><strong>{{store.currentUser?.name}}</strong><small>{{roleLabels[store.currentRole]}}</small></div></div>
      </div>
    </aside>
    <div class="app-main">
      <header class="topbar">
        <div class="topbar-left"><button class="icon-button mobile-menu" type="button" aria-label="Открыть меню" @click="mobileOpen=true"><AppIcon name="menu" /></button>
          <span class="topbar-breadcrumb">Система дистрибуции <AppIcon name="chevron-right" :size="15" /><strong>{{pageTitle}}</strong></span>
        </div>
        <div class="topbar-right">
          <form class="global-search" role="search" @submit.prevent="navigateSearch"><AppIcon name="search" :size="18" /><input v-model="store.search" aria-label="Поиск по торговым точкам и заявкам" placeholder="Поиск магазина или заявки..." /><kbd>↵</kbd></form>
          <span class="topbar-divider" />
          <div class="user-menu-wrap">
            <button type="button" class="topbar-account" aria-label="Выбрать демонстрационную роль" :aria-expanded="userDropdown" @click="userDropdown=!userDropdown">
              <span class="avatar avatar-small">{{initials}}</span><span class="user-menu-name">{{store.currentUser?.name}}</span><AppIcon name="chevron-down" :size="16" />
            </button>
            <div v-if="userDropdown" class="account-popover">
              <span class="eyebrow">Демонстрационный пользователь</span>
              <label class="field"><span>Сменить роль и доступный интерфейс</span><select :value="store.currentUserId" @change="switchUser"><option v-for="employee in store.data.employees.filter(e=>e.active)" :key="employee.id" :value="employee.id">{{employee.name}} · {{roleLabels[employee.role]}}</option></select></label>
              <p class="muted small">Переключение ролей только для UI-демо. Настоящая авторизация будет на backend.</p>
            </div>
          </div>
        </div>
      </header>
      <div class="demo-banner"><AppIcon name="info" :size="17" /><span><strong>Демо-режим.</strong> Все компании, суммы, заявки и люди вымышлены. Данные сохраняются только в этом браузере; 1С не подключена.</span><router-link v-if="can(store.currentRole,'settings')" to="/settings">О режиме</router-link></div>
      <main class="content"><RouterView /></main>
      <footer class="app-footer"><span>© {{new Date().getFullYear()}} ITP Distribution</span><span>Prototype · Frontend v0.1 · API не подключён</span></footer>
    </div>
    <ToastHost />
  </div>
</template>
