<script setup lang="ts">
const audioStore = useAudioStore();
const { audioInputs,
    audioOutputs,
    echoCancellation,
    microphone,
    mutedUsers,
    noiseSuppression,
    sound3D,
    sound3DModel,
    speaker } = storeToRefs(audioStore);

const webrtcStore = useWebRTCStore()

</script>

<template>
    <header class="flex justify-between items-center p-4 border-b">
        <!-- Left side: Player info -->
        <div class="flex flex-col">
        </div>

        <!-- Middle: Microphone selection -->
        <div class="flex flex-col text-sm">
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