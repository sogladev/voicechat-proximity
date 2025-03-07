<script setup lang="ts">
const props = defineProps<{
  level: number; // 0-1 range for audio level
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
  colorThreshold?: boolean;
}>()

const heightClasses = computed(() => {
  switch (props.size || 'md') {
    case 'sm': return 'h-1';
    case 'lg': return 'h-3';
    default: return 'h-2';
  }
})

const activityColor = computed(() => {
  if (!props.colorThreshold) return 'bg-blue-500'
  if (props.level > 0.7) return 'bg-red-500';
  if (props.level > 0.4) return 'bg-green-500';
  if (props.level > 0.1) return 'bg-blue-500';
  return 'bg-gray-400';
})

// Format the level as a percentage
const formattedLevel = computed(() => {
  return `${Math.round(props.level * 100)}%`
})
</script>

<template>
  <div class="w-full">
    <div class="w-full bg-gray-200 rounded overflow-hidden" :class="heightClasses">
      <div class="h-full transition-all duration-100 ease-out rounded" :class="activityColor"
        :style="{ width: `${Math.min(100, props.level * 100)}%` }">
      </div>
    </div>
    <div v-if="showValue" class="text-xs text-gray-500 text-right mt-1">
      {{ formattedLevel }}
    </div>
  </div>
</template>
