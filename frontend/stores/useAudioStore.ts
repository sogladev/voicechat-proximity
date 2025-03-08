import { useStorage, useDevicesList } from '@vueuse/core';
import type { Player } from '~/types/types';

interface GainNodes {
  userGain: GainNode;
  proximityGain: GainNode;
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
    const proximityGain = audioContext.value.createGain();
    const pannerNode = audioContext.value.createPanner();

    // Set initial gains
    userGain.gain.value = mutedUsers.value.get(peerId) ? 0 : 1;
    proximityGain.gain.value = 1.0; // Will be updated based on distance

    // Configure pannerNode (3D audio settings)
    pannerNode.panningModel = "HRTF";
    pannerNode.distanceModel = sound3DModel.value.toLowerCase() as "inverse" | "linear" | "exponential";
    pannerNode.maxDistance = 100;
    pannerNode.refDistance = 1;
    pannerNode.rolloffFactor = 1;
    pannerNode.coneInnerAngle = 360;
    pannerNode.coneOuterAngle = 360;
    pannerNode.coneOuterGain = 0.3;

    // Connect nodes in the processing chain
    sourceNode.connect(userGain);
    userGain.connect(proximityGain);
    proximityGain.connect(pannerNode);
    pannerNode.connect(audioContext.value.destination);

    // Store nodes in a map for later updates
    gainNodes.value.set(peerId, { userGain, proximityGain, pannerNode });
  }

  function removeRemoteAudio(peerId: number) {
    const peerNodes = gainNodes.value.get(peerId);
    if (peerNodes) {
      peerNodes.pannerNode.disconnect();
      peerNodes.proximityGain.disconnect();
      peerNodes.userGain.disconnect(); 
      gainNodes.value.delete(peerId);
      console.debug("Removed audio processing for peer:", peerId);
    }
  }

  function updatePeerAudio(player: Player, peer: Player) {
    const nodes = gainNodes.value.get(peer.guid);
    if (!nodes || !audioContext.value) return;

    const { userGain, proximityGain, pannerNode } = nodes;

    // Calculate distance-based volume
    const distance = Math.sqrt(calculatePlayerDistanceSq(player, peer));
    const maxDistance = 100;
    console.log(distance, maxDistance);
    let volume = Math.max(0, 1 - distance / maxDistance); // Linear volume scaling
    volume = volume * userGain.gain.value; // Apply user volume

    console.debug(`Distance to peer ${peer.guid}: ${distance}, volume: ${volume}`);

    // Apply mute check
    if (mutedUsers.value.get(peer.guid)) {
      volume = 0;
    }

    // Apply smooth volume transition
    proximityGain.gain.setTargetAtTime(volume, audioContext.value.currentTime, 0.1);

    // Update 3D position if sound3D is enabled
    if (sound3D.value && audioContext.value) {
      const { x, y, z } = player.position;
      const { o } = player.position;
      const dx = Math.cos(o);
      const dy = 0;
      const dz = Math.sin(o);

      pannerNode.positionX.setValueAtTime(x, audioContext.value.currentTime);
      pannerNode.positionY.setValueAtTime(y, audioContext.value.currentTime);
      pannerNode.positionZ.setValueAtTime(z, audioContext.value.currentTime);
      pannerNode.orientationX.setValueAtTime(dx, audioContext.value.currentTime);
      pannerNode.orientationY.setValueAtTime(dy, audioContext.value.currentTime);
      pannerNode.orientationZ.setValueAtTime(dz, audioContext.value.currentTime);
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
  };
});
