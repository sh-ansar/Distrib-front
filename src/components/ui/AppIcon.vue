<script setup lang="ts">
import { computed, type Component } from 'vue'
import {
  Activity, AlertCircle, AlertTriangle, ArrowDown, ArrowDownLeft, ArrowDownUp, ArrowLeft, ArrowRight,
  ArrowUpRight, BadgeCheck, Bell, CalendarDays, Check, CheckCheck, CheckCircle2, ChevronDown, ChevronLeft,
  ChevronRight, ChevronsUpDown, Circle, CircleHelp, ClipboardCheck, ClipboardList, Clock3, CloudOff,
  Copy, CreditCard, Database, Download, Ellipsis, Eye, FileCheck2, FileImage, FilePlus2, FileText, Files,
  Filter, Hash, History, Info, LayoutDashboard, ListFilter, LoaderCircle, LockKeyhole, LogOut,
  MapPin, Menu, MessageSquareText, MoreHorizontal, Package, PackageCheck, PackageOpen, Pencil,
  Phone, Plus, Printer, ReceiptText, RefreshCw, Route, Search, Settings2, ShieldCheck, SlidersHorizontal,
  Sparkles, Store, Truck, Upload, UserRound, Users, Wallet, Warehouse, X,
  Building2, Boxes, CarFront, PackageSearch, PackagePlus, ScanText, Target, CalendarClock,
} from 'lucide-vue-next'
const props=withDefaults(defineProps<{name:string;size?:number;strokeWidth?:number}>(),{size:19,strokeWidth:1.8})
const icons:Record<string,Component>={
  activity:Activity,'alert-circle':AlertCircle,'alert-triangle':AlertTriangle,'arrow-down':ArrowDown,'arrow-down-left':ArrowDownLeft,
  'arrow-down-up':ArrowDownUp,'arrow-left':ArrowLeft,'arrow-right':ArrowRight,'arrow-up-right':ArrowUpRight,'badge-check':BadgeCheck,
  bell:Bell,'calendar-days':CalendarDays,check:Check,'check-check':CheckCheck,'check-circle-2':CheckCircle2,
  'chevron-down':ChevronDown,'chevron-left':ChevronLeft,'chevron-right':ChevronRight,'chevrons-up-down':ChevronsUpDown,
  circle:Circle,'circle-help':CircleHelp,'clipboard-check':ClipboardCheck,'clipboard-list':ClipboardList,clock:Clock3,
  'clock-3':Clock3,'cloud-off':CloudOff,copy:Copy,'credit-card':CreditCard,database:Database,download:Download,
  ellipsis:Ellipsis,eye:Eye,'file-check-2':FileCheck2,'file-image':FileImage,'file-plus-2':FilePlus2,'file-text':FileText,
  files:Files,filter:Filter,hash:Hash,history:History,info:Info,'layout-dashboard':LayoutDashboard,
  'list-filter':ListFilter,'loader-circle':LoaderCircle,'lock-keyhole':LockKeyhole,'log-out':LogOut,
  'map-pin':MapPin,menu:Menu,'message-square-text':MessageSquareText,'more-horizontal':MoreHorizontal,
  package:Package,'package-check':PackageCheck,'package-open':PackageOpen,pencil:Pencil,phone:Phone,plus:Plus,
  printer:Printer,'receipt-text':ReceiptText,'refresh-cw':RefreshCw,route:Route,search:Search,
  'settings-2':Settings2,'shield-check':ShieldCheck,'sliders-horizontal':SlidersHorizontal,sparkles:Sparkles,
  store:Store,truck:Truck,upload:Upload,'user-round':UserRound,users:Users,wallet:Wallet,warehouse:Warehouse,x:X,
  'building-2':Building2,boxes:Boxes,'car-front':CarFront,'package-search':PackageSearch,
  'package-plus':PackagePlus,'scan-text':ScanText,target:Target,'calendar-clock':CalendarClock,
}
const current=computed(()=>icons[props.name]??CircleHelp)
</script>
<template><component :is="current" :size="size" :stroke-width="strokeWidth" aria-hidden="true" /></template>
