<template>
  <div class="game-instruction">
    <h2>{{ title }}</h2>
    <p>Nombre de joueurs: {{ players }}</p>
    <p>Temps: {{ time }}</p>
    <p>Consigne: {{ instruction }}</p>
    <button @click="$emit('start')">Commencer</button>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'GameInstruction',
  props: {
    title: {
      type: String,
      required: true
    },
    players: {
      type: String,
      required: true
    },
    time: {
      type: String,
      required: true
    },
    instruction: {
      type: String,
      required: true
    }
  }
});
</script>

<style scoped>
.game-instruction {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 20px;
  border-radius: 10px;
  text-align: center;
}
</style>
