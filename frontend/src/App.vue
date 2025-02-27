<script setup lang="ts">
import HelloWorld from './components/HelloWorld.vue'
import TheWelcome from './components/TheWelcome.vue'

import { ref, watch } from 'vue'
import { useWebSocket } from '@vueuse/core'
import type { PositionUpdate } from './types/types'
const url = 'ws://localhost:22142/ws'
const { status, data, send, open, close } = useWebSocket(url)

const isConnected = ref(false)

watch (status, () => {
  isConnected.value = status.value === 'OPEN'
})

watch(data, () => {
  if (data.value) {
    try {
      let positionUpdate = JSON.parse(data.value) as PositionUpdate
      // message.value = JSON.stringify(parsedMessage, null, 2) // Pretty print JSON
      console.debug({parsedMessage: positionUpdate})
      console.debug(JSON.stringify(positionUpdate, null, 2)) // Pretty print JSON)
    } catch (error) {
      console.error('Failed to parse message:', error)
    }
  }
})

const sendMessage = () => {
  const playerConnection = {
    guid: 'player-guid-1',
    secret: 'player-secret',
  }
  send(JSON.stringify(playerConnection))
}

// Send the initial connection message
sendMessage()
</script>

<template>
  <header>
    <img alt="Vue logo" class="logo" src="./assets/logo.svg" width="125" height="125" />
  </header>
  <main>
    <!-- <TheWelcome /> -->
    <div class="wrapper">
      <!-- <HelloWorld msg="You did it!" /> -->
    <p v-if="isConnected">Connected to WebSocket</p>
    <p v-else>Connecting to WebSocket...</p>
    <p v-if="data">Received message</p>

    </div>
  </main>
</template>

<style scoped>
header {
  line-height: 1.5;
}

.logo {
  display: block;
  margin: 0 auto 2rem;
}

@media (min-width: 1024px) {
  header {
    display: flex;
    place-items: center;
    padding-right: calc(var(--section-gap) / 2);
  }

  .logo {
    margin: 0 2rem 0 0;
  }

  header .wrapper {
    display: flex;
    place-items: flex-start;
    flex-wrap: wrap;
  }
}
</style>
