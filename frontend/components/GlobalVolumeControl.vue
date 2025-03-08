<script setup lang="ts">
const audioStore = useAudioStore();
const { globalVolume } = storeToRefs(audioStore);

import testSoundPath from '@/assets/sounds/volume-test-sound-bubble.mp3';
</script>

<template>
  <div class="flex flex-col p-4">
    <div>
      <!-- Global Volume Slider -->
      <label class="text-sm">Global Volume</label>
      <VolumeSlider :volume="globalVolume" @update:volume="globalVolume = $event" />
      <!-- Test Sound Button -->
      <ButtonPlayAudio text="Test Volume" id="test-sound" :volume="globalVolume" :path="testSoundPath" />
    </div>
  </div>
</template>
