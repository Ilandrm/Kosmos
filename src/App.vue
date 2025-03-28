<template>
  <main class="kosmos-app">
    <RouterView />
  </main>
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router'

</script>

<style scoped>
.kosmos-app {
  width: 100%;
  height: 100vh;
  overflow: hidden;
  background-color: #070b14;
  color: #e1e6f0;
  font-family: 'Roboto', sans-serif;
}
</style>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  background-color: #070b14;
  color: #e1e6f0;
  font-family: 'Arial', sans-serif;
}

:root {
  --primary-color: #3d9aff;
  --secondary-color: #ff3d7a;
  --accent-color: #7a3dff;
  --background-dark: #070b14;
  --background-mid: #111827;
  --text-light: #e1e6f0;
  --text-dim: #9ca3af;
}
</style>
