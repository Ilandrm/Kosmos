<template>
  <div v-if="visible" class="instruction-overlay">
    <div class="instruction-panel">
      <h1>{{ title }}</h1>
      
      <div class="game-info">
        <div class="info-item">
          <div class="info-label">Joueurs:</div>
          <div class="info-value">{{ players }}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Durée:</div>
          <div class="info-value">{{ time }}</div>
        </div>
      </div>
      
      <div class="instruction-text">
        {{ instruction }}
      </div>
      
      <button @click="startGame" class="start-button">Commencer</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits } from 'vue'

const props = defineProps({
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
  },
  visible: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['start'])

function startGame() {
  emit('start')
}
</script>

<style scoped>
.instruction-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.instruction-panel {
  background-color: rgba(0, 10, 50, 0.9);
  border-radius: 15px;
  padding: 2rem;
  max-width: 500px;
  width: 90%;
  box-shadow: 0 0 30px rgba(61, 154, 255, 0.5);
  text-align: center;
  animation: fadeIn 0.5s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-20px); }
  to { opacity: 1; transform: translateY(0); }
}

h1 {
  color: #8af7ff;
  font-size: 2rem;
  margin-bottom: 1.5rem;
  text-shadow: 0 0 10px rgba(0, 255, 255, 0.6);
}

.game-info {
  display: flex;
  justify-content: space-around;
  margin-bottom: 2rem;
  flex-wrap: wrap;
}

.info-item {
  padding: 0.75rem;
  margin: 0.5rem;
  background-color: rgba(0, 20, 80, 0.5);
  border-radius: 8px;
  min-width: 120px;
}

.info-label {
  font-size: 0.85rem;
  color: #aaa;
  margin-bottom: 0.3rem;
}

.info-value {
  font-size: 1.1rem;
  color: #fff;
  font-weight: bold;
}

.instruction-text {
  font-size: 1.2rem;
  line-height: 1.6;
  margin-bottom: 2rem;
  padding: 1rem;
  background-color: rgba(0, 0, 30, 0.5);
  border-radius: 8px;
  color: #fff;
}

.start-button {
  background-color: #3d9aff;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 1rem 2rem;
  font-size: 1.2rem;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-top: 1rem;
}

.start-button:hover {
  background-color: #5ab0ff;
  transform: scale(1.05);
  box-shadow: 0 0 15px rgba(61, 154, 255, 0.7);
}
</style>