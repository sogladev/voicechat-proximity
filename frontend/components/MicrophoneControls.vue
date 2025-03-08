<script setup lang="ts">
import { useDevicesList } from '@vueuse/core'
import { useAudioManager } from '~/composables/useAudioManager';

const selectedMicrophoneId = ref('');
const { localStream, audioInputs, updateUserGain } = useAudioManager(selectedMicrophoneId);

// Mute Toggle
const isMuted = ref(false);
const toggleMute = () => {
  if (!localStream.value) return;
  localStream.value.getAudioTracks().forEach(track => (track.enabled = !track.enabled));
  isMuted.value = !isMuted.value;
};

// Volume Control
const volume = ref(0.5);
const setVolume = (value: number) => {
  volume.value = value;
  // Example: If controlling user volume for a specific user
  updateUserGain('local-user', value);
};

</script>

<template>
  <div class="flex flex-col gap-2 w-full ">
    <!-- Button to request microphone permission -->
    <!-- Once permission is granted, show the microphone dropdown -->
    <div>
      <Select v-model="selectedMicrophoneId">
        <SelectTrigger>
          <SelectValue placeholder="Select a microphone" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem v-for="mic in audioInputs" :key="mic.deviceId" :value="mic.deviceId || 'unknown'">
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
        <input class="w-full accent-primary" type="range" min="0" max="1" step="0.01" v-model="volume" @input="setVolume(volume)" />
      </div>
      <!-- <div class="mx-2 w-32 "> -->
      <!-- <Slider v-model="volume" :min="0" :max="100" :step="1" name="Volume" /> -->
      <!-- </div> -->
      <!-- Subtext -->
      <p class="mt-2 text-xs text-muted-foreground">Current volume: {{ (volume * 100).toFixed(0) }}%</p>
    </div>
  </div>
</template>