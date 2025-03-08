<script setup lang="ts">
defineProps<{
  volume: number;
  disabled?: boolean;
}>()

const emit = defineEmits<{
  (e: 'update:volume', value: number): void;
}>()

const handleVolumeChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  emit('update:volume', parseFloat(target.value))
}
</script>

<template>
  <div class="flex items-center gap-2">
    <input type="range" min="0" max="1" step="0.01" :value="volume" @input="handleVolumeChange" :disabled="disabled"
      class="flex-1 h-2 bg-secondary rounded-lg cursor-pointer accent-primary" />
    <span class="text-xs min-w-[32px] text-right">{{ Math.round(volume * 100) }}%</span>
  </div>
</template>
