<script setup lang="ts" generic="T extends object">
import { computed, ref, watch } from 'vue'
import EmptyState from './EmptyState.vue'

interface Column {
  key: string
  label: string
  align?: 'left' | 'right'
  width?: string
  sortable?: boolean
}
const props=withDefaults(defineProps<{
  rows:T[]; columns:Column[]; rowKey?:string; emptyTitle?:string;
  clickable?:boolean; pageSize?:number
}>(), {rowKey:'id',emptyTitle:'Ничего не найдено',clickable:false,pageSize:10})
const emit=defineEmits<{rowClick:[row:T]}>()
function cell(row:T,key:string):unknown{return (row as Record<string,unknown>)[key]}
const sortKey=ref('')
const sortDir=ref<1|-1>(1)
const page=ref(1)
function sort(key:string){
  if(sortKey.value===key) sortDir.value=sortDir.value===1?-1:1
  else {sortKey.value=key;sortDir.value=1}
  page.value=1
}
watch(()=>props.rows,()=>{page.value=1})
const sorted=computed(()=>{
  if(!sortKey.value) return props.rows
  return [...props.rows].sort((a,b)=>{
    const av=String(cell(a,sortKey.value)??'')
    const bv=String(cell(b,sortKey.value)??'')
    return av.localeCompare(bv,'ru',{numeric:true})*sortDir.value
  })
})
const totalPages=computed(()=>Math.max(1,Math.ceil(sorted.value.length/props.pageSize)))
const currentPage=computed(()=>Math.min(page.value,totalPages.value))
const paginated=computed(()=>sorted.value.slice((currentPage.value-1)*props.pageSize,currentPage.value*props.pageSize))
</script>
<template>
  <div class="table-wrap">
    <div class="table-scroll">
      <table class="data-table">
        <thead><tr>
          <th v-for="col in columns" :key="col.key" :style="{width:col.width}" :class="{'align-right':col.align==='right'}">
            <button v-if="col.sortable" class="table-sort" type="button" @click="sort(col.key)">{{col.label}} <span aria-hidden="true">{{sortKey===col.key?(sortDir===1?'↑':'↓'):'↕'}}</span></button>
            <span v-else>{{col.label}}</span>
          </th>
        </tr></thead>
        <tbody>
          <tr v-for="(row,index) in paginated" :key="String(cell(row,rowKey)??index)" :class="{'clickable-row':clickable}" @click="clickable&&emit('rowClick',row)">
            <td v-for="col in columns" :key="col.key" :class="{'align-right':col.align==='right'}">
              <slot :name="'cell-'+col.key" :row="row" :value="cell(row,col.key)">{{cell(row,col.key)??'—'}}</slot>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <!-- Compact stacked cards use the same cells and actions, with no sideways scroll. -->
    <div class="mobile-records">
      <article v-for="(row,index) in paginated" :key="String(cell(row,rowKey)??index)" class="mobile-record">
        <div v-if="columns[0]" class="mobile-record-title">
          <slot :name="'cell-'+columns[0].key" :row="row" :value="cell(row,columns[0].key)">{{cell(row,columns[0].key)??'—'}}</slot>
        </div>
        <dl class="mobile-record-details">
          <div v-for="col in columns.slice(1)" :key="col.key" class="mobile-record-field">
            <dt>{{col.label}}</dt>
            <dd><slot :name="'cell-'+col.key" :row="row" :value="cell(row,col.key)">{{cell(row,col.key)??'—'}}</slot></dd>
          </div>
        </dl>
        <button v-if="clickable" class="mobile-record-open" type="button" @click="emit('rowClick',row)">Открыть карточку <span aria-hidden="true">→</span></button>
      </article>
    </div>
    <EmptyState v-if="rows.length===0" :title="emptyTitle" description="Попробуйте изменить фильтры или добавьте новую запись." />
    <div v-if="rows.length>pageSize" class="pagination">
      <span>{{(currentPage-1)*pageSize+1}}–{{Math.min(currentPage*pageSize,rows.length)}} из {{rows.length}}</span>
      <div class="pagination-buttons">
        <button type="button" class="icon-button" aria-label="Предыдущая страница" :disabled="currentPage===1" @click="page=Math.max(1,currentPage-1)">←</button>
        <span>{{currentPage}} / {{totalPages}}</span>
        <button type="button" class="icon-button" aria-label="Следующая страница" :disabled="currentPage===totalPages" @click="page=Math.min(totalPages,currentPage+1)">→</button>
      </div>
    </div>
  </div>
</template>
