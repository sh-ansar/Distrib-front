import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { router } from './router'
import { useDistributionStore } from './stores/distribution'
import './styles/main.css'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
useDistributionStore(pinia).initialize()
app.use(router)
app.mount('#app')
