<template>
  <div class="timeline">
    <div v-for="i in itemCount" :key="i" class="timeline-item flex items-start gap-4">
      <div class="timeline-marker flex flex-col items-center">
        <div class="w-3 h-3 rounded-full bg-[var(--slidev-theme-primary,#7c3aed)] flex-shrink-0" />
        <div v-if="i < itemCount" class="w-0.5 h-full bg-white bg-opacity-20 mt-1" />
      </div>
      <div class="timeline-content pb-6 flex-1">
        <slot :name="`item-${i}`" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, useSlots } from 'vue'

const slots = useSlots()
const itemCount = computed(() => {
  let count = 0
  for (let i = 1; i <= 20; i++) {
    if (slots[`item-${i}`]) count = i
    else break
  }
  return count
})
</script>

<style scoped>
.timeline-marker {
  min-height: 40px;
}
</style>
