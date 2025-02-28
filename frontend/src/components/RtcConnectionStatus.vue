<script setup lang="ts">
import { computed } from 'vue';
import type { Player } from '@/types/types';

interface PeerConnectionInfo {
    connection: RTCPeerConnection;
    audioTrack?: MediaStreamTrack;
    audioElement?: HTMLAudioElement;
    connectionState: string;
    iceConnectionState: string;
    volume: number;
}

const props = defineProps<{
    peerConnections: Map<number, PeerConnectionInfo>;
    players: Player[] | null;
}>();

const peerConnectionsArray = computed(() => {
    return Array.from(props.peerConnections.entries());
});

const getPlayerName = (guid: number): string => {
    if (!props.players) return `Player ${guid}`;
    const player = props.players.find(p => p.guid === guid);
    return player ? player.name : `Player ${guid}`;
};
</script>

<template>
    <div class="rtc-status">
        <h3>WebRTC Connections</h3>
        <div v-if="peerConnections.size === 0" class="no-connections">
            No active connections
        </div>
        <div v-else class="connections-list">
            <div v-for="[targetGuid, info] in peerConnectionsArray" :key="targetGuid" class="connection-item">
                <div class="connection-header">
                    <span class="player-name">{{ getPlayerName(targetGuid) }}</span>
                    <span class="connection-state" :class="info.connectionState">
                        {{ info.connectionState }}
                    </span>
                </div>
                <div class="connection-details">
                    <div class="detail">
                        <span class="label">ICE:</span>
                        <span>{{ info.iceConnectionState }}</span>
                    </div>
                    <div class="detail">
                        <span class="label">Volume:</span>
                        <span>{{ Math.round(info.volume * 100) }}%</span>
                    </div>
                    <div class="detail">
                        <span class="label">Audio:</span>
                        <span :class="{ 'active': info.audioTrack?.enabled && !info.audioTrack?.muted }">
                            {{ info.audioTrack ? (info.audioTrack.enabled && !info.audioTrack.muted ? 'Active' :
                            'Muted') : 'No Track' }}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.rtc-status {
    width: 100%;
    max-width: 400px;
    border: 1px solid #ccc;
    border-radius: 4px;
    padding: 1rem;
    margin-top: 1rem;
}

h3 {
    margin-top: 0;
    margin-bottom: 1rem;
    text-align: center;
}

.no-connections {
    text-align: center;
    color: #666;
    font-style: italic;
}

.connections-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.connection-item {
    padding: 0.5rem;
    border-radius: 4px;
}

.connection-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
}

.player-name {
    font-weight: bold;
}

.connection-state {
    font-size: 0.8rem;
    padding: 0.2rem 0.4rem;
    border-radius: 4px;
}

.connection-state.connected {
    background-color: #8eff8e;
    color: #006400;
}

.connection-state.connecting {
    background-color: #fff68e;
    color: #8b8000;
}

.connection-state.disconnected,
.connection-state.failed,
.connection-state.closed {
    background-color: #ff8e8e;
    color: #640000;
}

.connection-details {
    display: flex;
    justify-content: space-between;
    font-size: 0.8rem;
}

.detail {
    display: flex;
    gap: 0.3rem;
}

.label {
    font-weight: bold;
}

.active {
    color: #00ff00;
}

.audio-meter {
    width: 100%;
    height: 4px;
    background: #ddd;
    border-radius: 2px;
    overflow: hidden;
    margin-top: 4px;
}

.meter-fill {
    height: 100%;
    background: #4CAF50;
    transition: width 100ms ease;
}
</style>