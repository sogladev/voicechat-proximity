
<script setup lang="ts">
import { ref, watchEffect } from 'vue'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { DEFAULT_VISIBILITY_DISTANCE } from '@/model/constants'
import type { NearbyPlayersPayload, Player } from '@/types/types'

const props = defineProps<NearbyPlayersPayload>()

const canvas = ref<HTMLCanvasElement | null>(null)
const width = 480
const height = 480

// Helper function to draw orientation indicator
const drawOrientationIndicator = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  orientation: number,
  color: string,
  size: number = 10
) => {
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
  ctx.fillStyle = '#ccc'
  ctx.textAlign = 'center'
  ctx.fillText('N', width / 2, 15)
  ctx.fillText('S', width / 2, height - 5)
  ctx.fillText('E', width - 10, height / 2)
  ctx.fillText('W', 15, height / 2)

  // Draw the visibility circle
  ctx.beginPath()
  ctx.arc(width/ 2, height / 2, DEFAULT_VISIBILITY_DISTANCE, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(0, 0, 255, 0.5)'
  ctx.stroke()

  if (!props.player) {
    console.error('Player not found!')
    return
  }

  // Draw the current player (center)
  ctx.beginPath()
  ctx.arc(width / 2, height / 2, 5, 0, Math.PI * 2)
  ctx.fillStyle = 'blue'
  ctx.fill()

  // Draw the orientation indicator for the current player
  drawOrientationIndicator(ctx, width / 2, height / 2, props.player.position.o, 'blue')

  // Draw player's name
  ctx.font = '12px Arial'
  ctx.fillStyle = 'blue'
  ctx.fillText(props.player.name, width / 2, height / 2 - 10)

  // Draw nearby players
  props.nearbyPlayers.forEach(player => {
    const dx = player.position.x - props.player.position.x
    const dy = player.position.y - props.player.position.y
    const distance = Math.sqrt(dx * dx + dy * dy)

    if (distance <= DEFAULT_VISIBILITY_DISTANCE) {
      // Calculate relative position on the canvas.
      const x = width / 2 - dy
      const y = height / 2 - dx

      // Draw player dot
      ctx.beginPath()
      ctx.arc(x, y, 5, 0, Math.PI * 2)
      ctx.fillStyle = 'red'
      ctx.fill()

      // Draw orientation indicator for the player
      drawOrientationIndicator(ctx, x, y, player.position.o, 'red')

      // Draw player's name
      ctx.font = '12px Arial'
      ctx.fillStyle = 'red'
      ctx.fillText(player.name, x, y - 15)

      // Draw distance (in yards) text
      ctx.font = '10px Arial'
      ctx.fillText(`${Math.round(distance)}y`, x, y + 15)
    }
  })
}

// Redraw the minimap whenever the player or nearbyPlayers props change.
watchEffect(() => {
  if (props.player && props.nearbyPlayers) {
    drawMinimap()
  }
})
</script>

<template>
  <Card class="w-fit mx-auto min-w-[480px] min-h-[480px]">
    <CardHeader>
      <CardTitle>Minimap - Debug</CardTitle>
      <CardDescription>Player positions relative to you</CardDescription>
    </CardHeader>
    <CardContent>
      <canvas ref="canvas" :width="width" :height="height" class="border rounded"></canvas>
    </CardContent>
  </Card>
</template>

<style scoped>
</style>
