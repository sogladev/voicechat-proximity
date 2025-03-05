<template>
    <div>
    <!-- Button to request microphone permission -->
    <Button v-if="!hasPermission" @click="handleRequestPermission" variant="default">
      Allow Microphone
    </Button>

    </div>
</template>

<script setup lang="ts">

</script>

<style scoped>

</style>