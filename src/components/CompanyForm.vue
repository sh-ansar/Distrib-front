<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import type { Customer, CustomerProfile } from '@/types/domain'
import { blankCompanyProfile, companyProfile } from '@/utils/company'
import { money } from '@/utils/domain'
import { useDistributionStore } from '@/stores/distribution'

const props=defineProps<{customer?:Customer}>()
const emit=defineEmits<{saved:[id:string];cancel:[]}>()
const store=useDistributionStore()
const isEdit=computed(()=>!!props.customer)
const error=ref('')
const form=reactive<{
  legalName:string;bin:string;contactName:string;phone:string;email:string;
  creditLimit:number;termsDays:number;profile:CustomerProfile
}>({
  legalName:'',bin:'',contactName:'',phone:'',email:'',
  creditLimit:0,termsDays:14,profile:blankCompanyProfile(),
})
watch(()=>props.customer,customer=>{
  error.value=''
  form.legalName=customer?.legalName??''
  form.bin=customer?.bin??''
  form.contactName=customer?.contactName??''
  form.phone=customer?.phone??''
  form.email=customer?.email??''
  form.creditLimit=customer?.creditLimit??0
  form.termsDays=customer?.termsDays??14
  form.profile=companyProfile(customer?.profile)
},{immediate:true})
function save() {
  error.value=''
  try {
    if(props.customer){
      store.updateCustomer(props.customer.id,{
        legalName:form.legalName,bin:form.bin,contactName:form.contactName,
        phone:form.phone,email:form.email,profile:{...form.profile},
      })
      store.notify('Досье компании обновлено (демо).')
      emit('saved',props.customer.id)
    }else{
      const c=store.createCustomer({
        legalName:form.legalName,bin:form.bin,contactName:form.contactName,
        phone:form.phone,email:form.email,creditLimit:Number(form.creditLimit),
        termsDays:Number(form.termsDays),profile:{...form.profile},
      })
      store.notify('Компания добавлена в демонстрационный справочник.')
      emit('saved',c.id)
    }
  } catch(e) { error.value=e instanceof Error?e.message:'Не удалось сохранить компанию.' }
}
</script>
<template>
  <form class="company-editor" @submit.prevent="save">
    <fieldset class="form-fieldset">
      <legend>Юридические данные</legend>
      <div class="form-grid">
        <label class="field field-wide"><span>Полное юридическое наименование *</span><input v-model="form.legalName" maxlength="180" required placeholder="ТОО «Название компании»" /></label>
        <label class="field"><span>БИН / ИИН (12 цифр) *</span><input v-model="form.bin" maxlength="12" inputmode="numeric" autocomplete="off" required placeholder="000000000000" /></label>
        <label class="field"><span>Торговое название / бренд</span><input v-model="form.profile.tradingName" placeholder="Название для торговых представителей" /></label>
        <label class="field"><span>Категория клиента</span><select v-model="form.profile.category">
          <option value="">Не указана</option><option>Продуктовая розница</option><option>Минимаркет</option><option>Сеть магазинов</option><option>Оптовый клиент</option><option>HoReCa</option><option>Другое</option>
        </select></label>
        <label class="field"><span>НДС</span><select v-model="form.profile.vatStatus">
          <option value="unknown">Не указано</option><option value="vat">Плательщик НДС</option><option value="no_vat">Без НДС</option>
        </select></label>
        <label class="field field-wide"><span>Юридический адрес</span><input v-model="form.profile.legalAddress" placeholder="Город, улица, дом, офис" /></label>
        <label class="field field-wide"><span>Фактический адрес</span><input v-model="form.profile.actualAddress" placeholder="Место работы компании" /></label>
        <label class="field"><span>Номер договора</span><input v-model="form.profile.contractNumber" /></label>
        <label class="field"><span>Дата договора</span><input v-model="form.profile.contractDate" type="date" /></label>
      </div>
    </fieldset>

    <fieldset class="form-fieldset">
      <legend>Контакты и ответственные</legend>
      <div class="form-grid">
        <label class="field"><span>Руководитель</span><input v-model="form.profile.directorName" /></label>
        <label class="field"><span>Основное контактное лицо</span><input v-model="form.contactName" /></label>
        <label class="field"><span>Должность контактного лица</span><input v-model="form.profile.contactPosition" placeholder="Директор, закупщик..." /></label>
        <label class="field"><span>Телефон</span><input v-model="form.phone" type="tel" placeholder="+7 ..." /></label>
        <label class="field"><span>WhatsApp</span><input v-model="form.profile.whatsapp" type="tel" placeholder="+7 ..." /></label>
        <label class="field"><span>E-mail</span><input v-model="form.email" type="email" placeholder="contact@example.kz" /></label>
        <label class="field field-wide"><span>Сайт</span><input v-model="form.profile.website" placeholder="https://example.kz" /></label>
      </div>
    </fieldset>

    <fieldset class="form-fieldset">
      <legend>Условия работы и доставки</legend>
      <div class="form-grid">
        <label class="field"><span>Территория / район</span><input v-model="form.profile.territory" placeholder="Есиль" /></label>
        <label class="field"><span>Форма оплаты</span><select v-model="form.profile.paymentMethod">
          <option value="bank">Безналичная</option><option value="cash">Наличная</option><option value="mixed">Смешанная</option>
        </select></label>
        <label class="field"><span>Режим работы</span><input v-model="form.profile.workingHours" placeholder="09:00–18:00" /></label>
        <label class="field"><span>Дни поставки</span><input v-model="form.profile.deliveryDays" placeholder="Пн, Ср, Пт" /></label>
        <label class="field field-wide"><span>Окно приёмки</span><input v-model="form.profile.receivingWindow" placeholder="10:00–16:00" /></label>
        <label class="field field-wide"><span>Требования к доставке</span><textarea v-model="form.profile.deliveryRequirements" rows="3" maxlength="2000" placeholder="Где разгружать, кому звонить, ограничения на приёмку..." /></label>
        <label class="field field-wide"><span>Внутренние заметки</span><textarea v-model="form.profile.notes" rows="3" maxlength="3000" placeholder="Предпочтения, история переговоров, важные детали..." /></label>
      </div>
    </fieldset>

    <fieldset v-if="!isEdit" class="form-fieldset">
      <legend>Демонстрационные финансовые условия</legend>
      <p class="muted small">При подключении 1С лимиты, договоры и задолженность должны проверяться в учётной системе.</p>
      <div class="form-grid">
        <label class="field"><span>Кредитный лимит, ₸</span><input v-model.number="form.creditLimit" type="number" min="0" step="1" required /></label>
        <label class="field"><span>Отсрочка, дней</span><input v-model.number="form.termsDays" type="number" min="0" step="1" required /></label>
      </div>
    </fieldset>
    <p v-else class="company-editor-finance">Кредитный лимит: <strong>{{money(form.creditLimit)}}</strong>, отсрочка: <strong>{{form.termsDays}} дн.</strong> Изменение финансовых условий здесь не предусмотрено до интеграции с 1С.</p>
    <div v-if="error" class="form-error" role="alert">{{error}}</div>
    <div class="form-footer"><button class="btn btn-secondary" type="button" @click="emit('cancel')">Отмена</button><button class="btn btn-primary" type="submit">{{isEdit?'Сохранить изменения':'Создать компанию'}}</button></div>
  </form>
</template>
