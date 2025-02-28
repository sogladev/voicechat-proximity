import { ref } from 'vue';
import type { Ref } from 'vue';
import type { Player, WebSocketMessage, SignalingPayload } from '@/types/types';

interface PeerConnectionInfo {
    connection: RTCPeerConnection;
    audioTrack?: MediaStreamTrack;
    audioElement?: HTMLAudioElement;
    connectionState: string;
    iceConnectionState: string;
    volume: number;
    audioLevel?: number;
}

export function useWebRTCManager(localGuid: Ref<number | null>, sendMessage: (message: string) => void) {
    const peerConnections = ref<Map<number, PeerConnectionInfo>>(new Map());
    const localStream = ref<MediaStream | null>(null);
    const audioContext = ref<AudioContext | null>(null);
    const audioAnalysers = new Map<number, AnalyserNode>();

    // Connection distance threshold (units match your position coordinates)
    // If server hasn't messed up we do not need to distance check
    // All received players are valid connections
    // const MAX_CONNECTION_DISTANCE = 50.0;
    const MAX_CONNECTION_DISTANCE = 200.0;

    // Initialize audio
    // const initializeAudio = async () => {
    //     try {
    //         localStream.value = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    //         audioContext.value = new AudioContext();
    //         console.log('Audio initialized successfully');
    //     } catch (error) {
    //         console.error('Error initializing audio:', error);
    //     }
    // };

    const initializeAudio = async () => {
        try {
            localStream.value = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            audioContext.value = new AudioContext();
            
            // Add a button to the UI to ensure user interaction has occurred
            const audioButton = document.createElement('button');
            audioButton.textContent = 'Enable Audio';
            audioButton.style.position = 'fixed';
            audioButton.style.bottom = '10px';
            audioButton.style.right = '10px';
            audioButton.style.zIndex = '1000';
            audioButton.onclick = () => {
                // Resume audio context if it's suspended
                if (audioContext.value?.state === 'suspended') {
                    audioContext.value.resume();
                }
                
                // Start all audio elements
                peerConnections.value.forEach((info) => {
                    if (info.audioElement) {
                        info.audioElement.play().catch(e => console.error('Failed to play audio:', e));
                    }
                });
                
                audioButton.remove();
            };
            document.body.appendChild(audioButton);
            
            console.log('Audio initialized successfully');
        } catch (error) {
            console.error('Error initializing audio:', error);
        }
    };

    // Monitor audio levels
    const startAudioLevelMonitoring = (targetGuid: number, stream: MediaStream) => {
        if (!audioContext.value) return;
        
        const analyser = audioContext.value.createAnalyser();
        analyser.fftSize = 256;
        
        const source = audioContext.value.createMediaStreamSource(stream);
        source.connect(analyser);
        
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        audioAnalysers.set(targetGuid, analyser);
        
        const updateLevels = () => {
            if (!peerConnections.value.has(targetGuid)) return;
            
            analyser.getByteFrequencyData(dataArray);
            
            // Calculate average volume level
            let sum = 0;
            for (let i = 0; i < bufferLength; i++) {
                sum += dataArray[i];
            }
            const average = sum / bufferLength;
            const normalizedLevel = average / 255; // Convert to 0-1 range
            
            // Update connection info
            const peerInfo = peerConnections.value.get(targetGuid);
            if (peerInfo) {
                peerConnections.value.set(targetGuid, {
                    ...peerInfo,
                    audioLevel: normalizedLevel * 100, // Convert to percentage
                });
            }
            
            requestAnimationFrame(updateLevels);
        };
        
        updateLevels();
    };

    // Process players and manage connections based on distance
    const processPlayers = (players: Player[]) => {
        if (!localGuid.value || !localStream.value) return;

        console.log('Processing players:', players);

        // Find local player
        const selfPlayer = players.find(p => p.guid === localGuid.value);
        if (!selfPlayer) return;

        // Get current peer connections
        const currentPeers = new Set(peerConnections.value.keys());

        // Process each player and determine if we need a connection
        players
            .filter(player => player.guid !== localGuid.value)
            .forEach(player => {
                // Calculate distance
                const dx = player.position.x - selfPlayer.position.x;
                const dy = player.position.y - selfPlayer.position.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                // Check if we need to create/maintain connection
                if (distance <= MAX_CONNECTION_DISTANCE) {
                    // If we don't have a connection to this player, create one
                    if (!peerConnections.value.has(player.guid)) {
                        createPeerConnection(player.guid);
                    } else {
                        // Otherwise, update audio volume based on distance
                        updateAudioVolume(player.guid, distance);
                    }
                    currentPeers.delete(player.guid);
                } else {
                    // If player is too far and we have a connection, close it
                    if (peerConnections.value.has(player.guid)) {
                        closePeerConnection(player.guid);
                    }
                }
            });

        // Close remaining connections (players who are no longer present or in range)
        currentPeers.forEach(guid => {
            closePeerConnection(guid);
        });
    };

    // Create a new peer connection
    const createPeerConnection = async (targetGuid: number) => {
        if (!localStream.value || !localGuid.value) return;

        console.log(`Creating peer connection to ${targetGuid}`);

        const peerConnection = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });

        // Add local audio track to connection
        localStream.value.getAudioTracks().forEach(track => {
            peerConnection.addTrack(track, localStream.value!);
        });

        // Set up event handlers
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                const signalingMessage: WebSocketMessage<SignalingPayload> = {
                    type: 'signaling',
                    payload: {
                        from: localGuid.value!,
                        to: targetGuid,
                        type: 'candidate',
                        data: JSON.stringify(event.candidate)
                    }
                };
                sendMessage(JSON.stringify(signalingMessage));
            }
        };

        // peerConnection.ontrack = (event) => {
        //     const audioTrack = event.streams[0].getAudioTracks()[0];
        //     const audioElement = new Audio();
        //     audioElement.srcObject = event.streams[0];
        //     audioElement.play();

        //     peerConnections.value.set(targetGuid, {
        //         connection: peerConnection,
        //         audioTrack,
        //         audioElement
        //     });
        // };

        peerConnection.ontrack = (event) => {
            console.log(`Received track from ${targetGuid}:`, event.track);
            const audioTrack = event.streams[0].getAudioTracks()[0];
            
            // Create audio element
            const audioElement = document.createElement('audio');
            audioElement.id = `audio-${targetGuid}`;
            audioElement.srcObject = event.streams[0];
            audioElement.autoplay = true;
            audioElement.muted = false;
            
            // Attempt to play (may be blocked by browser)
            const playPromise = audioElement.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.warn('Auto-play was prevented:', error);
                    // Add the audio element to the DOM to make it visible for debug
                    audioElement.controls = true;
                    document.body.appendChild(audioElement);
                });
            }
            
            // Start monitoring audio levels
            startAudioLevelMonitoring(targetGuid, event.streams[0]);

            // Update the peer connection info
            updateConnectionState(targetGuid, peerConnection, audioTrack, audioElement);
        };

        // Store the connection
        peerConnections.value.set(targetGuid, { connection: peerConnection });

        // Create and send offer
        try {
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);

            const signalingMessage: WebSocketMessage<SignalingPayload> = {
                type: 'signaling',
                payload: {
                    from: localGuid.value,
                    to: targetGuid,
                    type: 'offer',
                    data: JSON.stringify({ sdp: offer.sdp, type: offer.type })
                }
            };
            sendMessage(JSON.stringify(signalingMessage));
        } catch (error) {
            console.error('Error creating offer:', error);
        }
    };

    // Update connection state info
    const updateConnectionState = (
        targetGuid: number, 
        connection?: RTCPeerConnection,
        audioTrack?: MediaStreamTrack,
        audioElement?: HTMLAudioElement
    ) => {
        const peerInfo = peerConnections.value.get(targetGuid);
        if (!peerInfo) return;
        
        const conn = connection || peerInfo.connection;
        
        peerConnections.value.set(targetGuid, {
            ...peerInfo,
            connection: conn,
            audioTrack: audioTrack || peerInfo.audioTrack,
            audioElement: audioElement || peerInfo.audioElement,
            connectionState: conn.connectionState,
            iceConnectionState: conn.iceConnectionState
        });
    };

    // Close a peer connection
    // const closePeerConnection = (targetGuid: number) => {
    //     const peerInfo = peerConnections.value.get(targetGuid);
    //     if (peerInfo) {
    //         console.log(`Closing peer connection to ${targetGuid}`);
    //         if (peerInfo.audioElement) {
    //             peerInfo.audioElement.pause();
    //             peerInfo.audioElement.srcObject = null;
    //         }
    //         peerInfo.connection.close();
    //         peerConnections.value.delete(targetGuid);
    //     }
    // };

    // Close a peer connection
    const closePeerConnection = (targetGuid: number) => {
        const peerInfo = peerConnections.value.get(targetGuid);
        if (peerInfo) {
            console.log(`Closing peer connection to ${targetGuid}`);
            if (peerInfo.audioElement) {
                peerInfo.audioElement.pause();
                peerInfo.audioElement.srcObject = null;
                
                // Remove from DOM if it was added
                const elementInDom = document.getElementById(`audio-${targetGuid}`);
                if (elementInDom) {
                    elementInDom.remove();
                }
            }
            
            // Stop audio monitoring
            const analyser = audioAnalysers.get(targetGuid);
            if (analyser) {
                audioAnalysers.delete(targetGuid);
            }
            
            peerInfo.connection.close();
            peerConnections.value.delete(targetGuid);
        }
    };

    // Process incoming signaling messages
    const handleSignalingMessage = async (payload: SignalingPayload) => {
        if (!localGuid.value) return;

        // Ignore messages not intended for us
        if (payload.to !== localGuid.value) return;

        const fromGuid = payload.from;

        switch (payload.type) {
            case 'offer': {
                console.log(`Received offer from ${fromGuid}`);
                const offerData = JSON.parse(payload.data);

                // Create peer connection if it doesn't exist
                if (!peerConnections.value.has(fromGuid)) {
                    const peerConnection = new RTCPeerConnection({
                        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
                    });

                    // Add local audio
                    if (localStream.value) {
                        localStream.value.getAudioTracks().forEach(track => {
                            peerConnection.addTrack(track, localStream.value!);
                        });
                    }

                    // Set up event handlers
                    peerConnection.onicecandidate = (event) => {
                        if (event.candidate) {
                            const signalingMessage: WebSocketMessage<SignalingPayload> = {
                                type: 'signaling',
                                payload: {
                                    from: localGuid.value!,
                                    to: fromGuid,
                                    type: 'candidate',
                                    data: JSON.stringify(event.candidate)
                                }
                            };
                            sendMessage(JSON.stringify(signalingMessage));
                        }
                    };

                    peerConnection.ontrack = (event) => {
                        const audioTrack = event.streams[0].getAudioTracks()[0];
                        const audioElement = new Audio();
                        audioElement.srcObject = event.streams[0];
                        audioElement.play();

                        const existingConnection = peerConnections.value.get(fromGuid);
                        if (existingConnection) {
                            peerConnections.value.set(fromGuid, {
                                ...existingConnection,
                                audioTrack,
                                audioElement
                            });
                        }
                    };

                    peerConnections.value.set(fromGuid, { connection: peerConnection });
                }

                const peerInfo = peerConnections.value.get(fromGuid);

                // Set remote description from offer
                try {
                    await peerInfo?.connection.setRemoteDescription(new RTCSessionDescription(offerData));

                    // Create and send answer
                    const answer = await peerInfo?.connection.createAnswer();
                    await peerInfo?.connection.setLocalDescription(answer);

                    const signalingMessage: WebSocketMessage<SignalingPayload> = {
                        type: 'signaling',
                        payload: {
                            from: localGuid.value,
                            to: fromGuid,
                            type: 'answer',
                            data: JSON.stringify({ sdp: answer?.sdp, type: answer?.type })
                        }
                    };
                    sendMessage(JSON.stringify(signalingMessage));
                } catch (error) {
                    console.error('Error handling offer:', error);
                }
                break;
            }

            case 'answer': {
                console.log(`Received answer from ${fromGuid}`);
                const peerInfo = peerConnections.value.get(fromGuid);
                if (peerInfo) {
                    const answerData = JSON.parse(payload.data);
                    try {
                        await peerInfo.connection.setRemoteDescription(new RTCSessionDescription(answerData));
                    } catch (error) {
                        console.error('Error handling answer:', error);
                    }
                }
                break;
            }

            case 'candidate': {
                console.log(`Received ICE candidate from ${fromGuid}`);
                const peerInfo = peerConnections.value.get(fromGuid);
                if (peerInfo) {
                    const candidate = JSON.parse(payload.data);
                    try {
                        await peerInfo.connection.addIceCandidate(new RTCIceCandidate(candidate));
                    } catch (error) {
                        console.error('Error adding ICE candidate:', error);
                    }
                }
                break;
            }
        }
    };

    // Update audio volume based on distance
    // const updateAudioVolume = (targetGuid: number, distance: number) => {
    //     const peerInfo = peerConnections.value.get(targetGuid);
    //     if (peerInfo && peerInfo.audioElement) {
    //         // Linear falloff from 1.0 at distance 0 to 0.0 at MAX_CONNECTION_DISTANCE
    //         const volume = Math.max(0, 1 - distance / MAX_CONNECTION_DISTANCE);
    //         peerInfo.audioElement.volume = volume;
    //     }
    // };

    // Update audio volume based on distance
    const updateAudioVolume = (targetGuid: number, distance: number) => {
        const peerInfo = peerConnections.value.get(targetGuid);
        if (peerInfo && peerInfo.audioElement) {
            // Linear falloff from 1.0 at distance 0 to 0.0 at MAX_CONNECTION_DISTANCE
            const volume = Math.max(0, 1 - distance / MAX_CONNECTION_DISTANCE);
            peerInfo.audioElement.volume = volume;
            
            // Update the stored volume value
            peerConnections.value.set(targetGuid, {
                ...peerInfo,
                volume
            });
        }
    };

    // Clean up all connections
    const cleanup = () => {
        peerConnections.value.forEach((info, guid) => {
            closePeerConnection(guid);
        });

        if (localStream.value) {
            localStream.value.getTracks().forEach(track => track.stop());
            localStream.value = null;
        }

        if (audioContext.value) {
            audioContext.value.close();
            audioContext.value = null;
        }
    };

    // Get getPeerConnections
    const getPeerConnections = () => {
        return peerConnections.value;
    };

    return {
        initializeAudio,
        processPlayers,
        handleSignalingMessage,
        cleanup,
        getPeerConnections
    };
}