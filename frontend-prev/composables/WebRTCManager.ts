import { computed, ref, watchEffect } from 'vue'
import { useDevicesList, useUserMedia, useEventListener, useRafFn } from '@vueuse/core'
import type { Ref } from 'vue'
import type { Player, WebSocketMessage, SignalingPayload } from '@/types/types'

/** Types used for players and signaling messages **/
export interface PeerConnectionInfo {
    connection: RTCPeerConnection
    audioElement?: HTMLAudioElement
    volume: number
    audioLevel?: number
    connectionState: string
    iceConnectionState: string
}

/**
 * useWebRTCVoiceManager
 *
 * This composable sets up local microphone capture and manages WebRTC peer connections.
 * It creates a connection for any nearby player within MAX_CONNECTION_DISTANCE,
 * updates the remote audio element volume based on distance, and tears down the connection
 * if the player goes out of range.
 *
 * @param localPlayer - Reactive reference to the local player object.
 * @param nearbyPlayers - Reactive reference to an array of nearby players.
 * @param sendMessage - A function to send signaling messages (via a WebSocket, for example).
 */
export function useWebRTCVoiceManager(
    localPlayer: Ref<Player | null>,
    nearbyPlayers: Ref<Player[] | null>,
    sendMessage: (message: string) => void
) {
    // WebRTC connection handling on player update
    watchEffect(() => {
        if (nearbyPlayers.value && nearbyPlayers.value.length > 0) processPlayers()
    })

    /** Microphone management **/
    const { audioInputs: microphones } = useDevicesList({ requestPermissions: true })
    const selectedMicrophoneId = ref('')

    // Choose the user-selected microphone if available, or default to the first available device.
    const currentMicrophone = computed(() => {
        if (
            selectedMicrophoneId.value &&
            microphones.value.some(m => m.deviceId === selectedMicrophoneId.value)
        ) {
            return { deviceId: selectedMicrophoneId.value }
        }
        return microphones.value[0] ? { deviceId: microphones.value[0].deviceId } : true
    })

    // Use VueUse’s useUserMedia to capture audio from the current microphone.
    const { stream, start, stop } = useUserMedia({
        enabled: false,
        constraints: computed(() => ({
            audio: currentMicrophone.value,
            video: false
        }))
    })

    // Allow changing the microphone device.
    const setMicrophone = (deviceId: string) => {
        selectedMicrophoneId.value = deviceId
        if (stream.value) {
            stop()
            start()
        }
    }

    /** WebRTC connection management **/
    const peerConnections = ref<Map<number, PeerConnectionInfo>>(new Map())
    const MAX_CONNECTION_DISTANCE = 200.0

    // Initialize a shared AudioContext for any future audio processing (if needed).
    const audioContext = ref<AudioContext | null>(null)
    const initializeAudio = async () => {
        try {
            audioContext.value = new AudioContext()
        } catch (error) {
            console.error('Error initializing audio context:', error)
        }
    }

    // Create a new RTCPeerConnection and initiate signaling to a target peer.
    const createPeerConnection = async (targetGuid: number) => {
        if (!stream.value || !localPlayer.value) return

        console.log('Creating peer connection with:', targetGuid)

        const connection = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        })

        // Listen for ICE candidates and send them to the remote peer.
        useEventListener(connection, 'icecandidate', (event: RTCIceCandidateInit) => {
            if (event.candidate) {
                const msg: WebSocketMessage<SignalingPayload> = {
                    type: 'signaling',
                    payload: {
                        from: localPlayer.value!.guid,
                        to: targetGuid,
                        type: 'candidate',
                        data: JSON.stringify(event.candidate)
                    }
                }
                sendMessage(JSON.stringify(msg))
            }
        })

        // Add connection state change listeners
        connection.onconnectionstatechange = () => {
            const info = peerConnections.value.get(targetGuid);
            if (info) {
                peerConnections.value.set(targetGuid, {
                    ...info,
                    connectionState: connection.connectionState
                });
            }
        };
        connection.oniceconnectionstatechange = () => {
            const info = peerConnections.value.get(targetGuid);
            if (info) {
                peerConnections.value.set(targetGuid, {
                    ...info,
                    iceConnectionState: connection.iceConnectionState
                });
            }
        };

        // Listen for remote tracks and create an audio element for playback.
        connection.ontrack = event => {
            const stream = event.streams[0]
            const audioElement = document.createElement('audio')
            audioElement.id = `audio-${targetGuid}`
            audioElement.srcObject = stream
            audioElement.autoplay = true
            audioElement.muted = false

            // Attempt auto-play; if blocked, add controls for manual playback.
            audioElement.play().catch(err => {
                console.warn('Auto-play prevented. Please interact with the audio element.', err)
                audioElement.controls = true
                document.body.appendChild(audioElement)
            })

            // Update peer connection info with the new audio element.
            const info = peerConnections.value.get(targetGuid) || { connection, volume: 1 }
            info.audioElement = audioElement
            peerConnections.value.set(targetGuid, info)
        }

        // Add local audio tracks to the connection.
        stream.value.getAudioTracks().forEach(track => {
            connection.addTrack(track, stream.value!)
        })

        // Save the connection info.
        peerConnections.value.set(targetGuid, { connection, volume: 1 })

        // Create and send an offer to start the connection.
        try {
            const offer = await connection.createOffer()
            await connection.setLocalDescription(offer)
            const msg: WebSocketMessage<SignalingPayload> = {
                type: 'signaling',
                payload: {
                    from: localPlayer.value!.guid,
                    to: targetGuid,
                    type: 'offer',
                    data: JSON.stringify({ sdp: offer.sdp, type: offer.type })
                }
            }
            sendMessage(JSON.stringify(msg))
        } catch (error) {
            console.error('Error creating offer:', error)
        }
    }

    // Update the volume of a remote audio element based on distance.
    const updateAudioVolume = (targetGuid: number, distance: number) => {
        const info = peerConnections.value.get(targetGuid)
        if (info && info.audioElement) {
            // Use a linear fall-off (volume goes to zero at MAX_CONNECTION_DISTANCE)
            const distanceFactor = Math.max(0, 1 - distance / MAX_CONNECTION_DISTANCE)
            info.gainNode.gain.value = distanceFactor * (info.userVolumeFactor || 1)
            info.volume = info.gainNode.gain.value
            peerConnections.value.set(targetGuid, info)
            

        }
    }

    // Close and clean up a peer connection.
    const closePeerConnection = (targetGuid: number) => {
        const info = peerConnections.value.get(targetGuid)
        if (info) {
            if (info.audioElement) {
                info.audioElement.pause()
                info.audioElement.srcObject = null
                const el = document.getElementById(`audio-${targetGuid}`)
                if (el) el.remove()
            }
            info.connection.close()
            peerConnections.value.delete(targetGuid)
        }
    }

    // Process nearby players: create, update, or close connections based on distance.
    const processPlayers = () => {
        if (!localPlayer.value || !stream.value || !nearbyPlayers.value) return

        const selfPlayer = localPlayer.value
        const currentPeers = new Set(peerConnections.value.keys())

        nearbyPlayers.value.forEach(player => {
            const dx = player.position.x - selfPlayer.position.x
            const dy = player.position.y - selfPlayer.position.y
            const distance = Math.sqrt(dx * dx + dy * dy)

            if (distance <= MAX_CONNECTION_DISTANCE * 10) {
                // If no connection exists, create one; otherwise update the volume.
                if (!peerConnections.value.has(player.guid)) {
                    createPeerConnection(player.guid)
                } else {
                    updateAudioVolume(player.guid, distance)
                }
                currentPeers.delete(player.guid)
            } else {
                if (peerConnections.value.has(player.guid)) {
                    closePeerConnection(player.guid)
                }
            }
        })

        // Close any connections that are not present in the current nearby players list.
        currentPeers.forEach(guid => {
            closePeerConnection(guid)
        })
    }

    // Handle incoming signaling messages (offer, answer, candidate).
    const handleSignalingMessage = async (payload: SignalingPayload) => {
        if (!localPlayer.value || payload.to !== localPlayer.value.guid) return

        const fromGuid = payload.from
        switch (payload.type) {
            case 'offer': {
                let connection: RTCPeerConnection
                if (peerConnections.value.has(fromGuid)) {
                    connection = peerConnections.value.get(fromGuid)!.connection
                } else {
                    connection = new RTCPeerConnection({
                        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
                    })

                    // ICE candidate handling.
                    useEventListener(connection, 'icecandidate', (event: RTCIceCandidateInit) => {
                        if (event.candidate) {
                            const msg: WebSocketMessage<SignalingPayload> = {
                                type: 'signaling',
                                payload: {
                                    from: localPlayer.value!.guid,
                                    to: fromGuid,
                                    type: 'candidate',
                                    data: JSON.stringify(event.candidate)
                                }
                            }
                            sendMessage(JSON.stringify(msg))
                        }
                    })

                    // Add local audio tracks.
                    if (stream.value) {
                        stream.value.getAudioTracks().forEach(track => {
                            connection.addTrack(track, stream.value!)
                        })
                    }
                    peerConnections.value.set(fromGuid, { connection, volume: 1 })
                }

                try {
                    await connection.setRemoteDescription(new RTCSessionDescription(JSON.parse(payload.data)))
                    const answer = await connection.createAnswer()
                    await connection.setLocalDescription(answer)
                    const msg: WebSocketMessage<SignalingPayload> = {
                        type: 'signaling',
                        payload: {
                            from: localPlayer.value!.guid,
                            to: fromGuid,
                            type: 'answer',
                            data: JSON.stringify({ sdp: answer.sdp, type: answer.type })
                        }
                    }
                    sendMessage(JSON.stringify(msg))
                } catch (error) {
                    console.error('Error handling offer:', error)
                }
                break
            }
            case 'answer': {
                const info = peerConnections.value.get(fromGuid)
                if (info) {
                    try {
                        await info.connection.setRemoteDescription(new RTCSessionDescription(JSON.parse(payload.data)))
                    } catch (error) {
                        console.error('Error handling answer:', error)
                    }
                }
                break
            }
            case 'candidate': {
                const info = peerConnections.value.get(fromGuid)
                if (info) {
                    try {
                        await info.connection.addIceCandidate(new RTCIceCandidate(JSON.parse(payload.data)))
                    } catch (error) {
                        console.error('Error adding ICE candidate:', error)
                    }
                }
                break
            }
        }
    }

    // Cleanup all connections and media streams.
    const cleanup = () => {
        peerConnections.value.forEach((_, guid) => {
            closePeerConnection(guid)
        })

        if (stream.value) {
            stream.value.getTracks().forEach(track => track.stop())
        }

        if (audioContext.value) {
            audioContext.value.close()
        }
    }

    // Microphone input volume monitoring
    const microphoneVolume = ref(0)
    const startVolumeMonitoring = () => {
        if (!audioContext.value || !stream.value) return

        const analyser = audioContext.value.createAnalyser()
        analyser.fftSize = 256

        const source = audioContext.value.createMediaStreamSource(stream.value)
        source.connect(analyser)

        const bufferLength = analyser.frequencyBinCount
        const dataArray = new Uint8Array(bufferLength)

        useRafFn(() => {
            analyser.getByteFrequencyData(dataArray)
            const sum = dataArray.reduce((a, b) => a + b, 0)
            const average = sum / bufferLength
            microphoneVolume.value = average / 255 // Normalize to 0-1 range
        })
    }

    // Start monitoring when stream is available
    watchEffect(() => {
        if (stream.value) {
            startVolumeMonitoring()
        }
    })

    return {
        initializeAudio,
        handleSignalingMessage,
        processPlayers,
        cleanup,
        setMicrophone,
        getPeerConnections: () => peerConnections.value,
        stream,
        currentMicrophone,
        microphones,
        start,
        microphoneVolume
    }
}