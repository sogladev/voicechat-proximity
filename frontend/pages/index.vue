<script setup lang="ts">
import MicrophoneControls from '~/components/MicrophoneControls.vue'

const microphoneControls = ref<InstanceType<typeof MicrophoneControls>>()

// WebSocket connection for player data & signaling messages.
const {
    send,
    status,
    connectAs,
    player,
    nearbyPlayers,
} = usePlayerConnection()

// Use a computed prop to maintain reactivity
const microphoneStream = computed(() => microphoneControls.value?.microphoneStream || null)

// WebRTC Manager for establishing peer connections.
const { initializeAudio, handleSignalingMessage, getPeerConnections } = useWebRTCVoiceManager(
    player,
    nearbyPlayers,
    (message: string) => send(message),
    status,
    microphoneStream
);

// Add a watcher to initialize audio when the stream becomes available
watch(microphoneStream, (newStream) => {
  if (newStream) {
    console.log('Microphone stream is ready, initializing WebRTC audio')
    initializeAudio()
  }
}, { immediate: true })

// Expose peer connections for the UI (e.g., to display volume sliders, etc.)
const peerConnections = getPeerConnections()
</script>

<template>
    <header class="flex justify-between items-center p-4 border-b">
        <!-- Left side: Player info -->
        <div class="flex flex-col">
            <div class="text-lg font-semibold">Player</div>
            <div class="flex gap-4">
                <CurrentPlayerStatus :player="player" :status="status.toString()" />
            </div>
        </div>

        <!-- Middle: Microphone selection -->
        <div class="flex flex-col text-sm">
            <div class="flex flex-col">
                <div class="text-lg font-semibold">Microphone</div>
                <MicrophoneControls ref="microphoneControls" />
            </div>
        </div>
        <!-- Right side: Server info -->
        <div class="flex flex-col text-sm">
            <div class="text-lg font-semibold">Server</div>
            <p>Address:<span class="ml-2 font-mono">localhost</span></p>
            <p>Ping:<span class="ml-2 font-mono">20ms</span></p>
            <div>
                <Badge variant="outline" :class="[
                    { ['text-red-500']: status === 'CLOSED' },
                    { ['text-yellow-500']: status === 'CONNECTING' },
                    { ['text-green-500']: status === 'OPEN' }]">
                    {{ status }}
                </Badge>
            </div>
        </div>
    </header>
    <div class="flex flex-col gap-4 p-1 md:p-2 lg:p-4">
        <NearbyPlayers :players="nearbyPlayers" />
        <Separator class="my-4" label="Debug" />
        <Card class="max-w-md mx-auto">
            <CardHeader>
                <CardTitle>Connect as a Player - Debug</CardTitle>
                <CardDescription>Select a player to connect as</CardDescription>
            </CardHeader>
            <CardContent>
                <div class="space-y-4">
                    <!-- Player: Alice -->
                    <div class="flex items-center space-x-4 p-4 rounded-md border hover:brightness-200 cursor-pointer"
                        @click="connectAs(8)">
                        <Avatar class="w-10 h-10">
                            <AvatarImage src="https://via.placeholder.com/40?text=A" alt="Alice" />
                            <AvatarFallback>A</AvatarFallback>
                        </Avatar>
                        <div>
                            <p class="font-semibold text-lg">Alice</p>
                            <p class="text-sm text-muted-foreground">GUID: 8</p>
                        </div>
                    </div>
                    <!-- Player: Bob -->
                    <div class="flex items-center space-x-4 p-4 rounded-md border hover:brightness-200 cursor-pointer"
                        @click="connectAs(9)">
                        <Avatar class="w-10 h-10">
                            <AvatarImage src="https://via.placeholder.com/40?text=B" alt="Bob" />
                            <AvatarFallback>B</AvatarFallback>
                        </Avatar>
                        <div>
                            <p class="font-semibold text-lg">Bob</p>
                            <p class="text-sm text-muted-foreground">GUID: 9</p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
        <div class="mt-4">
            <MinimapCard v-if="player && nearbyPlayers" :nearbyPlayers="nearbyPlayers" :player="player" />
        </div>

        <!-- Todo sidebar for history of nearby players -->
        <aside class="hidden lg:block w-64 p-4 border-l">
            <h3 class="text-lg font-bold">History</h3>
            <!-- Render history of nearby players -->
            <p class="text-sm text-muted-foreground">Coming soon...</p>
        </aside>
    </div>
</template>