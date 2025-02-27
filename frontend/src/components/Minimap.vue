<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import type { Player } from '@/types/types'
import { DEFAULT_VISIBILITY_DISTANCE } from '@/model/constants'
import { assert } from '@vueuse/core';

const props = defineProps<{
  players: Player[]
  guid: number
}>()

const canvas = ref<HTMLCanvasElement | null>(null)
const width = 480
const height = 480

// Helper function to draw orientation indicator
const drawOrientationIndicator = (ctx: CanvasRenderingContext2D, x: number, y: number, orientation: number, color: string, size: number = 10) => {
  const radians = 2 * Math.PI - orientation
  const dirX = Math.sin(radians) * size
  const dirY = -Math.cos(radians) * size

  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x + dirX, y + dirY)
  ctx.strokeStyle = color
  ctx.lineWidth = 2
  ctx.stroke()
}

const drawMinimap = () => {
  if (!canvas.value) return
  const ctx = canvas.value.getContext('2d')
  if (!ctx) return

  // Clear the canvas
  ctx.clearRect(0, 0, width, height)

  // Draw cardinal directions
  ctx.font = '14px Arial'
  ctx.fillStyle = 'black'
  ctx.textAlign = 'center'
  ctx.fillText('N', width / 2, 15)
  ctx.fillText('S', width / 2, height - 5)
  ctx.fillText('E', width - 10, height / 2)
  ctx.fillText('W', 15, height / 2)

  // Draw the visibility circle
  ctx.beginPath()
  ctx.arc(width / 2, height / 2, DEFAULT_VISIBILITY_DISTANCE, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(0, 0, 255, 0.5)'
  ctx.stroke()

  const playerSelf = props.players.find(
    player => player.guid === props.guid
  )
  if (!playerSelf) { console.error('Player not found!'); return }

  // Draw the player at the center
  ctx.beginPath()
  ctx.arc(width / 2, height / 2, 5, 0, Math.PI * 2)
  ctx.fillStyle = 'blue'
  ctx.fill()

  // Draw self player's orientation indicator
  drawOrientationIndicator(ctx, width / 2, height / 2, playerSelf.position.o, 'blue')

  // Draw player's name
  ctx.font = '12px Arial'
  ctx.fillStyle = 'blue'
  ctx.textAlign = 'center'
  ctx.fillText(playerSelf.name, width / 2, height / 2 - 10)

  // Draw other players
  props.players.filter(
    player => player.guid !== props.guid
  ).forEach(player => {
    const dx = player.position.x - playerSelf.position.x
    const dy = player.position.y - playerSelf.position.y
    const distance = Math.sqrt(dx * dx + dy * dy)

    if (distance <= DEFAULT_VISIBILITY_DISTANCE) {
      const x = height / 2 - dy
      const y = width / 2 - dx

      // Draw player dot
      ctx.beginPath()
      ctx.arc(x, y, 5, 0, Math.PI * 2)
      ctx.fillStyle = 'red'
      ctx.fill()

      // Draw player orientation indicator
      drawOrientationIndicator(ctx, x, y, player.position.o, 'red')

      // Draw player name
      ctx.font = '12px Arial'
      ctx.fillStyle = 'red'
      ctx.textAlign = 'center'
      ctx.fillText(player.name, x, y - 15)

      // Draw distance and relative orientation
      ctx.font = '10px Arial'
      ctx.fillText(`${Math.round(distance)}y`, x, y + 15)
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
  border: 1px solid black;
}
</style>
