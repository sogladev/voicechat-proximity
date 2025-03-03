<script setup lang="ts">
import { computed, onUnmounted, ref, watch, watchEffect } from 'vue'
import { useWebSocket } from '@vueuse/core'
import Minimap from '@/components/Minimap.vue'
import type { Player, NearbyPlayersPayload, ConnectPayload, SignalingPayload, WebSocketMessage } from './types/types'
import RtcConnectionStatus from '@/components/RtcConnectionStatus.vue'
import { useWebRTCVoiceManager } from '@/composables/WebRTCManager'

const url = 'ws://localhost:22142/ws'
const GUID_ALICE = 8
const GUID_BOB = 9

const player = ref<Player | null>(null)
const nearbyPlayers = ref<Player[] | null>(null)

const { status, data, send, open, close } = useWebSocket(url, {
  autoReconnect: {
    retries: 3,
    onFailed() {
      console.error('Failed to reconnect')
    },
  },
  immediate: false,
});

// Initialize WebRTC manager
const {
  initializeAudio,
  handleSignalingMessage,
  processPlayers,
  cleanup,
  setMicrophone,
  getPeerConnections,
  stream,
  currentMicrophone,
  microphones,
  start,
  microphoneVolume
} = useWebRTCVoiceManager(player, nearbyPlayers, (message: string) => send(message));

// Initialize WebRTC when connected
watch(status, async (newStatus) => {
  if (newStatus === 'OPEN') {
    await initializeAudio();
  }
});

watch(data, () => {
  if (data.value) {
    try {
      const message = JSON.parse(data.value) as WebSocketMessage
      switch (message.type) {
        case 'position':
          const NearbyPlayersPayload = message.payload as NearbyPlayersPayload
          nearbyPlayers.value = NearbyPlayersPayload.nearbyPlayers
          player.value = NearbyPlayersPayload.player
          break

        case 'signaling':
          const signalingPayload = message.payload as SignalingPayload;
          handleSignalingMessage(signalingPayload);
          rtcConnections.value = getPeerConnections();
          break;

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
  cleanup();
  close();
})

// Connect to the server as a player
// TODO: missing secret sharing
const connectAs = (id: number) => {
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
  cleanup()
  player.value = null
  nearbyPlayers.value = null
}

const connectionStatus = computed(() => {
  switch (status.value) {
    case 'CONNECTING':
      return 'CONNECTING'
    case 'OPEN':
      return 'OPEN'
    case 'CLOSED':
      return 'CLOSED'
    default:
      return 'IDLE'
  }
})

const enableAudio = async () => {
  await start()           // Request microphone permission and start capturing
  initializeAudio()       // Initialize AudioContext and audio handling
}

// ref to store WebRTC connection info for display
const rtcConnections = ref<Map<number, any>>(new Map());

const microphoneVolumeFmt = computed(() => {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumIntegerDigits: 2,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(microphoneVolume.value)
})
</script>

<template>
  <main>
    <div class="center-container">
      <RtcConnectionStatus :players="nearbyPlayers" :peerConnections="rtcConnections" />

      <p>
        WebSocket Status : {{ connectionStatus }}
      </p>

      <p>
        Microphone Volume: <code>{{ microphoneVolumeFmt }}</code>
      </p>

      <button v-if="!stream || (stream && !stream.active)" @click="enableAudio">Enable Microphone</button>

      <div v-if="connectionStatus !== 'OPEN'" class="button-container">
        <button @click="connectAs(GUID_ALICE)" :disabled="connectionStatus === 'CONNECTING'">
          Connect as Alice
        </button>
        <button @click="connectAs(GUID_BOB)" :disabled="connectionStatus === 'CONNECTING'">
          Connect as Bob
        </button>
      </div>
      <div v-else class="status-container">
        <template v-if="player">
          <p>Connected as {{ player.name }} (GUID: {{ player.guid }})</p>
          <button @click="disconnect">Disconnect</button>
        </template>
      </div>

      <Minimap v-if="nearbyPlayers && player" :player="player" :nearbyPlayers="nearbyPlayers" />
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