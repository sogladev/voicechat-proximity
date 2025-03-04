<script setup lang="ts">
defineProps<{
    volume: number
}>()

const emit = defineEmits<{
    'set-volume': [volume: number]
}>()

const handleInput = (event: Event) => {
    const newVolume = Number((event.target as HTMLInputElement).value)
    emit('set-volume', newVolume)
}

</script>
<template>
    <input
        class="w-full accent-primary"
        type="range"
        min="0"
        max="1"
        step="0.01"
        :value="volume"
        @input="handleInput"
    />
</template>

<style scoped>
</style>