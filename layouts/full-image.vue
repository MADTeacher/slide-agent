<template>
  <div class="full-image-layout slidev-layout h-full w-full relative overflow-hidden">
    <div v-if="imageUrl" class="absolute inset-0 flex items-center justify-center">
      <img :src="imageUrl" class="max-w-full max-h-full object-contain p-8" />
    </div>
    <div class="absolute inset-0 flex items-center justify-center z-10">
      <div class="text-center px-14">
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  imageUrl?: string
}>()
</script>
