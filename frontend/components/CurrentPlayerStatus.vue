<script setup lang="ts">
import type { Player } from '@/types/types'

// Add more props later
const props = defineProps<{
  player: Player
}>()
const playerInitial = computed(() => props.player.name.charAt(0).toUpperCase())
</script>

<template>
  <Card class="p-4">
    <div class="flex items-center space-x-3">
      <Avatar class="w-10 h-10 mr-3">
        <AvatarImage src="https://via.placeholder.com/40?text={{ playerInitial }}" alt="Avatar" />
        <AvatarFallback>{{ playerInitial }}</AvatarFallback>
      </Avatar>
      <div>
        <p class="font-bold text-lg">{{ player.name }}</p>
        <p class="text-sm text-muted-foreground">{{ "class" }}</p>
      </div>
    </div>
    <div class="mt-3">
      <p class="text-sm">
        Status: <span :class="!player.alive ? 'text-red-500' : 'text-green-500'">
          {{ !player.alive ? 'Dead' : 'Alive' }}
        </span>
      </p>
      <!-- Volume control -->
    </div>
  </Card>
</template>