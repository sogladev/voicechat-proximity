import { useStorage, useDevicesList } from '@vueuse/core';
import { MAX_AUDIBLE_DISTANCE } from '~/model/constants';
import type { Player } from '~/types/types';

interface GainNodes {
  userGain: GainNode;
  pannerNode: PannerNode;
}

export const useAudioStore = defineStore('audio', () => {
  const echoCancellation = useStorage('echoCancellation', true);
  const noiseSuppression = useStorage('noiseSuppression', true);
  const sound3D = useStorage('sound3D', true);
  const sound3DModel = useStorage('sound3DModel', "linear");
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
      microphoneStream.value = await navigator.mediaDevices.getUserMedia({ audio: true });

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
      console.warn("AudioContext not initialized");
      return;
    }

    console.debug("Adding remote audio for peer:", peerId);

    // Create an audio processing chain
    // MediaStreamSource -> UserGain -> ProximityGain -> PannerNode -> Destination
    const sourceNode = audioContext.value.createMediaStreamSource(stream);
    const userGain = audioContext.value.createGain();
    const pannerNode = audioContext.value.createPanner();

    // Set initial gains
    userGain.gain.value = mutedUsers.value.get(peerId) ? 0 : 1;

    // Configure pannerNode (3D audio settings)
    pannerNode.panningModel = "HRTF";
    pannerNode.distanceModel = "inverse"; // "inverse" | "linear" | "exponential";
    pannerNode.maxDistance = MAX_AUDIBLE_DISTANCE;
    pannerNode.refDistance = 1;
    pannerNode.rolloffFactor = 3;
    pannerNode.coneInnerAngle = 360;
    pannerNode.coneOuterAngle = 0;
    pannerNode.coneOuterGain = 0;

    // Connect nodes in the processing chain
    sourceNode.connect(userGain);
    userGain.connect(pannerNode);
    pannerNode.connect(audioContext.value.destination);

    // Store nodes in a map for later updates
    gainNodes.value.set(peerId, { userGain, pannerNode });
  }

  function removeRemoteAudio(peerId: number) {
    const peerNodes = gainNodes.value.get(peerId);
    if (peerNodes) {
      peerNodes.pannerNode.disconnect();
      peerNodes.userGain.disconnect();
      gainNodes.value.delete(peerId);
      console.debug("Removed audio processing for peer:", peerId);
    }
  }

  function updatePeerAudio(player: Player, peer: Player) {
    const nodes = gainNodes.value.get(peer.guid);
    if (!nodes || !audioContext.value) return;

    const { userGain, pannerNode } = nodes;

    // Apply mute check
    if (mutedUsers.value.get(peer.guid)) {
      userGain.gain.value = 0;
      return;
    } else {
      // Restore normal gain if unmuted
      userGain.gain.value = 1 * Number(globalVolume.value);
      console.log('globalVolume.value', globalVolume.value);
    }

    // Calculate distance from player to peer (squared for efficiency)
    const dx = player.position.x - peer.position.x;
    const dy = player.position.y - peer.position.y;
    const distanceSq = dx * dx + dy * dy;
    const distance = Math.sqrt(distanceSq);

    // Update 3D position if sound3D is enabled
    if (sound3D.value && audioContext.value) {
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
      pannerNode.distanceModel = sound3DModel.value.toLowerCase() as DistanceModelType;
      pannerNode.refDistance = 1;
      pannerNode.maxDistance = MAX_AUDIBLE_DISTANCE;

      // Let Web Audio API handle all the 3D audio calculations and distance attenuation
    } else {
      // Simple 2D mode: only distance-based volume, no directional effects
      // We'll manually set the volume based on distance

      // Calculate a volume between 0 and 1 based on distance
      const maxDistance = MAX_AUDIBLE_DISTANCE; // Same as pannerNode.maxDistance

      // Linear attenuation
      let volume;
      switch (sound3DModel.value.toLowerCase()) {
        case 'inverse':
          // Inverse distance model: 1/(1 + rolloffFactor * (distance - refDistance) / refDistance)
          volume = 1 / (1 + 1 * (Math.max(distance, 1) - 1) / 1);
          break;
        case 'exponential':
          // Exponential distance model: (distance / refDistance) ^ -rolloffFactor
          volume = Math.pow(Math.max(distance, 1) / 1, -1);
          break;
        case 'linear':
        default:
          // Linear distance model: 1 - rolloffFactor * (distance - refDistance) / (maxDistance - refDistance)
          volume = Math.max(0, 1 - 1 * (distance - 1) / (maxDistance - 1));
          break;
      }

      // Update the listener position too
      const listener = audioContext.value.listener;
      // below is the old way of setting listener position
      // listener.setPosition(player.position.x, player.position.y, 0);
      listener.positionX.setTargetAtTime(player.position.x, audioContext.value.currentTime, 0);
      listener.positionY.setTargetAtTime(player.position.y, audioContext.value.currentTime, 0);

      // In 2D mode we can still use the built-in distance attenuation
      // but with a simpler model. This lets Web Audio handle volume
      pannerNode.distanceModel = "inverse";
      pannerNode.refDistance = 1;
      pannerNode.maxDistance = maxDistance;
      pannerNode.rolloffFactor = 1;
    }
  }
  return {
    audioInputs,
    audioOutputs,
    echoCancellation,
    initMediaDevices,
    microphone,
    mutedUsers,
    noiseSuppression,
    sound3D,
    sound3DModel,
    speaker,
    globalVolume,
    getMicrophoneStream,
    addRemoteAudio,
    removeRemoteAudio,
    updatePeerAudio,
    audioContext,
  };
});
