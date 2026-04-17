<template>
  <div
    class="image-grid grid gap-4"
    :style="{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: `${gap}rem` }"
  >
    <slot />
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  cols?: number
  gap?: number
}>(), {
  cols: 2,
  gap: 1,
})
</script>

<style scoped>
.image-grid > :deep(*) {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
</style>
