<script setup lang="ts">
const props = defineProps<{
    isMuted: boolean
}>()

const emit = defineEmits<{
    'toggle-mute': []
}>()
</script>

<template>
    <Button class="p-2" variant="secondary" @click="emit('toggle-mute')">
        <!-- {{ props.isMuted ? 'Muted' : 'Not Muted' }} -->
        <Icon v-if="props.isMuted" name="lucide:mic-off" class="w-6 h-6" />
        <Icon v-else name="lucide:mic" class="w-6 h-6" />
    </Button>
</template>


<style scoped></style>