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
const mobileItems=computed(()=>items.value.filter(item=>
  ['dashboard','companies','outlets','orders','routes'].includes(item.section)).slice(0,5))
const pageTitle=computed(()=>String(route.meta.title||'Обзор'))
watch(()=>route.fullPath,()=>{mobileOpen.value=false;userDropdown.value=false})
watch(()=>store.currentUserId,()=>{
  if(!can(store.currentRole,(route.meta.section as Section)||'dashboard'))router.push('/')
})
function switchUser(event:Event){store.changeDemoUser((event.target as HTMLSelectElement).value)}
function navigateSearch(){
  const query=store.search.trim()
  if(!query)return
  if(can(store.currentRole,'companies'))router.push({path:'/companies',query:{q:query}})
  else if(can(store.currentRole,'outlets'))router.push({path:'/outlets',query:{q:query}})
  else if(can(store.currentRole,'orders'))router.push({path:'/orders',query:{q:query}})
}
</script>
<template>
  <div class="app-frame">
    <div v-if="mobileOpen" class="sidebar-scrim" @click="mobileOpen=false" />
    <aside class="sidebar" :class="{'sidebar-open':mobileOpen}">
      <router-link to="/" class="brand" aria-label="Darmen UI — главная">
        <span class="brand-text"><strong>Darmen UI</strong><small>Управление дистрибуцией</small></span>
      </router-link>
      <nav class="main-nav" aria-label="Разделы системы">
        <template v-for="group in ['main','operations','admin']" :key="group">
          <div v-if="items.some(item=>item.group===group)" class="nav-group">
            <p class="nav-group-label">{{group==='main'?'РАБОТА':group==='operations'?'ОПЕРАЦИИ':'НАСТРОЙКИ'}}</p>
            <router-link v-for="item in items.filter(item=>item.group===group)" :key="item.section" :to="item.path"
              class="nav-link" :class="{'active':route.meta.section===item.section}" :aria-current="route.meta.section===item.section?'page':undefined">
              <span>{{item.label}}</span>
            </router-link>
          </div>
        </template>
      </nav>
      <div class="sidebar-bottom">
        <div class="sidebar-profile"><div><strong>{{store.currentUser?.name}}</strong><small>{{roleLabels[store.currentRole]}}</small></div></div>
      </div>
    </aside>
    <div class="app-main">
      <header class="topbar">
        <div class="topbar-left">
          <button class="icon-button mobile-menu" type="button" aria-label="Открыть меню" @click="mobileOpen=true"><AppIcon name="menu" /></button>
          <span class="mobile-brand-name">Darmen UI</span>
          <span class="topbar-breadcrumb"><strong>{{pageTitle}}</strong></span>
        </div>
        <div class="topbar-right">
          <form class="global-search" role="search" @submit.prevent="navigateSearch">
            <input v-model="store.search" aria-label="Поиск компаний" placeholder="Найти компанию, БИН, магазин..." />
            <button type="submit" aria-label="Искать">Найти</button>
          </form>
          <div class="user-menu-wrap">
            <button type="button" class="topbar-account" aria-label="Выбрать демонстрационную роль" :aria-expanded="userDropdown" @click="userDropdown=!userDropdown">
              <span class="user-menu-name">{{store.currentUser?.name}}</span><span aria-hidden="true">⌄</span>
            </button>
            <div v-if="userDropdown" class="account-popover">
              <span class="eyebrow">Демонстрационный пользователь</span>
              <label class="field"><span>Роль</span><select :value="store.currentUserId" @change="switchUser">
                <option v-for="employee in store.data.employees.filter(e=>e.active)" :key="employee.id" :value="employee.id">{{employee.name}} · {{roleLabels[employee.role]}}</option>
              </select></label>
              <p class="muted small">Смена роли работает только в демонстрации.</p>
            </div>
          </div>
        </div>
      </header>
      <form class="mobile-global-search" role="search" @submit.prevent="navigateSearch">
        <label class="mobile-search-label">
          <span class="sr-only">Найти компанию, магазин или БИН</span>
          <input v-model="store.search" placeholder="Компания, БИН, магазин..." />
        </label>
        <button type="submit" class="btn btn-primary">Поиск</button>
      </form>
      <div class="environment-note">Демо · вымышленные данные · 1С не подключена</div>
      <main class="content"><RouterView /></main>
      <footer class="app-footer"><span>Darmen UI</span><span>Демонстрационная версия</span></footer>
    </div>
    <nav v-if="mobileItems.length" class="mobile-bottom-nav" aria-label="Быстрые разделы" :style="{gridTemplateColumns:'repeat('+mobileItems.length+',minmax(0,1fr))'}">
      <router-link v-for="item in mobileItems" :key="item.section" :to="item.path" :aria-current="route.meta.section===item.section?'page':undefined"
        :class="{'selected':route.meta.section===item.section}">{{item.label}}</router-link>
    </nav>
    <ToastHost />
  </div>
</template>
