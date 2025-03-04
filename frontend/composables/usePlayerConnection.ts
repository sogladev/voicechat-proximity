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
  const rtcConnections = ref<any>(null) // Unused for now

  // Optional: A placeholder function to handle signaling messages.
  const handleSignalingMessage = (payload: SignalingPayload) => {
    console.debug('Handling signaling message:', payload)
    // todo: update RTC connections
    // for example: rtcConnections.value = getPeerConnections();
  }

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
            handleSignalingMessage(signalingPayload)
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
    // Expose WebRTC connections (unused for now).
    rtcConnections
  }
}
