<script setup lang="ts">
import type { Player } from '@/types/types'
const props = defineProps<{ players: Player[] }>()
</script>

<template>
  <div>
    <h2 class="text-xl font-bold mb-4">Nearby Players</h2>
    <div v-if="props.players && props.players.length" class="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      <PlayerCard v-for="player in props.players" :key="player.guid" :player="player" />
    </div>
    <div v-else class="text-muted-foreground text-sm">
      No players nearby.
    </div>
  </div>
</template>
