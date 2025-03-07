<script setup lang="ts">
import type { Player, PeerConnectionInfo } from '@/types/types'

const props = defineProps<{
  player: Player;
  connectionInfo: PeerConnectionInfo | null;
}>()

// Placeholder avatar URL; you might use a real URL or a placeholder service.
const avatarUrl = computed(() =>
  props.player ? `https://via.placeholder.com/40?text=${props.player.name.charAt(0).toUpperCase()}` : ''
)
</script>

<template>
  <Card class="p-4 relative">
    <div class="flex items-center space-x-3">
      <Avatar class="w-10 h-10">
        <AvatarImage :src="avatarUrl" :alt="player.name" />
        <AvatarFallback>{{ player.name.charAt(0).toUpperCase() }}</AvatarFallback>
      </Avatar>
      <div>
        <p class="font-semibold text-lg">{{ player.name }}</p>
        <p> userVolumeFactor: {{ connectionInfo?.userVolumeFactor }} </p>
        <!-- <p> gainNode: {{  `${Math.round((connectionInfo?.gainNode.gain.value || 0) * 100)}%` }} </p> -->
      </div>
    </div>
  </Card>
</template>
