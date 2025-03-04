<script setup lang="ts">
import type { Player } from '@/types/types'

// Add more props later
const props = defineProps<{
    player: Player
 }>()
const playerInitial = computed(() => props.player.name.charAt(0).toUpperCase())
</script>

<template>
  <header class="p-4 bg-gray-50 border-b flex items-center">
    <Avatar class="w-10 h-10 mr-3">
      <AvatarImage src="https://via.placeholder.com/40?text={{ playerInitial }}" alt="Avatar" />
      <AvatarFallback>{{ playerInitial }}</AvatarFallback>
    </Avatar>
    <div>
      <p class="font-bold text-lg">{{ player.name }}</p>
      <p class="text-sm text-muted-foreground">Status: {{ !player.alive ? 'Dead' : 'Alive' }}</p>
    </div>
  </header>
</template>