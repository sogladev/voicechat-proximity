import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { useWebSocket } from '@vueuse/core'
import { useEventBus } from '@vueuse/core'
import type { Position, Player, WebSocketMessage, ConnectPayload, SignalingPayload, MessageType, NearbyPlayersPayload } from '@/types/types'

// Create typed event buses for different message types
const positionEventBus = useEventBus<WebSocketMessage<NearbyPlayersPayload>>('position')
const signalingEventBus = useEventBus<WebSocketMessage<SignalingPayload>>('signaling')

export const useSocketStore = defineStore('socket', () => {
    const status = ref('CLOSED')
    const socketUrl = process.env.VITE_WEBSOCKET_URL ?? 'ws://localhost:22142/ws'

    // Create a message queue for handling connection-in-progress
    const messageQueue = ref<WebSocketMessage[]>([])

    // Initialize the websocket using VueUse's useWebSocket
    const { status: socketStatus, data: socketData, send, open, close } = useWebSocket(socketUrl, {
        autoReconnect: {
            retries: 3,
            onFailed() {
                console.error('Failed to reconnect')
            },
        },
        immediate: false
    })


    // Sync status with our own state
    watch(socketStatus, (newStatus) => {
        status.value = newStatus

        // TODO: Remove this? May not be desired
        // If connection is established, send any queued messages
        if (newStatus === 'OPEN' && messageQueue.value.length > 0) {
            console.log(`Sending ${messageQueue.value.length} queued messages`)
            messageQueue.value.forEach(msg => sendMessage(msg))
            messageQueue.value = []
        }
    })

    // Process incoming messages
    watch(socketData, (newData) => {
        if (newData) {
            handleIncomingMessage(newData)
        }
    })

    // Action to connect as a player
    const connectAs = (id: number, secret: string) => {
        open() // Open the connection
        const message: WebSocketMessage<ConnectPayload> = {
            type: 'connect',
            payload: { guid: id, secret }
        }
        send(JSON.stringify(message))
    }

    // Action to send generic messages
    const sendMessage = (message: WebSocketMessage) => {
        send(JSON.stringify(message))
    }

    // Handle incoming messages centrally
    const handleIncomingMessage = (rawMessage: string) => {
        try {
            const message: WebSocketMessage = JSON.parse(rawMessage)
            switch (message.type) {
                case 'position':
                    console.debug('Received position update:', message.payload)
                    positionEventBus.emit(message as WebSocketMessage<NearbyPlayersPayload>)
                    break
                case 'signaling':
                    console.debug('Received signaling message:', message.payload)
                    signalingEventBus.emit(message as WebSocketMessage<SignalingPayload>)
                    break
                default:
                    console.warn('Unknown message type:', message.type)
            }
        } catch (error) {
            console.error('Failed to parse message:', error)
        }
    }

    // Disconnect and cleanup
    const disconnect = () => {
        close()
        messageQueue.value = []
    }

    return {
        status,
        connectAs,
        sendMessage,
        disconnect,
    }
})
