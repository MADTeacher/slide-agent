<template>
  <div class="comparison-table w-full overflow-hidden rounded-lg border border-white border-opacity-10">
    <table class="w-full text-sm">
      <thead>
        <tr class="bg-white bg-opacity-10">
          <th v-for="header in headers" :key="header" class="px-4 py-3 text-left font-semibold">
            {{ header }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, ri) in rows" :key="ri" class="border-t border-white border-opacity-5">
          <td v-for="(cell, ci) in row" :key="ci" class="px-4 py-2">
            <span v-if="cell === true" class="text-green-400 font-bold">&#10003;</span>
            <span v-else-if="cell === false" class="text-red-400 font-bold">&#10007;</span>
            <span v-else>{{ cell }}</span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  headers: string[]
  rows: (string | boolean)[][]
}>()
</script>
