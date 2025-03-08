<script setup lang="ts">
import { useSocketStore } from '../stores/useSocketStore';
import { storeToRefs } from 'pinia';

const socketStore = useSocketStore();
const { status } = storeToRefs(socketStore);

const connectAsAlice = () => {
    if (status.value !== 'OPEN') {
        socketStore.connectAs(8, 'super-secret-key');
    }
};

const connectAsBob = () => {
    if (status.value !== 'OPEN') {
        socketStore.connectAs(9, 'super-secret-key');
    }
};
</script>

<template>
    <div class="flex gap-4 justify-center border-2 p-2">
        <Button variant="outline" @click="connectAsAlice" :disabled="status === 'OPEN'">
            Connect as Alice (guid: 8)
        </Button>
        <Button variant="outline" @click="connectAsBob" :disabled="status === 'OPEN'">
            Connect as Bob (guid: 9)
        </Button>
    </div>
</template>


<style scoped></style>