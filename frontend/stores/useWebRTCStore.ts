import type { NearbyPlayersPayload, Player, Position, SignalingPayload, WebSocketMessage } from "@/types/types";

// Define thresholds and limits.
// const CONNECT_RANGE = 75; // Distance threshold to initiate a connection.
const CONNECT_RANGE = 120; // Distance threshold to initiate a connection.
const DISCONNECT_RANGE = 120; // Decided server-side, defined for safety. Slightly larger threshold to avoid flickering.
const MAX_PEERS = 20; // Maximum active connections.

export const useWebRTCStore = defineStore("webrtc", () => {
    // Reactive state: a Map of active RTCPeerConnections, keyed by peer GUID.
    const peerConnections = ref(new Map<number, RTCPeerConnection>());
    // Store self-player info (i.e. our own position).
    const selfPlayer = ref<Player | null>(null);
    // Store the last payload for potential future use.
    const lastPayload = ref<NearbyPlayersPayload | null>(null);

    const socketStore = useSocketStore();
    const audioStore = useAudioStore();

    // Create typed event bus for signaling messages
    const positionEventBus = useEventBus<WebSocketMessage<NearbyPlayersPayload>>('position');
    const signalingEventBus = useEventBus<WebSocketMessage<SignalingPayload>>('signaling');

    // Listen for position updates
    positionEventBus.on((message) => {
        updateNearbyPlayers(message.payload);
    });

    // Listen for signaling messages
    signalingEventBus.on((message) => {
        handleSignalingMessage(message.payload);
    });

    /**
     * Handle incoming signaling messages.
     */
    async function handleSignalingMessage(payload: SignalingPayload): Promise<void> {
        const connection = peerConnections.value.get(payload.from);
        if (!connection) {
            console.warn("No connection found for peer", payload.from);
            return;
        }

        switch (payload.type) {
            case "offer":
                await connection.setRemoteDescription(new RTCSessionDescription(JSON.parse(payload.data)));
                const answer = await connection.createAnswer();
                await connection.setLocalDescription(answer);
                if (selfPlayer.value) {
                    const answerMessage: WebSocketMessage<SignalingPayload> = {
                        type: "signaling",
                        payload: {
                            from: selfPlayer.value.guid,
                            to: payload.from,
                            type: "answer",
                            data: JSON.stringify({ sdp: answer.sdp, type: answer.type })
                        }
                    };
                    socketStore.sendMessage(answerMessage);
                    console.debug("Sent answer to peer", payload.from);
                }
                break;
            case "answer":
                await connection.setRemoteDescription(new RTCSessionDescription(JSON.parse(payload.data)));
                break;
            case "candidate":
                await connection.addIceCandidate(new RTCIceCandidate(JSON.parse(payload.data)));
                break;
            default:
                console.warn("Unknown signaling message type:", payload.type);
        }
    }

    /**
     * Create a new RTCPeerConnection for the given peer, if we haven't reached the max.
     */
    async function createPeerConnection(target: Player): Promise<void> {
        if (peerConnections.value.size >= MAX_PEERS) {
            console.warn("Maximum peer limit reached. Skipping new connection for", target.guid);
            return;
        }
        if (peerConnections.value.has(target.guid)) {
            // Already connected.
            return;
        }
        console.debug("Creating new peer connection for:", target.guid);
        const connection = new RTCPeerConnection({
            iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
        });

        const localStream = audioStore.getMicrophoneStream();
        if (!localStream) {
            console.warn("Microphone stream not available for peer connection to", target.guid);
            return;
        }
        localStream.getAudioTracks().forEach(track => {
            connection.addTrack(track, localStream);
        });

        // Set up ICE candidate handling.
        connection.onicecandidate = (event) => {
            if (event.candidate && selfPlayer.value) {
                // Prepare a signaling message to send via the SocketStore.
                const message: WebSocketMessage<SignalingPayload> = {
                    type: "signaling",
                    payload: {
                        from: selfPlayer.value.guid,
                        to: target.guid,
                        type: "candidate",
                        data: JSON.stringify(event.candidate)
                    }
                };
                socketStore.sendMessage(message);
                // console.debug("Sending ICE candidate for peer", target.guid, event.candidate);
            }
        };

        // Handle incoming remote tracks.
        connection.ontrack = (event) => {
            console.debug("Received remote track from peer", target.guid, event);
            console.log({ event });
            const remoteStream = event.streams[0];

            if (remoteStream) {
                // Delegate to useAudioStore to handle audio routing
                audioStore.addRemoteAudio(target.guid, remoteStream);
            }
            else {
                console.warn("Received empty remote stream from peer", target.guid);
            }
        };

        // Save connection in our Map.
        peerConnections.value.set(target.guid, connection);

        // Initiate signaling (for example, create and send an offer).
        try {
            const offer = await connection.createOffer();
            await connection.setLocalDescription(offer);
            if (selfPlayer.value) {
                const offerMessage: WebSocketMessage<SignalingPayload> = {
                    type: "signaling",
                    payload: {
                        from: selfPlayer.value.guid,
                        to: target.guid,
                        type: "offer",
                        data: JSON.stringify({ sdp: offer.sdp, type: offer.type })
                    }
                };
                socketStore.sendMessage(offerMessage);
                console.debug("Sent offer to peer", target.guid);
            }
        } catch (error) {
            console.error("Error creating offer for peer", target.guid, error);
        }
    }

    /**
     * Remove (close) an existing connection for the given peer GUID.
     */
    function removePeerConnection(peerGuid: number): void {
        const connection = peerConnections.value.get(peerGuid);
        if (connection) {
            connection.close();
            peerConnections.value.delete(peerGuid);
            audioStore.removeRemoteAudio(peerGuid);
            console.debug("Closed connection for peer", peerGuid);
        }
    }

    /**
     * Process a new NearbyPlayersPayload. Filter new peers, create connections for them,
     * and close connections that are no longer in range.
     */
    const processNearbyPlayers = (payload: NearbyPlayersPayload) => {
        selfPlayer.value = payload.player;
        // Process new nearby players list.
        const newPeers: Player[] = payload.nearbyPlayers;
        newPeers.forEach((peer) => {
            const distanceSq = calculatePlayerDistanceSq(payload.player, peer);
            if (distanceSq <= (CONNECT_RANGE * CONNECT_RANGE)) {
                // If this peer is within the connect range and not already connected, create connection.
                if (!peerConnections.value.has(peer.guid)) {
                    createPeerConnection(peer);
                }
            }
        });
        // Check existing connections: if a connected peer is now outside the disconnect range, remove it.
        peerConnections.value.forEach((_, guid) => {
            const peer = newPeers.find((p) => p.guid === guid);
            // If not found in the new list or the distance exceeds the disconnect threshold, disconnect.
            if (!peer || calculatePlayerDistanceSq(payload.player, peer) > (DISCONNECT_RANGE * DISCONNECT_RANGE)) {
                removePeerConnection(guid);
            }
        });

        // Only connected peers
        peerConnections.value.forEach((_, guid) => {
            const peer = newPeers.find((p) => p.guid === guid);
            if (peer) {
                audioStore.updatePeerAudio(payload.player, peer);
            }
        });
    };

    // Throttle processing to avoid rapid connection/disconnection.
    const throttledProcessNearbyPlayers = useThrottleFn(processNearbyPlayers, 500);

    /**
     * This function is called by external components (or the SocketStore)
     * when a new NearbyPlayersPayload is received.
     */
    function updateNearbyPlayers(payload: NearbyPlayersPayload): void {
        lastPayload.value = payload;
        throttledProcessNearbyPlayers(payload);
    }

    return {
        peerConnections,
        selfPlayer,
        updateNearbyPlayers,
        lastPayload,
    };
});
