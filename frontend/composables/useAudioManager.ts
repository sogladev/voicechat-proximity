export function useAudioManager(deviceId?: string) {
    // Global AudioContext (or null until initialized)
    const audioContext = ref<AudioContext | null>(null);
    // Local user media stream (from getUserMedia)
    const localStream = ref<MediaStream | null>(null);

    // Store per-voice audio nodes keyed by an identifier (e.g. userId)
    const voiceNodes = reactive<Record<number, {
        source: MediaStreamAudioSourceNode;
        userGain: GainNode;
        proximityGain: GainNode;
    }>>({});

    // When the component mounts, initialize the AudioContext and request audio permissions
    onMounted(async () => {
        try {
            // Create the AudioContext
            audioContext.value = new (window.AudioContext)();

            // Request audio permissions from the user (optionally using a deviceId)
            localStream.value = await navigator.mediaDevices.getUserMedia({
                audio: { deviceId: deviceId || undefined }
            });

            // Optionally, you could connect localStream to the AudioContext if needed
            // For example, to monitor your own audio or for processing.
        } catch (error) {
            console.error('Failed to initialize AudioContext or acquire audio stream:', error);
        }
    });

    /**
     * Adds a new voice stream to the global AudioContext.
     * Each new stream is connected through two GainNodes:
     * - userGain: controlled by the user via the UI
     * - proximityGain: controlled programmatically based on proximity data.
     *
     * The effective volume will be the product of both gains.
     *
     * @param stream - MediaStream containing the WebRTC audio track
     * @param id - Unique identifier for the stream (e.g., userId)
     */
    const addVoiceStream = (stream: MediaStream, id: number) => {
        if (!audioContext.value) {
            console.warn('AudioContext not initialized yet.');
            return;
        }
        const context = audioContext.value;

        // Create an audio source node from the MediaStream
        const source = context.createMediaStreamSource(stream);
        // Create two gain nodes for individual volume control
        const userGain = context.createGain();
        const proximityGain = context.createGain();

        // Set default volume values (1 = 100%)
        userGain.gain.value = 1;
        proximityGain.gain.value = 1;

        // Chain the nodes: source -> userGain -> proximityGain -> destination
        source.connect(userGain);
        userGain.connect(proximityGain);
        proximityGain.connect(context.destination);

        // Store the voice node components for future volume adjustments
        voiceNodes[id] = { source, userGain, proximityGain };
    };

    // Update the user-controlled volume for a specific voice node.
    const updateUserGain = (id: number, value: number) => {
        if (voiceNodes[id]) {
            voiceNodes[id].userGain.gain.value = value;
        } else {
            console.warn(`Voice node with id ${id} not found.`);
        }
    };

    // Update the proximity-controlled volume for a specific voice node.
    const updateProximityGain = (id: number, value: number) => {
        if (voiceNodes[id]) {
            voiceNodes[id].proximityGain.gain.value = value;
        } else {
            console.warn(`Voice node with id ${id} not found.`);
        }
    };

    return {
        audioContext,
        localStream,
        voiceNodes,
        addVoiceStream,
        updateUserGain,
        updateProximityGain,
    };
}

