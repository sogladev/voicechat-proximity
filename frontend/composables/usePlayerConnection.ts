/**
 * Handles all the WebSocket communication. It receives player data (and other messages) from the server,
 * sends connection and signaling messages, and updates reactive state (like current player and nearby players).
 *
 * @returns {Object} An object containing WebSocket controls, custom connection method, and reactive state.
 * @property {Ref<Player>} player - Reactive state for the current player.
 * @property {Ref<Player[]>} nearbyPlayers - Reactive state for the nearby players.
 * @property {Ref<string>} status - Reactive state for the WebSocket connection status.
 * @property {Ref<string>} data - Reactive state for the WebSocket received data.
 * @property {Function} send - Function to send data through the WebSocket.
 * @property {Function} open - Function to open the WebSocket connection.
 * @property {Function} close - Function to close the WebSocket connection.
 * @property {Function} connectAs - Function to connect as a player by sending a "connect" message.
 */

import type {
  WebSocketMessage,
  ConnectPayload,
  NearbyPlayersPayload,
  SignalingPayload,
  Player
} from '@/types/types'

const url = process.env.VITE_WEBSOCKET_URL ??  'ws://localhost:22142/ws'

export function usePlayerConnection() {
  const { status, data, send, open, close } = useWebSocket(url, {
    autoReconnect: {
      retries: 3,
      onFailed() {
        // TODO: emit
        console.error('Failed to reconnect')
      }
    },
    immediate: false
  })

  const defaultPlayer: Player = {
    guid: -1,
    name: 'Unknown',
    position: { x: 0, y: 0, z:0, o: 0 },
    alive: true,
    zone: -1,
    area: -1,
    mapId: -1
  }

  // Reactive state for the current player and nearby players.
  const player = ref<Player>(defaultPlayer)
  const nearbyPlayers = ref<Player[]>([])

  // Connect as a player by sending a "connect" message.
  const connectAs = (id: number, secret: string = 'player-secret') => {
    const message: WebSocketMessage<ConnectPayload> = {
      type: 'connect',
      payload: {
        guid: id,
        secret
      }
    }
    open() // Open the WebSocket connection.
    send(JSON.stringify(message))
  }

  // Watch for incoming data messages and handle them.
  watch(data, () => {
    if (data.value) {
      try {
        const message = JSON.parse(data.value) as WebSocketMessage<any>
        switch (message.type) {
          case 'position': {
            // Received nearby players and current player data.
            const payload = message.payload as NearbyPlayersPayload
            nearbyPlayers.value = payload.nearbyPlayers
            player.value = payload.player
            break
          }
          case 'signaling': {
            const signalingPayload = message.payload as SignalingPayload
            // Call signaling handler to handle the signaling message
            signalingHandler.value(signalingPayload)
            break
          }
          case 'new-player': {
            console.debug('New player joined:', message.payload)
            break
          }
          case 'player-left': {
            console.debug('Player left:', message.payload)
            break
          }
          default:
            console.warn('Unknown message type:', message.type)
        }
      } catch (error) {
        console.error('Failed to parse message:', error)
      }
    }
  })

  // A ref to store the signaling handler
  const signalingHandler = ref<(payload: SignalingPayload) => Promise<void> | void>(
    (payload) => console.debug('Default signaling handler - not connected', payload)
  )

  // Function to register an external handler
  const registerSignalingHandler = (handler: (payload: SignalingPayload) => Promise<void> | void) => {
    signalingHandler.value = handler
  }

  return {
    // Expose WebSocket controls.
    status,
    data,
    send,
    open,
    close,
    // Expose our custom connection method and reactive state.
    connectAs,
    player,
    nearbyPlayers,
    // Expose signaling handler and register function.
    registerSignalingHandler
  }
}
