<script setup lang="ts">
const selectedMicrophoneId = ref("");
const audioStore = useAudioStore();
const { audioInputs, microphone } = storeToRefs(audioStore);

onMounted(async () => {
  await audioStore.initMediaDevices();
  // Set default microphone
  const defaultMic = audioInputs.value.find(mic => mic.deviceId === microphone.value?.deviceId);
  if (defaultMic) {
    selectedMicrophoneId.value = defaultMic.deviceId;
  }
});
</script>

<template>
  <div class="flex flex-col gap-4 p-1 md:p-2 lg:p-4">
    <label for="mic-select" class="text-sm">Select Microphone</label>
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
  </div>
</template>
