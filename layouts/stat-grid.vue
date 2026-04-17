<template>
  <div class="stat-grid-layout slidev-layout h-full w-full flex flex-col items-center justify-center px-14 py-10">
    <div v-if="$slots.header" class="mb-8 text-center">
      <slot name="header" />
    </div>
    <div class="grid grid-cols-2 gap-6 w-full max-w-4xl">
      <slot />
    </div>
    <div v-if="$slots.footer" class="mt-8 text-center opacity-60">
      <slot name="footer" />
    </div>
  </div>
</template>
