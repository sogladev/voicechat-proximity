<script setup lang="ts">
useAudioStore();
useWebRTCStore()
</script>

<template>
    <header class="flex justify-between items-center p-4 border-b">
        <!-- Left side: Player info -->
        <div class="flex flex-col">
        </div>

        <!-- Middle: Microphone selection -->
        <div class="flex text-sm">
            <MicrophoneSelector />
            <VoiceRecorder />
            <GlobalVolumeControl />
        </div>
        <!-- Right side: Server info -->
        <div class="flex flex-col text-sm">
        </div>
    </header>
    <div class="flex flex-col gap-4 p-1 md:p-2 lg:p-4">
        <ButtonDebugConnect />
        <MinimapCard />
    </div>
</template>