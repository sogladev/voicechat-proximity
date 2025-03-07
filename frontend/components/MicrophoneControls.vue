<script setup lang="ts">
import { useDevicesList } from '@vueuse/core'

const hasPermission = ref(false)
const microphoneStream = ref<MediaStream | null>(null)
const selectedMicrophoneId = ref('')

// Get the list of available audio input devices.
// Note: requestPermissions is set to false here so we can control permission with our button.
const { audioInputs } = useDevicesList({ requestPermissions: false })

// Computed options for the select dropdown.
const microphoneOptions = computed(() => audioInputs.value)

// Request microphone access when the button is clicked.
const handleRequestPermission = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: selectedMicrophoneId.value || undefined } })
    hasPermission.value = true
    microphoneStream.value = stream

    // Set the default microphone
    const audioTracks = stream.getAudioTracks()
    // getSettings() contains the deviceId used by the browser.
    // [MDN Reference](https://developer.mozilla.org/docs/Web/API/MediaStreamTrack/getSettings)
    if (audioTracks.length > 0) {
      selectedMicrophoneId.value = audioTracks[0].getSettings().deviceId || ''
    }
  } catch (error) {
    console.error('Microphone permission denied:', error)
  }
}

// Function to mute/unmute
const isMuted = ref(false)
const toggleMute = () => {
  if (!microphoneStream.value) return
  microphoneStream.value.getAudioTracks().forEach(track => {
    track.enabled = !track.enabled
  })
  isMuted.value = !isMuted.value
}

// Function to change volume (using GainNode in Web Audio API)
const audioContext = new AudioContext()
// [MDN Reference](https://developer.mozilla.org/docs/Web/API/BaseAudioContext/createGain) */
const gainNode = audioContext.createGain()
const volume = ref(0.50) // Default volume 50%

watchEffect(() => {
  gainNode.gain.value = volume.value
})

/**
 * Sets the volume level for the microphone.
 *
 * @param {number} newVolume - The new volume level to set, ranging from 0.0 to 1.0.
 * @throws {Error} Will throw an error if the newVolume is out of the range [0, 1].
 */
const setVolume = (newVolume: number) => {
  if (newVolume < 0 || newVolume > 1) {
    throw new Error('Volume must be between 0.0 and 1.0')
  }
  volume.value = newVolume
}

/**
 * Calculates the peak volume level
 *
 * @returns {number} The maximum frequency value representing the peak audio level.
 */
const analyzeAudioLevel = () => {
  if (!microphoneStream.value) return 0
  const analyser = audioContext.createAnalyser()
  const source = audioContext.createMediaStreamSource(microphoneStream.value)
  source.connect(analyser)
  analyser.fftSize = 256
  const dataArray = new Uint8Array(analyser.frequencyBinCount)
  analyser.getByteFrequencyData(dataArray)
  return Math.max(...dataArray) // Get peak volume level
}

// Expose these methods & properties so the parent can access them
defineExpose({
  microphoneStream,
  toggleMute,
  setVolume,
  analyzeAudioLevel
})

</script>

<template>
  <div class="flex flex-col gap-2 w-full ">
    <!-- Button to request microphone permission -->
    <Button v-if="!hasPermission" @click="handleRequestPermission" variant="default">
      Allow Microphone
    </Button>
    <!-- Once permission is granted, show the microphone dropdown -->
    <div v-else>
      <Select v-model="selectedMicrophoneId">
        <SelectTrigger>
          <SelectValue placeholder="Select a microphone" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem v-for="mic in microphoneOptions" :key="mic.deviceId" :value="mic.deviceId || 'unknown'">
              {{ mic.label || 'Unknown Device' }}
            </SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
    <!-- Show mute button and volume control -->
    <div class="flex flex-col">
      <div class="flex">
        <!-- <MicrophoneControlsMuteButton :disabled="!hasPermission" :is-muted="isMuted" @toggle-mute="toggleMute" /> -->
        <!-- <MicrophoneControlsVolumeSlider :disabled="!hasPermission" :volume="volume" @set-volume="setVolume" /> -->
        <!-- <input class="w-full accent-primary" type="range" min="0" max="1" step="0.01" v-model="volume" @input="setVolume(volume)" /> -->
      </div>
      <!-- <div class="mx-2 w-32 "> -->
      <!-- <Slider v-model="volume" :min="0" :max="100" :step="1" name="Volume" /> -->
      <!-- </div> -->
      <!-- Subtext -->
      <p class="mt-2 text-xs text-muted-foreground">Current volume: {{ (volume * 100).toFixed(0) }}%</p>
    </div>
  </div>
</template>