<script lang="ts" setup>
const props = defineProps({
  text: String,
  id: String,
  volume: Number,
  path: String,
});

const isPlaying = ref(false);
const audioRef = ref<HTMLAudioElement | null>(null);

function onClick() {
  if (!props.id) return;

  const track = audioRef.value;
  if (!track) return;

  track.currentTime = 0;
  track.volume = props.volume ?? 1.0;

  track.addEventListener(
    'ended',
    () => {
      isPlaying.value = false;
    },
    { once: true }
  );

  track.play();
  isPlaying.value = true;
}

onMounted(() => {
  const track = audioRef.value;
  if (track) {
    track.addEventListener('error', (e) => {
      console.error('Error loading audio:', e);
    });
  }
});
</script>

<template>
  <div class="mt-3">
    <Button @click="onClick" :class="{ 'brightness-125': isPlaying }">
      {{ text }}
    </Button>
    <audio ref="audioRef" :src="path" :id="id"></audio>
  </div>
</template>