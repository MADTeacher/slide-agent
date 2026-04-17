<template>
  <div class="slidev-layout h-full w-full grid grid-cols-[1fr_1.7fr] gap-10 px-10 py-8">
    <div class="min-w-0">
      <slot />
    </div>
    <div class="min-w-0 flex items-center justify-center">
      <slot name="right" />
    </div>
  </div>
</template>
