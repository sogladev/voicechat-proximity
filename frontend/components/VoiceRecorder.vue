<script setup lang="ts">
const audioStore = useAudioStore();
const { microphone } = storeToRefs(audioStore);

const isRecording = ref(false);
const mediaRecorder = ref<MediaRecorder | null>(null);
const audioChunks = ref<Blob[]>([]);
const audioUrl = ref<string | null>(null);
const audioElement = ref<HTMLAudioElement | null>(null);
const recordingTimeout = ref<number | null>(null);

const RECORDING_LIMIT_IN_MILLISECONDS = 2000

const startRecording = async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                deviceId: microphone.value?.deviceId,
                echoCancellation: audioStore.echoCancellation,
                noiseSuppression: audioStore.noiseSuppression,
            }
        });

        mediaRecorder.value = new MediaRecorder(stream);
        audioChunks.value = [];

        mediaRecorder.value.ondataavailable = (event) => {
            audioChunks.value.push(event.data);
        };

        mediaRecorder.value.onstop = () => {
            const audioBlob = new Blob(audioChunks.value, { type: 'audio/wav' });
            audioUrl.value = URL.createObjectURL(audioBlob);

            if (audioElement.value) {
                audioElement.value.src = audioUrl.value;
                audioElement.value.play();
            }
        };

        mediaRecorder.value.start();
        isRecording.value = true;

        // Set timeout to stop recording after set amount of seconds
        recordingTimeout.value = window.setTimeout(() => {
            stopRecording();
        }, RECORDING_LIMIT_IN_MILLISECONDS);
    } catch (error) {
        console.error('Error starting recording:', error);
    }
};

const stopRecording = () => {
    if (mediaRecorder.value && isRecording.value) {
        // Clear the timeout if stopping manually
        if (recordingTimeout.value) {
            clearTimeout(recordingTimeout.value);
            recordingTimeout.value = null;
        }

        mediaRecorder.value.stop();
        isRecording.value = false;
        mediaRecorder.value.stream.getTracks().forEach(track => track.stop());
    }
};

onUnmounted(() => {
    if (audioUrl.value) {
        URL.revokeObjectURL(audioUrl.value);
    }
});
</script>

<template>
    <div class="flex items-center justify-center">
        <Button @click="isRecording ? stopRecording() : startRecording()">
            <div class="flex items-center gap-2">
                <Icon :name="isRecording ? '' : 'lucide:mic-vocal'" />
                {{ isRecording ? 'Recording...' : 'Record sample' }}
            </div>
        </Button>
        <audio ref="audioElement" controls class="hidden"></audio>
    </div>
</template>
