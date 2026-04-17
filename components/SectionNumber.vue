<template>
  <div class="section-number flex items-center gap-6">
    <div
      class="text-8xl font-black leading-none opacity-10"
      :style="{ color: 'var(--slidev-theme-primary, #7c3aed)' }"
    >
      {{ String(number).padStart(2, '0') }}
    </div>
    <div>
      <h2 class="text-3xl font-bold mb-0">{{ title }}</h2>
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  number: number
  title: string
}>()
</script>
