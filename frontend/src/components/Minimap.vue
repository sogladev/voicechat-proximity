<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import type { Player } from '@/types/types'
import { DEFAULT_VISIBILITY_DISTANCE } from '@/model/constants'
import { assert } from '@vueuse/core';

const props = defineProps<{
  players: Player[]
  guid: string
}>()

const canvas = ref<HTMLCanvasElement | null>(null)
const width = 400
const height = 400

const drawMinimap = () => {
  if (!canvas.value) return
  const ctx = canvas.value.getContext('2d')
  if (!ctx) return

  // Clear the canvas
  ctx.clearRect(0, 0, width, height)

  // Draw the visibility circle
  ctx.beginPath()
  ctx.arc(width / 2, height / 2, DEFAULT_VISIBILITY_DISTANCE, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(0, 0, 255, 0.5)'
  ctx.stroke()

  // Draw the player at the center
  ctx.beginPath()
  ctx.arc(width / 2, height / 2, 5, 0, Math.PI * 2)
  ctx.fillStyle = 'blue'
  ctx.fill()

  const playerSelf = props.players.find(
    player => player.guid === props.guid
  )
  if (!playerSelf) { console.error('Player not found!'); return}

  const otherPlayers = props.players.filter(
    player => player.guid !== props.guid
  )

  // Draw other players
  otherPlayers.forEach(player => {
    const dx = player.position.x - playerSelf.position.x
    const dy = player.position.y - playerSelf.position.y
    const distance = Math.sqrt(dx * dx + dy * dy)

    if (distance <= DEFAULT_VISIBILITY_DISTANCE) {
      const x = width / 2 + dx
      const y = height / 2 + dy

      ctx.beginPath()
      ctx.arc(x, y, 5, 0, Math.PI * 2)
      ctx.fillStyle = 'red'
      ctx.fill()
    }
  })
}

onMounted(() => {
  drawMinimap()
})

watch(() => props.players, () => {
  drawMinimap()
}, { deep: true })
</script>

<template>
  <canvas ref="canvas" :width="width" :height="height"></canvas>
</template>

<style scoped>
canvas {
  border: 1px solid #000;
}
</style>
