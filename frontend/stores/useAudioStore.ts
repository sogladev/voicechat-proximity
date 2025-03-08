import { useStorage, useDevicesList } from '@vueuse/core';

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
    } catch (error) {
      console.error('Error initializing media devices:', error);
    }
  }

  function getMicrophoneTrack(): MediaStreamTrack | null {
    return microphoneStream.value ? microphoneStream.value.getAudioTracks()[0] : null;
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
    getMicrophoneTrack
  };
});
