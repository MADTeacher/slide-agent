<template>
  <div class="side-by-side-layout slidev-layout h-full w-full flex items-center px-14 py-10">
    <div class="flex-1 pr-8">
      <slot />
    </div>
    <div class="w-px bg-white bg-opacity-10 self-stretch mx-2" />
    <div class="flex-1 pl-8">
      <slot name="right" />
    </div>
  </div>
</template>
