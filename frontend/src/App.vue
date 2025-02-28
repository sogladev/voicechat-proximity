<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { assert, useWebSocket } from '@vueuse/core'
import Minimap from '@/components/Minimap.vue'
import type { Player, PlayerInMapPayload, ConnectPayload, WebSocketMessage } from './types/types'

const url = 'ws://localhost:22142/ws'
const guid = ref<number | null>(null)
const playerName = ref<string>('')

const players = ref<Player[] | null>(null)
const { status, data, send, open, close } = useWebSocket(url, {
  autoConnect: false,
  autoReconnect: true,
});

watch(data, () => {
    if (data.value) {
        try {
            const message = JSON.parse(data.value) as WebSocketMessage
            switch (message.type) {
                case 'position':
                    const PlayerInMapPayload = message.payload as PlayerInMapPayload
                    players.value = PlayerInMapPayload.players
                    break
                case 'new-player':
                    console.debug('New player joined:', message.payload)
                    break
                case 'player-left':
                    console.debug('Player left:', message.payload)
                    break
            }
        } catch (error) {
            console.error('Failed to parse message:', error)
        }
    }
})

onUnmounted(() => {
  close()
})

const connectAs = (name: string, id: number) => {
  guid.value = id
  playerName.value = name
  const message: WebSocketMessage<ConnectPayload> = {
    type: 'connect',
    payload: {
      guid: id,
      secret: 'player-secret',
    }
  }
  open()
  send(JSON.stringify(message))
}

const disconnect = () => {
  close()
  guid.value = null
  playerName.value = ''
  players.value = null
}

const connectionStatus = ref(status)
</script>

<template>
  <main>
    <div class="center-container">
      <div v-if="connectionStatus !== 'OPEN'" class="button-container">
        <button @click="connectAs('Alice', 8)" :disabled="connectionStatus === 'CONNECTING'">
          Connect as Alice
        </button>
        <button @click="connectAs('Bob', 9)" :disabled="connectionStatus === 'CONNECTING'">
          Connect as Bob
        </button>
      </div>
      <div v-else class="status-container">
        <p>Connected as {{ playerName }} (GUID: {{ guid }})</p>
        <button @click="disconnect">Disconnect</button>
      </div>

      <p v-if="status === 'CONNECTING'">Connecting to WebSocket...</p>
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
