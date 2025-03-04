<script setup lang="ts">
import type { Player } from '@/types/types'

const props = defineProps<{
  player: Player;
}>()
const volume = ref(1.0)
const isMuted = ref(false)


// Placeholder avatar URL; you might use a real URL or a placeholder service.
const avatarUrl = computed(() =>
  props.player ? `https://via.placeholder.com/40?text=${props.player.name.charAt(0).toUpperCase()}` : ''
)

const toggleMute = () => {
  isMuted.value = !isMuted.value
  // Optionally, update volume or call a method to change the remote player's audio
}

const setVolume = (newVolume: number) => {
  volume.value = newVolume
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
      <div class="mt-2 flex items-center space-x-2">
        <!-- Mute button -->
        <MicrophoneControlsMuteButton :is-muted="isMuted" @toggle-mute="toggleMute" />
        <!-- Volume control -->
        <MicrophoneControlsVolumeSlider :volume="volume" @set-volume="setVolume" :id="'volume-' + player.guid" />
      </div>
      <!-- Subtext -->
      <p class="mt-2 text-xs text-muted-foreground">Current volume: {{ (volume * 100).toFixed(0) }}%</p>
    </div>
  </Card>
</template>