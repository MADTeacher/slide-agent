<template>
  <div class="stat-card flex flex-col items-center justify-center p-6 rounded-xl bg-[#161b22] border-t-2 border-[#00d4ff] border border-white/10 backdrop-blur-sm transition-all duration-300 hover:shadow-[0_0_40px_rgba(0,212,255,0.15)] hover:-translate-y-1">
    <div v-if="icon" class="text-3xl mb-2">{{ icon }}</div>
    <div class="text-2xl md:text-3xl font-bold mb-1 text-center break-words w-full leading-tight" :style="{ color: color || '#00d4ff' }">
      {{ value }}
    </div>
    <div class="text-sm opacity-60 text-center text-[#c9d1d9] leading-tight">{{ label }}</div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  value: string
  label: string
  icon?: string
  color?: string
}>()
</script>

<style scoped>
.stat-card {
  min-width: 160px;
}
</style>
