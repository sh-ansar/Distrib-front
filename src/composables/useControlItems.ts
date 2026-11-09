import { computed } from 'vue'
import { useDistributionStore } from '@/stores/distribution'
import { buildControlItems } from '@/utils/controlCenter'

/** Live, role-filtered operational alerts derived from the current frontend dataset. */
export function useControlItems(){
  const store=useDistributionStore()
  const items=computed(()=>buildControlItems({
    data:store.data,role:store.currentRole,
    outlets:store.visibleOutlets,customers:store.visibleCustomers,
    debts:store.visibleDebts,routes:store.visibleRoutes,
    visits:store.visibleVisits,orders:store.visibleOrders,
  }))
  const critical=computed(()=>items.value.filter(item=>item.priority==='critical').length)
  const attention=computed(()=>items.value.filter(item=>item.priority==='attention').length)
  return {items,critical,attention}
}
