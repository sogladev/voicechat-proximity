<script setup lang="ts">
import type { Player } from '@/types/types'

const props = defineProps<{
   status: Ref<WebSocketStatus>;
   player: Player;
   }>()
const volume = ref(100)
const isMuted = ref(false)

const statusFmt = computed(() => {
    switch (props.status.value) {
        case 'OPEN': return 'Online';
        case 'CONNECTING': return 'Connecting';
        case 'CLOSED': return 'Offline';
    }
});

// Placeholder avatar URL; you might use a real URL or a placeholder service.
const avatarUrl = computed(() =>
 props.player ? `https://via.placeholder.com/40?text=${props.player.name.charAt(0).toUpperCase()}` : ''
)

const toggleMute = () => {
  isMuted.value = !isMuted.value
  // Optionally, update volume or call a method to change the remote player's audio
}
</script>

<template>
  <Card class="p-4">
    <div class="flex items-center space-x-3">
      <Avatar class="w-10 h-10">
        <AvatarImage :src="avatarUrl" :alt="player.name" />
        <AvatarFallback>{{ player.name.charAt(0).toUpperCase() }}</AvatarFallback>
      </Avatar>
      <div>
        <p class="font-semibold text-lg">{{ player.name }}</p>
        <p class="text-sm text-muted-foreground">{{ "class" }}</p>
      </div>
    </div>
    <div class="mt-3">
      <p class="text-sm">
        Status: <span :class="!player.alive ? 'text-red-500' : 'text-green-500'">
          {{ !player.alive ? 'Dead' : 'Alive' }}
        </span>
      </p>
      <!-- Volume control -->
      <div class="mt-2 flex items-center space-x-2">
        <label for="volume-{{ player.guid }}" class="text-sm">Volume:</label>
        <input
          type="range"
          :id="'volume-' + player.guid"
          min="0"
          max="100"
          v-model="volume"
          class="w-full"
        />
      </div>
      <!-- Mute button -->
      <Button variant="outline" class="mt-2" @click="toggleMute">
        <!-- {{ isMuted ? 'Unmute' : 'Mute' }} -->
      <Icon v-if="isMuted" name="lucide:mic-off" class="w-6 h-6" />
      <Icon v-else name="lucide:mic" class="w-6 h-6" />
      </Button>
      <!-- Subtext -->
      <p class="mt-2 text-xs text-muted-foreground">Current volume: {{ volume }}%</p>
    </div>
  </Card>
</template>