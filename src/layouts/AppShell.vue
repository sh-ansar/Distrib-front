<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
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
const mobilePriority=computed<Section[]>(()=>{
  switch(store.currentRole){
    case 'sales':return ['control','visits','orders','storestock']
    case 'driver':
    case 'forwarder':return ['deliveries','control','returns','documents']
    case 'warehouse':return ['control','inventory','returns','orders']
    case 'dispatcher':return ['control','deliveries','returns','routes']
    case 'accountant':return ['control','debts','companies','documents']
    case 'supervisor':return ['control','visits','companies','salesplans']
    case 'director':return ['control','routes','companies','debts']
    default:return ['control','orders','routes','inventory']
  }
})
const mobileItems=computed(()=>mobilePriority.value
  .map(section=>items.value.find(item=>item.section===section))
  .filter((item):item is (typeof nav)[number]=>Boolean(item)).slice(0,4))
const moreSelected=computed(()=>!!route.meta.section && !mobileItems.value.some(item=>item.section===route.meta.section))
const shortLabels:Partial<Record<Section,string>>={
  dashboard:'Обзор',control:'Контроль',deliveries:'Доставка',returns:'Возвраты',companies:'Компании',outlets:'Магазины',visits:'Визиты',orders:'Заявки',
  debts:'Долги',consignment:'Реализация',inventory:'Склад',storestock:'У клиентов',
  salesplans:'Планы',fleet:'Автопарк',routes:'Рейсы',documents:'Документы',team:'Команда',
  settings:'Настройки',
}
const pageTitle=computed(()=>String(route.meta.title||'Обзор'))
watch(()=>route.fullPath,()=>{mobileOpen.value=false;userDropdown.value=false})
watch(()=>store.currentUserId,()=>{
  if(!can(store.currentRole,(route.meta.section as Section)||'dashboard'))router.push('/')
})
function onKey(e:KeyboardEvent){
  if(e.key==='Escape'){mobileOpen.value=false;userDropdown.value=false}
}
onMounted(()=>window.addEventListener('keydown',onKey))
onUnmounted(()=>window.removeEventListener('keydown',onKey))
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
    <button v-if="mobileOpen" type="button" class="sidebar-scrim" aria-label="Закрыть меню" @click="mobileOpen=false" />
    <aside id="app-navigation" class="sidebar" :class="{'sidebar-open':mobileOpen}" aria-label="Навигация Darmen New Wave">
      <router-link to="/" class="brand" aria-label="Darmen New Wave — главная">
        <span class="brand-mark"><AppIcon name="route" :size="20" :stroke-width="2" /></span>
        <span class="brand-text"><strong>Darmen New Wave</strong><small>Управление дистрибуцией</small></span>
      </router-link>
      <nav class="main-nav" aria-label="Основные разделы">
        <template v-for="group in ['main','operations','admin']" :key="group">
          <div v-if="items.some(item=>item.group===group)" class="nav-group">
            <p class="nav-group-label">{{group==='main'?'РАБОТА':group==='operations'?'ОПЕРАЦИИ':'НАСТРОЙКИ'}}</p>
            <router-link v-for="item in items.filter(item=>item.group===group)" :key="item.section"
              :to="item.path" class="nav-link" :class="{'active':route.meta.section===item.section}"
              :aria-current="route.meta.section===item.section?'page':undefined">
              <span class="nav-icon"><AppIcon :name="item.icon" :size="18" :stroke-width="1.85" /></span>
              <span class="nav-link-label">{{item.label}}</span>
            </router-link>
          </div>
        </template>
      </nav>
      <div class="sidebar-bottom">
        <div class="sidebar-profile">
          <span class="profile-mark"><AppIcon name="user-round" :size="17" /></span>
          <div><strong>{{store.currentUser?.name}}</strong><small>{{roleLabels[store.currentRole]}}</small></div>
        </div>
      </div>
    </aside>
    <div class="app-main">
      <header class="topbar">
        <div class="topbar-left">
          <button class="icon-button mobile-menu" type="button" aria-label="Открыть меню" aria-controls="app-navigation"
            :aria-expanded="mobileOpen" @click="mobileOpen=!mobileOpen"><AppIcon name="menu" :size="21" /></button>
          <span class="mobile-brand-name">Darmen New Wave</span>
          <span class="topbar-breadcrumb"><strong>{{pageTitle}}</strong></span>
        </div>
        <div class="topbar-right">
          <form class="global-search" role="search" @submit.prevent="navigateSearch">
            <AppIcon name="search" :size="17" />
            <input v-model="store.search" aria-label="Поиск компаний" placeholder="Компания, БИН, магазин..." />
            <button type="submit" aria-label="Искать">Найти</button>
          </form>
          <div class="user-menu-wrap">
            <button type="button" class="topbar-account" aria-label="Настройки тестового пользователя"
              :aria-expanded="userDropdown" @click="userDropdown=!userDropdown">
              <span class="topbar-account-avatar"><AppIcon name="user-round" :size="17" /></span>
              <span class="user-menu-name">{{store.currentUser?.name}}</span>
              <AppIcon name="chevron-down" :size="16" />
            </button>
            <div v-if="userDropdown" class="account-popover">
              <span class="eyebrow">Тестовая учётная запись</span>
              <label class="field"><span>Роль</span><select :value="store.currentUserId" @change="switchUser">
                <option v-for="employee in store.data.employees.filter(e=>e.active)" :key="employee.id" :value="employee.id">
                  {{employee.name}} · {{roleLabels[employee.role]}}
                </option>
              </select></label>
              <p class="muted small">Данные и права пока работают в браузере. Реальная авторизация и 1С не подключены.</p>
            </div>
          </div>
        </div>
      </header>
      <form class="mobile-global-search" role="search" @submit.prevent="navigateSearch">
        <label class="mobile-search-label">
          <span class="sr-only">Найти компанию, магазин или БИН</span>
          <input v-model="store.search" placeholder="Компания, БИН, магазин..." />
        </label>
        <button type="submit" class="btn btn-primary"><AppIcon name="search" :size="16" /> Найти</button>
      </form>
      <main class="content"><RouterView /></main>
      <footer class="app-footer"><span>Darmen New Wave</span><span>Тестовые данные · 1С не подключена</span></footer>
    </div>
    <nav v-if="mobileItems.length" class="mobile-bottom-nav" aria-label="Быстрая навигация"
      :style="{gridTemplateColumns:'repeat('+(mobileItems.length+1)+',minmax(0,1fr))'}">
      <router-link v-for="item in mobileItems" :key="item.section" :to="item.path"
        :aria-current="route.meta.section===item.section?'page':undefined"
        :class="{'selected':route.meta.section===item.section}">
        <AppIcon :name="item.icon" :size="19" :stroke-width="1.8" />
        <span>{{shortLabels[item.section]||item.label}}</span>
      </router-link>
      <button type="button" class="mobile-more" aria-label="Все разделы" aria-controls="app-navigation"
        :aria-expanded="mobileOpen" :class="{'selected':moreSelected||mobileOpen}" @click="mobileOpen=!mobileOpen">
        <AppIcon :name="mobileOpen?'x':'menu'" :size="19" :stroke-width="1.8" /><span>Все</span>
      </button>
    </nav>
    <ToastHost />
  </div>
</template>
