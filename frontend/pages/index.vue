<script setup lang="ts">
import MicrophoneControls from '@/components/MicrophoneControls.vue'

const name = ref('Unknown')
const statusFmt = ref('Offline')
const statusColor = computed(() => (statusFmt.value === 'Online' ? 'green' : 'red'))

const microphoneControls = ref<typeof MicrophoneControls>()

// Updated via WebSocket
import { usePlayerConnection } from '@/composables/usePlayerConnection'

const {
    connectAs,
    player,
    nearbyPlayers,
    status
} = usePlayerConnection()

</script>

<template>
    <header class="flex justify-between items-center p-4 bg-grey-50 border-b border-slate-200">
        <!-- Left side: Player info -->
        <div class="flex flex-col">
            <div>
                <h1 class="text-xl font-bold">{{ name }}</h1>
                <Badge variant="outline" :color="statusColor">{{ statusFmt }}</Badge>
            </div>
        </div>

        <!-- Middle: Microphone selection -->
        <!-- Right side: Server info -->
        <div class="flex flex-col text-sm">
            <div class="text-lg font-semibold">Server</div>
            <div class="flex">
                <p class=" text-grey-500">Address:</p>
                <p class="ml-2 font-mono text-blue-600">localhost</p>
            </div>
            <div class="flex ">
                <p class="text-grey-500">Ping:</p>
                <p class="ml-2 font-mono text-blue-600">20ms</p>
            </div>
        </div>
    </header>
    <div class="flex flex-col gap-4 p-1 md:p-2 lg:p-4">
        <div class="text-lg font-semibold">Player</div>
        <div class="flex gap-4">
            <CurrentPlayerStatus :player="player" :status="status.toString()" />
            <div class="flex flex-col">
                <div class="text-lg font-semibold">Microphone</div>
                <MicrophoneControls ref="microphoneControls" />
            </div>
        </div>

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
                    <div class="flex items-center space-x-4 p-4 rounded-md border hover:bg-gray-50 cursor-pointer"
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
                    <div class="flex items-center space-x-4 p-4 rounded-md border hover:bg-gray-50 cursor-pointer"
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

        <!-- Optional sidebar for history on wide screens -->
        <aside class="hidden lg:block w-64 p-4 border-l">
            <h3 class="text-lg font-bold">History</h3>
            <!-- Render history of nearby players -->
            <p class="text-sm text-muted-foreground">Coming soon...</p>
        </aside>
    </div>
</template>