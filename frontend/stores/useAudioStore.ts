import { useStorage, useDevicesList } from '@vueuse/core';
import type { Player } from '~/types/types';

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
  const gainNodes = ref(new Map<number, GainNode>());

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
    const sourceNode = audioContext.value.createMediaStreamSource(stream);
    const gainNode = audioContext.value.createGain();

    sourceNode.connect(gainNode);
    gainNode.connect(audioContext.value.destination);

    // Store GainNode for per-peer volume control
    gainNodes.value.set(peerId, gainNode);
  }

  function setPeerVolume(peerId: number, volume: number) {
    const gainNode = gainNodes.value.get(peerId);
    if (gainNode) {
      gainNode.gain.value = volume;
      console.debug(`Set volume for peer ${peerId} to ${volume}`);
    }
  }

  function removeRemoteAudio(peerId: number) {
    const gainNode = gainNodes.value.get(peerId);
    if (gainNode) {
      gainNode.disconnect();
      gainNodes.value.delete(peerId);
      console.debug("Removed audio processing for peer:", peerId);
    }
  }

  function updatePeerAudio(player: Player, peer: Player) {
    const distanceSq = calculatePlayerDistanceSq(player, peer);
    const volume = 1.0 / (1.0 + distanceSq);
    setPeerVolume(peer.guid, volume);
    console.log(`Updated volume for peer ${peer.guid} to ${volume}`);
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
    setPeerVolume,
    removeRemoteAudio,
    updatePeerAudio,
  };
});
