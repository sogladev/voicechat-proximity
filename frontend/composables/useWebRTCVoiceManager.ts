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
    connectionStatus: Ref<string>,
    audioManager: ReturnType<typeof useAudioManager>
) {
    /** WebRTC connection management **/
    const peerConnections = ref<Map<number, PeerConnectionInfo>>(new Map())
    const MAX_CONNECTION_DISTANCE = 200.0 // temporary

    // Create a new RTCPeerConnection and initiate signaling to a target peer.
    const createPeerConnection = async (targetGuid: number) => {
        if (connectionStatus.value != 'OPEN' || !player.value || player.value.guid <= 0) return
        console.debug('Creating peer connection with:', targetGuid)

        const connection = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        })

        console.debug(`Peer connection created with ${targetGuid}`);

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
            console.log(`Connection state changed for peer ${targetGuid}: ${connection.connectionState}`)
            const info = peerConnections.value.get(targetGuid);

            if (connection.connectionState === 'disconnected' || connection.connectionState === 'failed') {
                // Clean up the old connection
                closePeerConnection(targetGuid)
                // Try to establish a new connection
                createPeerConnection(targetGuid)
            } else if (info) {
                peerConnections.value.set(targetGuid, {
                    ...info,
                    connectionState: connection.connectionState
                });
            }
        };

        connection.oniceconnectionstatechange = () => {
            console.log(`ICE connection state changed for peer ${targetGuid}: ${connection.iceConnectionState}`);
            const info = peerConnections.value.get(targetGuid);
            if (info) {
                peerConnections.value.set(targetGuid, {
                    ...info,
                    iceConnectionState: connection.iceConnectionState
                });
            }
        };

        // Listen for remote tracks and create an audio element for playback
        connection.ontrack = event => {
            console.log(`Received audio track from peer ${targetGuid}`)

            // Extract the remote stream
            const remoteStream = event.streams[0]
            if (!remoteStream) {
                console.error("No streams in track event")
                return
            }

            // Update the connection info with the new gainNode
            const existingInfo = peerConnections.value.get(targetGuid)
            peerConnections.value.set(targetGuid, {
                connection: existingInfo ? existingInfo.connection : connection,
                connectionState: connection.connectionState,
                iceConnectionState: connection.iceConnectionState,
            })
            console.log(`Successfully connected audio for peer ${targetGuid}`)

            audioManager.addVoiceStream(remoteStream, targetGuid)
        }

        // Save the connection info.
        peerConnections.value.set(targetGuid, {
            connection,
            connectionState: connection.connectionState,
            iceConnectionState: connection.iceConnectionState,
        })

        // add local audio tracks to the connection
        if (audioManager.localStream.value) {
            audioManager.localStream.value.getAudioTracks().forEach((track) => {
                connection.addTrack(track, audioManager.localStream.value!)
            })
            console.debug('Added local audio tracks to connection')
            console.debug(`Local audio tracks added to connection with ${targetGuid}`);
        }

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
            console.debug(`Offer sent to peer ${targetGuid}`);
        } catch (error) {
            console.error('Error creating offer:', error)
        }
    }

    // Close and clean up a peer connection.
    const closePeerConnection = (targetGuid: number) => {
        console.debug(`Closing peer connection with ${targetGuid}`);
        const info = peerConnections.value.get(targetGuid)
        if (info) {
            // Remove all tracks from the connection
            const senders = info.connection.getSenders()
            senders.forEach(sender => {
                info.connection.removeTrack(sender)
            })

            // Close the connection
            info.connection.close()

            // Clean up audio context
            audioManager.removeVoiceStream(targetGuid)

            // Remove from peer connections map
            peerConnections.value.delete(targetGuid)

            console.log(`Cleaned up connection for peer ${targetGuid}`)
        }
    }

    // Process nearby players: create, update, or close connections based on distance.
    const manageNearbyPlayersConnections = () => {
        if (!player.value || !nearbyPlayers.value) return

        console.debug('Managing nearby players connections...')

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
                if (distance > MAX_CONNECTION_DISTANCE) {
                    // closePeerConnection(player.guid)
                    // currentPeers.delete(player.guid)
                }
                else {
                    // updateAudioVolume(player.guid, distance)
                }
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

        console.log('Handling signaling message:', payload)

        const fromGuid = payload.from
        switch (payload.type) {
            case 'offer': {
                console.debug(`Received offer from peer ${fromGuid}`);
                let connection: RTCPeerConnection
                if (peerConnections.value.has(fromGuid)) {
                    // closePeerConnection(fromGuid)
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

                    peerConnections.value.set(fromGuid, {
                        connection,
                        connectionState: connection.connectionState,
                        iceConnectionState: connection.iceConnectionState,
                    })
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
                    console.debug(`Answer sent to peer ${fromGuid}`);
                } catch (error) {
                    console.error('Error handling offer:', error)
                }
                break
            }
            case 'answer': {
                console.debug(`Received answer from peer ${fromGuid}`);
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
                console.debug(`Received ICE candidate from peer ${fromGuid}`);
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
    }

    return {
        handleSignalingMessage,
        manageNearbyPlayersConnections,
        getPeerConnections: () => peerConnections.value,
        cleanup,
    }
}