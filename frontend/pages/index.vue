<script setup lang="ts">
import { Badge } from '@/components/ui/badge'

const name = ref('Unknown')
const status = ref('Offline')
const statusColor = computed(() => (status.value === 'Online' ? 'green' : 'red'))

const micStream = ref<MediaStream | null>(null)
const handleStream = (stream: MediaStream) => {
    console.log('Received stream from child:', stream)
    micStream.value = stream;
}
</script>

<template>
    <header class="flex justify-between items-center p-4 bg-grey-50 border-b border-slate-200">
        <!-- Left side: Player info -->
        <div class="flex flex-col">
            <div>
                <h1 class="text-xl font-bold">{{ name }}</h1>
                <Badge variant="outline" :color="statusColor">{{ status }}</Badge>
            </div>
        </div>

        <!-- Microphone selection -->
        <div class="flex flex-col">
            <div class="text-lg font-semibold">Microphone</div>
            <MicrophoneControls @streamReady="handleStream" />
        </div>

        <!-- Right side: Server info -->
        <div class="flex flex-col text-sm">
            <div class="flex">
                <p class=" text-grey-500">Connecting to:</p>
                <p class="ml-2 font-mono text-blue-600">localhost</p>
            </div>
            <div class="flex ">
                <p class="text-grey-500">Ping:</p>
                <p class="ml-2 font-mono text-blue-600">20ms</p>
            </div>
        </div>
    </header>
    <div class="p-4 md:p-2 lg:p-1">
        Index Page
    </div>
</template>