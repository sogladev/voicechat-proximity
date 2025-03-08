export function useAudioManager(selectedMicrophoneId: Ref<string>) {
    const audioContext = ref<AudioContext | null>(null);
    const localStream = ref<MediaStream | null>(null);
    const voiceNodes = reactive<Record<string, { source: MediaStreamAudioSourceNode; userGain: GainNode; proximityGain: GainNode }>>({});

    const { audioInputs } = useDevicesList({ requestPermissions: true });

    // Request microphone access and set up the audio context
    const initializeMicrophone = async () => {
        if (!audioContext.value) {
            audioContext.value = new (window.AudioContext)();
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: { deviceId: selectedMicrophoneId.value || undefined },
            });

            localStream.value = stream;

            // Auto-set the selected microphone if it was not explicitly chosen
            if (!selectedMicrophoneId.value && stream.getAudioTracks().length > 0) {
                selectedMicrophoneId.value = stream.getAudioTracks()[0].getSettings().deviceId || '';
            }
        } catch (error) {
            console.error('Failed to access microphone:', error);
        }
    };

    // Add a WebRTC stream to the audio context with user & proximity gain control
    const addVoiceStream = (stream: MediaStream, id: number) => {
        if (!audioContext.value) return;
        console.debug(`Adding voice stream for peer ${id}`);

        const context = audioContext.value;
        const source = context.createMediaStreamSource(stream);
        const userGain = context.createGain();
        const proximityGain = context.createGain();

        userGain.gain.value = 1;
        proximityGain.gain.value = 1;

        source.connect(userGain);
        userGain.connect(proximityGain);
        proximityGain.connect(context.destination);

        voiceNodes[id] = { source, userGain, proximityGain };

        console.debug(`Voice stream added for peer ${id}`);
    };

    const removeVoiceStream = (id: number) => {
        if (voiceNodes[id]) {
            console.debug(`Removing voice stream for peer ${id}`);
            // Disconnect all nodes
            voiceNodes[id].source.disconnect()
            voiceNodes[id].userGain.disconnect()
            voiceNodes[id].proximityGain.disconnect()

            // Remove from our tracking
            delete voiceNodes[id]

            console.debug(`Voice stream removed for peer ${id}`);
        }
    }

    // Volume control functions
    const updateUserGain = (id: number, value: number) => {
        if (voiceNodes[id]) voiceNodes[id].userGain.gain.value = value;
    };

    const updateProximityGain = (id: number, value: number) => {
        if (voiceNodes[id]) voiceNodes[id].proximityGain.gain.value = value;
    };

    // Watch for microphone selection changes
    watch(selectedMicrophoneId, async () => {
        if (localStream.value) {
            localStream.value.getTracks().forEach((track) => track.stop()); // Stop previous tracks
        }
        await initializeMicrophone(); // Reinitialize with new device
    });

    onMounted(initializeMicrophone);

    return {
        audioContext,
        localStream,
        audioInputs,
        voiceNodes,
        addVoiceStream,
        updateUserGain,
        updateProximityGain,
        removeVoiceStream
    };
}
