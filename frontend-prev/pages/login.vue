<script setup>
import { ref } from 'vue'
import { useStore } from 'vuex'
import { useRouter } from 'vue-router'

const apiKey = ref('')
const error = ref('')

const store = useStore()
const router = useRouter()

const connect = () => {
    if (apiKey.value) {
        store.dispatch('setApiKey', apiKey.value)
        router.push('/')
    } else {
        error.value = 'API key is required'
    }
}
</script>

<template>
  <div class="login-container">
    <h1>Login</h1>
    <p>Please enter your API key to connect:</p>
    <input v-model="apiKey" type="text" placeholder="Enter API key" />
    <button @click="connect">Connect</button>
    <p v-if="error">{{ error }}</p>
  </div>
</template>