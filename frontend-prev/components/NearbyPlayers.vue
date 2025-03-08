<script setup lang="ts">
import { computed } from 'vue';
import type { Player } from '@/types/types';
import type { PeerConnectionInfo } from '@/composables/WebRTCManager';

interface EnhancedPlayer {
  player: Player;
  connectionInfo: PeerConnectionInfo | null;
  distance: number;
  isSpeaking: boolean;
}

const props = defineProps<{
  player: Player | null;
  nearbyPlayers: Player[] | null;
  peerConnections: Map<number, PeerConnectionInfo>;
  audioThreshold?: number;
}>();

// Default value for audio threshold
const audioThreshold = props.audioThreshold ?? 0.05;

// Calculate enhanced player info with connection data
const enhancedPlayers = computed<EnhancedPlayer[]>(() => {
  if (!props.player || !props.nearbyPlayers) return [];

  return props.nearbyPlayers
    .filter(p => p.guid !== props.player?.guid) // Filter out self
    .map(player => {
      const dx = player.position.x - props.player!.position.x;
      const dy = player.position.y - props.player!.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      const connectionInfo = props.peerConnections.get(player.guid) || null;
      
      // Detect if player is speaking based on audio level
      const isSpeaking = connectionInfo?.audioLevel 
        ? connectionInfo.audioLevel / 100 > audioThreshold
        : false;
        
      return {
        player,
        connectionInfo,
        distance,
        isSpeaking
      };
    })
    .sort((a, b) => a.distance - b.distance); // Sort by distance
});

// Group players by connection status
const playersByConnectionState = computed(() => {
  const result: Record<string, EnhancedPlayer[]> = {
    connected: [],
    connecting: [],
    disconnected: []
  };
  
  enhancedPlayers.value.forEach(player => {
    if (!player.connectionInfo) {
      result.disconnected.push(player);
    } else if (player.connectionInfo.connectionState === 'connected') {
      result.connected.push(player);
    } else {
      result.connecting.push(player);
    }
  });
  
  return result;
});
</script>

<template>
  <div class="nearby-players-container">
    <h3>Nearby Players</h3>

    <div class="player-groups">
      <div v-if="playersByConnectionState.connected.length > 0">
        <h4>Connected</h4>
        <div class="players-list">
          <div 
            v-for="enhancedPlayer in playersByConnectionState.connected" 
            :key="enhancedPlayer.player.guid"
            class="player-card" 
            :class="{ speaking: enhancedPlayer.isSpeaking }"
          >
            <div class="player-name">{{ enhancedPlayer.player.name }}</div>
            <div class="player-details">
              <div class="player-distance">{{ Math.round(enhancedPlayer.distance) }}y</div>
              <div class="audio-level" v-if="enhancedPlayer.connectionInfo">
                <div class="volume-bar">
                  <div 
                    class="volume-fill" 
                    :style="{ width: `${enhancedPlayer.connectionInfo?.audioLevel || 0}%` }"
                  ></div>
                </div>
                <div class="volume-value">{{ Math.round(enhancedPlayer.connectionInfo?.volume * 100) }}%</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="playersByConnectionState.connecting.length > 0">
        <h4>Connecting</h4>
        <div class="players-list">
          <div 
            v-for="enhancedPlayer in playersByConnectionState.connecting" 
            :key="enhancedPlayer.player.guid"
            class="player-card connecting"
          >
            <div class="player-name">{{ enhancedPlayer.player.name }}</div>
            <div class="player-details">
              <div class="player-distance">{{ Math.round(enhancedPlayer.distance) }}y</div>
              <div class="connection-status">{{ enhancedPlayer.connectionInfo?.connectionState }}</div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="playersByConnectionState.disconnected.length > 0">
        <h4>Out of Range</h4>
        <div class="players-list">
          <div 
            v-for="enhancedPlayer in playersByConnectionState.disconnected" 
            :key="enhancedPlayer.player.guid"
            class="player-card disconnected"
          >
            <div class="player-name">{{ enhancedPlayer.player.name }}</div>
            <div class="player-details">
              <div class="player-distance">{{ Math.round(enhancedPlayer.distance) }}y</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.nearby-players-container {
  width: 100%;
  max-width: 400px;
  background-color: rgba(45, 45, 48, 0.9);
  border-radius: 8px;
  padding: 1rem;
  color: #eee;
}

h3 {
  margin-top: 0;
  color: #fff;
  font-size: 1.2rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

h4 {
  margin: 0.75rem 0 0.25rem 0;
  font-size: 0.9rem;
  color: #aaa;
}

.player-groups {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.players-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.player-card {
  display: flex;
  flex-direction: column;
  background-color: rgba(60, 60, 65, 0.8);
  padding: 0.75rem;
  border-radius: 6px;
  border-left: 3px solid #4CAF50;
}

.player-card.connecting {
  border-left-color: #FFC107;
}

.player-card.disconnected {
  border-left-color: #9E9E9E;
  opacity: 0.7;
}

.player-card.speaking {
  background-color: rgba(70, 90, 70, 0.8);
  animation: pulse 1.5s infinite;
}

.player-name {
  font-weight: 500;
  margin-bottom: 0.25rem;
}

.player-details {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.8rem;
  color: #bbb;
}

.audio-level {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.volume-bar {
  width: 60px;
  height: 6px;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  overflow: hidden;
}

.volume-fill {
  height: 100%;
  background-color: #4CAF50;
  transition: width 100ms ease-out;
}

.connection-status {
  font-style: italic;
  color: #FFC107;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.4);
  }
  70% {
    box-shadow: 0 0 0 5px rgba(76, 175, 80, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(76, 175, 80, 0);
  }
}
</style>