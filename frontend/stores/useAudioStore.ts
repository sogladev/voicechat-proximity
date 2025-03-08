import { useStorage, useDevicesList } from '@vueuse/core';
import type { Player } from '@/types/types'
import { AUDIBLE_DISTANCE } from '@/model/constants';

interface GainNodes {
  userGainNode: GainNode;
  pannerNode: PannerNode;
}

export const useAudioStore = defineStore('audio', () => {
  const useSound3D = useStorage('sound3D', true);
  const distanceModel = useStorage<DistanceModelType>('distanceModel', 'linear');
  const mutedUsers = useStorage('mutedUsers', new Map<number, boolean>());

  const { audioInputs, audioOutputs } = useDevicesList();

  const microphone = ref<MediaDeviceInfo | null>(null);
  const speaker = ref<MediaDeviceInfo | null>(null);

  const globalVolume = useStorage('globalVolume', 1.0);

  const microphoneStream = ref<MediaStream | null>(null);

  // Audio context (only created once)
  const audioContext = ref<AudioContext | null>(null);
  // Per-peer volume control
  const gainNodes = ref(new Map<number, GainNodes>());

  async function initMediaDevices() {
    try {
      // Request microphone permissions
      microphoneStream.value = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        }
      });

      watchEffect(() => {
        console.debug('Updated audioInputs:', audioInputs.value);
        console.debug('Updated audioOutputs:', audioOutputs.value);
      });

      // Set initial devices to default or first available
      microphone.value = audioInputs.value.find(d => d.deviceId === 'default')
        || audioInputs.value[0]
      speaker.value = audioOutputs.value.find(d => d.deviceId === 'default')
        || audioOutputs.value[0]

      // Create an AudioContext for audio processing
      if (!audioContext.value) {
        console.debug('Creating AudioContext');
        audioContext.value = new AudioContext();
      }
    } catch (error) {
      console.error('Error initializing media devices:', error);
    }
  }

  function getMicrophoneStream(): MediaStream | null {
    if (!microphoneStream.value) {
      console.warn('Microphone stream not initialized');
      return null;
    }
    return microphoneStream.value;
  }

  function addRemoteAudio(peerId: number, stream: MediaStream) {
    if (!audioContext.value) {
      console.warn('AudioContext not initialized');
      return;
    }

    console.debug("Adding remote audio for peer:", peerId);

    // Create an audio processing chain
    // MediaStreamSource -> UserGainNode -> ProximityGain -> PannerNode -> Destination
    const sourceNode = audioContext.value.createMediaStreamSource(stream);
    const userGain = audioContext.value.createGain();
    const pannerNode = audioContext.value.createPanner();

    // Set initial gains
    userGain.gain.value = mutedUsers.value.get(peerId) ? 0 : 1;

    // Configure pannerNode (3D audio settings)
    pannerNode.panningModel = 'HRTF';
    pannerNode.distanceModel = 'inverse'; // "inverse" | "linear" | "exponential";
    pannerNode.maxDistance = VISIBILITY_DISTANCE_NORMAL;
    pannerNode.refDistance = INTERACTION_DISTANCE;
    pannerNode.rolloffFactor = 3;
    pannerNode.coneInnerAngle = 60; // Full volume within 60 degrees
    pannerNode.coneOuterAngle = 180; // Reduced volume outside 180 degrees
    pannerNode.coneOuterGain = 0.2; // 20% volume outside the outer cone

    // Connect nodes in the processing chain
    sourceNode.connect(userGain);
    userGain.connect(pannerNode);
    pannerNode.connect(audioContext.value.destination);

    // Store nodes in a map for later updates
    gainNodes.value.set(peerId, { userGainNode: userGain, pannerNode });
  }

  function removeRemoteAudio(peerId: number) {
    const peerNodes = gainNodes.value.get(peerId);
    if (peerNodes) {
      peerNodes.pannerNode.disconnect();
      peerNodes.userGainNode.disconnect();
      gainNodes.value.delete(peerId);
      console.debug('Removed audio processing for peer:', peerId);
    }
  }

  /**
   * Updates the audio settings for a given peer relative to the player's current position and orientation.
   *
   * This function performs the following operations:
   * - Retrieves the audio nodes for the peer and exits if they or the audio context are not available.
   * - Checks if the peer is muted, and if so, sets the user gain to 0; otherwise, it restores the gain based on global volume.
   * - In 3D audio mode:
   *   - Positions the audio listener at the player's position.
   *   - Sets the listener's orientation if the player's rotation is defined.
   *   - Positions the sound source (panner) at the peer's position.
   *   - Optionally, updates the panner's orientation if the peer's rotation is defined.
   *   - Applies distance model settings for spatialization.
   * - In 2D mode:
   *   - Updates the listener position for distance-based volume adjustment.
   *   - Configures the panner with a simpler distance attenuation model.
   * The Web Audio API handles all 3D audio calculations and distance attenuation.
   * Deprecated Web Audio API methods are used if needed for compatibility with older browsers.
   *
   * @param player - The current player whose position and orientation affect the audio listener.
   * @param peer - The peer player whose audio source is updated.
   */

  function updatePeerAudio(player: Player, peer: Player) {
    const nodes = gainNodes.value.get(peer.guid);
    if (!nodes || !audioContext.value) return;

    const { userGainNode, pannerNode } = nodes;

    // Apply mute check
    if (mutedUsers.value.get(peer.guid)) {
      userGainNode.gain.value = 0;
      return;
    } else {
      // Restore normal gain if unmuted
      userGainNode.gain.value = 1 * Number(globalVolume.value);
      console.log('globalVolume.value', globalVolume.value);
    }

    // Update 3D position if sound3D is enabled
    if (useSound3D.value) {
      // Position the audio listener at the player's position
      const listener = audioContext.value.listener;
      if (listener.forwardX) {
        listener.positionX.value = player.position.x;
        listener.positionY.value = player.position.y;
      }
      else {
        listener.setPosition(player.position.x, player.position.y, 0);
      }

      // If player has a rotation/orientation, set listener orientation
      if (player.position.o !== undefined) {
        const forwardX = Math.cos(player.position.o);
        const forwardY = Math.sin(player.position.o);
        // Listener facing direction
        if (listener.forwardX) {
          listener.forwardX.setValueAtTime(forwardX, audioContext.value.currentTime);
          listener.forwardY.setValueAtTime(forwardY, audioContext.value.currentTime);
          listener.forwardZ.setValueAtTime(0, audioContext.value.currentTime);
          listener.upX.setValueAtTime(0, audioContext.value.currentTime);
          listener.upY.setValueAtTime(0, audioContext.value.currentTime);
          listener.upZ.setValueAtTime(1, audioContext.value.currentTime);
        } else {
          listener.setOrientation(forwardX, forwardY, 0, 0, 0, 1);
        }
      }

      // Position the sound source at the peer's position
      if (pannerNode.positionX) {
        pannerNode.positionX.setValueAtTime(peer.position.x, audioContext.value.currentTime);
        pannerNode.positionY.setValueAtTime(peer.position.y, audioContext.value.currentTime);
        pannerNode.positionZ.setValueAtTime(0, audioContext.value.currentTime);
      }
      else {
        pannerNode.setPosition(peer.position.x, peer.position.y, 0);
      }

      // Optional: If peer has orientation/direction, set sound orientation
      if (peer.position.o !== undefined) {
        const peerForwardX = Math.cos(peer.position.o);
        const peerForwardY = Math.sin(peer.position.o);
        pannerNode.orientationX.setValueAtTime(peerForwardX, audioContext.value.currentTime);
        pannerNode.orientationY.setValueAtTime(peerForwardY, audioContext.value.currentTime);
        pannerNode.orientationZ.setValueAtTime(0, audioContext.value.currentTime);
      }

      // Set distance model properties if you want to fine-tune
      pannerNode.distanceModel = distanceModel.value.toLowerCase() as DistanceModelType;
      pannerNode.refDistance = 1;
      pannerNode.maxDistance = AUDIBLE_DISTANCE;
    } else { // Simple 2D mode: only distance-based volume, no directional effects
      // Update the listener position too
      const listener = audioContext.value.listener;
      if (listener.positionX) {
        listener.positionX.setTargetAtTime(player.position.x, audioContext.value.currentTime, 0);
        listener.positionY.setTargetAtTime(player.position.y, audioContext.value.currentTime, 0);
      }
      else {
        listener.setPosition(player.position.x, player.position.y, 0);
      }

      // In 2D mode we can still use the built-in distance attenuation but with a simpler model
      pannerNode.distanceModel = "inverse";
      pannerNode.refDistance = 1;
      pannerNode.maxDistance = AUDIBLE_DISTANCE;
      pannerNode.rolloffFactor = 1;
    }
  }
  return {
    audioInputs,
    audioOutputs,
    initMediaDevices,
    microphone,
    mutedUsers,
    useSound3D,
    distanceModel,
    speaker,
    globalVolume,
    getMicrophoneStream,
    addRemoteAudio,
    removeRemoteAudio,
    updatePeerAudio,
    audioContext,
  };
});
