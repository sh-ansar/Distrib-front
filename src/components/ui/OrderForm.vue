<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useDistributionStore } from '@/stores/distribution'
import { isoDay, money } from '@/utils/domain'
import AppIcon from './AppIcon.vue'
import type { OrderItem } from '@/types/domain'
const props=defineProps<{initialOutletId?:string}>()
const emit=defineEmits<{created:[id:string];cancel:[]}>()
const store=useDistributionStore()
const form=reactive({outletId:props.initialOutletId||'',deliveryDate:isoDay(new Date(Date.now()+86400000)),notes:''})
const lines=ref<Array<{productId:string;quantity:number}>>([{productId:'',quantity:1}])
const error=ref('')
const outlets=computed(()=>store.visibleOutlets.filter(o=>o.active))
const items=computed<OrderItem[]>(()=>lines.value.filter(l=>!!l.productId).map(l=>({
  productId:l.productId,quantity:Number(l.quantity),
  price:store.data.products.find(p=>p.id===l.productId)?.price??0,
})))
const total=computed(()=>items.value.reduce((sum,i)=>sum+i.quantity*i.price,0))
function submit(){
  error.value=''
  try {
    const order=store.createOrder({...form,items:items.value})
    store.notify('Заявка '+order.number+' создана (демо).')
    emit('created',order.id)
  } catch(e){error.value=e instanceof Error?e.message:'Не удалось создать заявку'}
}
</script>
<template>
  <form class="stack-lg" @submit.prevent="submit">
    <div class="form-grid">
      <label class="field field-wide"><span>Торговая точка *</span><select v-model="form.outletId" required :disabled="!!initialOutletId"><option value="">Выберите магазин</option><option v-for="o in outlets" :key="o.id" :value="o.id">{{o.name}} — {{o.address}}</option></select></label>
      <label class="field"><span>Дата доставки *</span><input v-model="form.deliveryDate" type="date" :min="isoDay()" required /></label>
      <label class="field field-wide"><span>Комментарий</span><textarea v-model="form.notes" rows="2" placeholder="Инструкции для склада или водителя" /></label>
    </div>
    <div class="form-section-title"><strong>Товарные позиции</strong><button type="button" class="btn btn-secondary btn-sm" @click="lines.push({productId:'',quantity:1})"><AppIcon name="plus" :size="16" /> Добавить</button></div>
    <div v-for="(line,index) in lines" :key="index" class="order-item-row">
      <label class="field"><span>Товар</span><select v-model="line.productId" required><option value="">Выберите товар</option><option v-for="p in store.data.products.filter(p=>p.active)" :key="p.id" :value="p.id">{{p.name}} · {{money(p.price)}}</option></select></label>
      <label class="field quantity-field"><span>Количество</span><input v-model.number="line.quantity" type="number" min="1" step="1" required /></label>
      <button type="button" class="icon-button remove-line" :disabled="lines.length<=1" aria-label="Удалить позицию" @click="lines.splice(index,1)"><AppIcon name="x" /></button>
    </div>
    <div class="order-total"><span>Сумма заявки</span><strong>{{money(total)}}</strong></div>
    <div v-if="error" class="form-error" role="alert">{{error}}</div>
    <div class="form-footer"><button type="button" class="btn btn-secondary" @click="emit('cancel')">Отмена</button><button class="btn btn-primary" type="submit"><AppIcon name="check" :size="17" /> Создать заявку</button></div>
  </form>
</template>
