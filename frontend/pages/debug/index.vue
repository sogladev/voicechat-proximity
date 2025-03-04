<script setup lang="ts">
import { type Player } from '@/types/types'

// Define our player (stays static)
const player = {
  guid: 8,
  name: 'Alice',
  position: { x: 0, y: 0, z: 0, o: 0 },
  alive: true,
  zone: 1,
  area: 1,
  mapId: 0
}

// Define nearby players with reactive reference
const nearbyPlayers = ref<Player[]>([
  {
    guid: 9,
    name: 'Bob',
    position: { x: 29.86, y: 16.87, z: 0, o: 0.18 },
    alive: true,
    zone: 1,
    area: 1,
    mapId: 0
  },
  {
    guid: 10,
    name: 'Charlie',
    position: { x: -20, y: 15, z: 0, o: 1.2 },
    alive: true,
    zone: 1,
    area: 1,
    mapId: 0
  },
  {
    guid: 11,
    name: 'Diana',
    position: { x: 10, y: -25, z: 0, o: 3.5 },
    alive: true,
    zone: 1,
    area: 1,
    mapId: 0
  },
  {
    guid: 12,
    name: 'Ethan',
    position: { x: -15, y: -18, z: 0, o: 5.1 },
    alive: true,
    zone: 1,
    area: 1,
    mapId: 0
  }
])

// Helper functions for dynamic player movement
const moveRandomly = (player: Player) => {
  const speed = 2 + Math.random() * 3
  const angle = Math.random() * Math.PI * 2

  player.position.x += Math.cos(angle) * speed
  player.position.y += Math.sin(angle) * speed
  player.position.o = (player.position.o + (Math.random() * 0.5 - 0.25)) % (Math.PI * 2)

  // Keep within reasonable distance
  if (Math.sqrt(player.position.x ** 2 + player.position.y ** 2) > 60) {
    // Move back toward center
    const centerAngle = Math.atan2(-player.position.y, -player.position.x)
    player.position.x += Math.cos(centerAngle) * 5
    player.position.y += Math.sin(centerAngle) * 5
  }
}

// Timers
let movementTimer: number | null = null
let playerAddRemoveTimer: number | null = null

onMounted(() => {
  // Timer to update player positions every 1 second
  movementTimer = window.setInterval(() => {
    nearbyPlayers.value.forEach(player => {
      moveRandomly(player)
    })
  }, 1000)
})

onUnmounted(() => {
  // Clear timers when component is unmounted
  if (movementTimer) clearInterval(movementTimer)
  if (playerAddRemoveTimer) clearInterval(playerAddRemoveTimer)
})

</script>

<template>
  <div class="p-8">
    <div class="mb-4">
      <h1 class="text-xl font-bold">Minimap Debug Page</h1>
    </div>
    <MinimapCard :nearbyPlayers="nearbyPlayers" :player="player"/>
  </div>
</template>
