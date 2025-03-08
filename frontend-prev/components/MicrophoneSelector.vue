<script setup lang="ts">
import { computed } from 'vue';
import type { MediaDeviceInfo } from '@/types/types';

const props = defineProps<{
  microphones: MediaDeviceInfo[];
  currentMicrophone: { deviceId: string } | boolean;
  stream: MediaStream | null;
}>();

const emit = defineEmits<{
  (event: 'select', deviceId: string): void;
}>();

const selectedDeviceId = computed({
  get: () => {
    if (typeof props.currentMicrophone === 'object' && props.currentMicrophone.deviceId) {
      return props.currentMicrophone.deviceId;
    }
    return '';
  },
  set: (deviceId: string) => {
    emit('select', deviceId);
  }
});

const microphoneLabel = (device: MediaDeviceInfo) => {
  return device.label || `Microphone ${device.deviceId.substring(0, 5)}...`;
};

const hasMicrophones = computed(() => props.microphones.length > 0);
const isStreamActive = computed(() => props.stream && props.stream.active);
</script>

<template>
  <div class="microphone-selector">
    <div v-if="!hasMicrophones && !isStreamActive" class="no-devices">
      <p>No microphone devices found.</p>
      <button @click="$emit('select', '')">
        Request Microphone Access
      </button>
    </div>

    <div v-else-if="isStreamActive" class="device-selector">
      <label for="microphone-select">Microphone:</label>
      <select
        id="microphone-select"
        v-model="selectedDeviceId"
        class="device-select"
      >
        <option v-for="device in microphones" :key="device.deviceId" :value="device.deviceId">
          {{ microphoneLabel(device) }}
        </option>
      </select>
    </div>

    <div v-else class="enable-audio">
      <button @click="$emit('select', '')">
        Enable Microphone
      </button>
    </div>
  </div>
</template>

<style scoped>
.microphone-selector {
  background-color: rgba(45, 45, 48, 0.8);
  border-radius: 8px;
  padding: 12px;
  width: 100%;
  max-width: 300px;
}

.device-selector {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

label {
  color: #eee;
  font-size: 0.9rem;
}

.device-select {
  padding: 8px;
  border-radius: 4px;
  border: 1px solid #444;
  background-color: #333;
  color: white;
  font-size: 0.9rem;
}

button {
  padding: 8px 16px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  width: 100%;
}

button:hover {
  background-color: #45a049;
}

.no-devices {
  color: #eee;
  text-align: center;
}
</style>