<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { assert, useWebSocket } from '@vueuse/core'
import Minimap from '@/components/Minimap.vue'
import type { Player, PositionUpdate, SignalingMessage } from './types/types'

const url = 'ws://localhost:22142/ws'
const guid = ref<number | null>(null)
const playerName = ref<string>('')

const isConnected = ref(false)
const players = ref<Player[] | null>(null)
const { status, data, send, open, close } = useWebSocket(url, {
  autoConnect: false,
  autoReconnect: true,
  heartbeat: { message: "ping", interval: 5000 },
});

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
    }
    catch (error) {
      try {
        let message = JSON.parse(data.value) as SignalingMessage
        if (message.type === 'new-player') {
          console.debug('New player joined:', message)
        }
        else if (message.type === 'player-left') {
          // console.debug('Player left:', message)
          // players.value = players.value?.filter(player => player.guid !== message.guid)
        }
      }
      catch {
        console.error('Failed to parse message:', error)

      }
    }
  }
})

onUnmounted(() => {
  close()
})

const connectAs = (name: string, id: number) => {
  guid.value = id
  playerName.value = name
  const playerConnection = {
    guid: id,
    secret: 'player-secret',
  }
  open() // Open the connection
  send(JSON.stringify(playerConnection))
}

const disconnect = () => {
  close()
  guid.value = null
  playerName.value = ''
  players.value = null
}
</script>

<template>
  <main>
    <div class="center-container">
      <div v-if="!isConnected" class="button-container">
        <button @click="connectAs('Alice', 8)" :disabled="isConnected">
          Connect as Alice
        </button>
        <button @click="connectAs('Bob', 9)" :disabled="isConnected">
          Connect as Bob
        </button>
      </div>
      <div v-else class="status-container">
        <p>Connected as {{ playerName }} (GUID: {{ guid }})</p>
        <button @click="disconnect">Disconnect</button>
      </div>

      <p v-if="status == 'CONNECTING'">Connecting to WebSocket...</p>
      <p v-if="data">Received message</p>
      <Minimap v-if="players && guid" :players="players" :guid="guid" />
    </div>
  </main>
</template>

<style scoped>
.center-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.button-container {
  display: flex;
  gap: 1rem;
}

.status-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

button {
  padding: 0.5rem 1rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  background-color: #fff;
  cursor: pointer;
}

button:hover {
  background-color: #f0f0f0;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
</style>
