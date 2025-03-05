import type { PeerConnectionInfo, Player, SignalingPayload, WebSocketMessage } from "~/types/types"

/**
 * This is responsible solely for managing the peer-to-peer WebRTC connections
 * (creating offers, handling answers, managing ICE candidates, etc.).
 * It exposes functions like handleSignalingMessage, and provides reactive peer connection data
 * (for instance, the associated audio elements for volume monitoring).
 */

export function useWebRTCVoiceManager(
    player: Ref<Player | null>,
    nearbyPlayers: Ref<Player[] | null>,
    sendMessage: (message: string) => void,
    status: Ref<string>
) {
    // WebRTC connection handling on player update
    watchEffect(() => {
        if (nearbyPlayers.value && nearbyPlayers.value.length > 0) processPlayers()
    })

    /** WebRTC connection management **/
    const peerConnections = ref<Map<number, PeerConnectionInfo>>(new Map())
    const MAX_CONNECTION_DISTANCE = 200.0 // temporary

    // Initialize a shared AudioContext for future audio processing
    const audioContext = ref<AudioContext | null>(null)
    // Called after localStream is available and a user gesture has occurred
    const initializeAudio = async () => {
        if (!audioContext.value) {
            try {
                audioContext.value = new AudioContext()
                // Optionally, resume the context if it's suspended
                if (audioContext.value.state === 'suspended') {
                    await audioContext.value.resume()
                }
            } catch (error) {
                console.error('Error initializing audio context:', error)
            }
        }
    }



    // Create a new RTCPeerConnection and initiate signaling to a target peer.
    const createPeerConnection = async (targetGuid: number) => {
        if (status.value != 'OPEN' || !player.value || player.value.guid <= 0) return

        console.debug('Creating peer connection with:', targetGuid)

        const connection = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        })

        // Listen for ICE candidates and send them to the remote peer.
        useEventListener(connection, 'icecandidate', (event: RTCIceCandidateInit) => {
            if (event.candidate) {
                if (!player.value) return
                const msg: WebSocketMessage<SignalingPayload> = {
                    type: 'signaling',
                    payload: {
                        from: player.value.guid,
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
            if (!audioContext.value) return

            // Create a source node for the remote stream.
            const sourceNode = audioContext.value.createMediaStreamSource(remoteStream)

            // Create a GainNode to control volume.
            const gainNode = audioContext.value.createGain()
            gainNode.gain.value = 1  // default volume

            // Connect the source node through the gain node to the destination.
            sourceNode.connect(gainNode)
            gainNode.connect(audioContext.value.destination)

            // Save the gainNode in your peerConnections mapping
            const info = peerConnections.value.get(targetGuid) || { connection: null, volume: 1 }
            info.gainNode = gainNode
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
                    from: player.value!.guid,
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
        if (info && info.gainNode) {
            // Use a linear fall-off (volume goes to zero at MAX_CONNECTION_DISTANCE)
            const distanceFactor = Math.max(0, 1 - distance / MAX_CONNECTION_DISTANCE)
            // Apply both distance-based and any additional user scaling.
            const userVolumeFactor = info.userVolumeFactor || 1
            info.gainNode.gain.value = distanceFactor * userVolumeFactor
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
        if (!player.value || !audioContext.value || !nearbyPlayers.value) return

        const selfPlayer = player.value
        const currentPeers = new Set(peerConnections.value.keys())

        nearbyPlayers.value.forEach(player => {
            const dx = player.position.x - selfPlayer.position.x
            const dy = player.position.y - selfPlayer.position.y
            const distance = Math.sqrt(dx * dx + dy * dy)

            // If no connection exists, create one; otherwise update the volume.
            if (!peerConnections.value.has(player.guid)) {
                createPeerConnection(player.guid)
            } else {
                updateAudioVolume(player.guid, distance)
            }
            currentPeers.delete(player.guid)
        })

        // Close any connections that are not present in the current nearby players list.
        currentPeers.forEach(guid => {
            closePeerConnection(guid)
        })
    }

    // Handle incoming signaling messages (offer, answer, candidate).
    const handleSignalingMessage = async (payload: SignalingPayload) => {
        if (!player.value || payload.to !== player.value.guid) return

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
                                    from: player.value!.guid,
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
                            from: player.value!.guid,
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

    return {
        initializeAudio,
        handleSignalingMessage,
        processPlayers,
        cleanup,
    }
}