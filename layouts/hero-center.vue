<template>
  <div class="hero-center-layout slidev-layout h-full w-full flex flex-col items-center justify-center relative overflow-hidden">
    <div v-if="backgroundSvg" class="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none">
      <img :src="backgroundSvg" class="w-2/3 max-h-2/3 object-contain" />
    </div>
    <div class="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/40 pointer-events-none"></div>
    <div class="relative z-10 text-center px-14 max-w-4xl">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  backgroundSvg?: string
}>()
</script>
