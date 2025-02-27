<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { assert, useWebSocket } from '@vueuse/core'
import Minimap from '@/components/Minimap.vue'
import type { Player, PositionUpdate } from './types/types'

const url = 'ws://localhost:22142/ws'
const guid = ref(8)

const isConnected = ref(false)
const players = ref<Player[] | null>(null)
const { status, data, send, open, close } = useWebSocket(url)

watch(status, () => {
  isConnected.value = status.value === 'OPEN'
})

watch(data, () => {
  if (data.value) {
    try {
      let positionUpdate = JSON.parse(data.value) as PositionUpdate
      // message.value = JSON.stringify(parsedMessage, null, 2) // Pretty print JSON
      console.debug({ parsedMessage: positionUpdate })
      console.debug(JSON.stringify(positionUpdate, null, 2)) // Pretty print JSON)
      assert(positionUpdate.data.length === 1, 'Only 1 map should be sent')
      players.value = positionUpdate.data[0].players; // Only 1 map
    } catch (error) {
      console.error('Failed to parse message:', error)
    }
  }
})

const sendMessage = () => {
  const playerConnection = {
    guid: guid.value,
    secret: 'player-secret',
  }
  send(JSON.stringify(playerConnection))
}

// Send the initial connection message
onMounted(() => {
  sendMessage()
})

onUnmounted(() => {
  close()
})
</script>

<template>
  <main>
    <div class="center-container">
      <p v-if="status == 'OPEN'">Connected to WebSocket</p>
      <p v-else-if="status == 'CONNECTING'">Connecting to WebSocket...</p>
      <p v-else>Closed WebSocket</p>
      <p v-if="data">Received message</p>
      <Minimap v-if="players" :players="players" :guid="guid" />
    </div>
  </main>
</template>

<style scoped>
.center-container {
  display: flex;
  flex-direction: column;
  align-items: center;
}
</style>
