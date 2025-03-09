<template>
  <div class="game-container">
    <div ref="gameContainer" class="game-canvas-container"></div>
    
    <!-- UI overlay -->
    <div v-if="gameState !== 'playing'" class="game-overlay">
      <div v-if="gameState === 'menu'" class="menu">
        <h1>COLLECTEUR D'ÉTOILES 3D</h1>
        <button @click="startGame" class="start-btn">DÉMARRER</button>
        <button @click="showHighScores" class="highscores-btn">MEILLEURS SCORES</button>
        <div class="instructions">
          <p>Collectez 20 étoiles pour gagner.</p>
          <p>Évitez les astéroïdes qui vous feront perdre!</p>
          <p><i class="fas fa-mouse-pointer"></i> Cliquez et déplacez votre vaisseau.</p>
        </div>
      </div>
      <div v-if="gameState === 'gameover'" class="game-over">
        <h2>PARTIE TERMINÉE</h2>
        <p>Score final: {{ score }}</p>
        <button @click="restartGame" class="restart-btn">REJOUER</button>
        <button @click="returnToMenu" class="menu-btn">MENU</button>
      </div>
      <div v-if="gameState === 'victory'" class="victory">
        <h2>VICTOIRE!</h2>
        <p>Vous avez collecté toutes les étoiles nécessaires!</p>
        <p>Score final: {{ score }}</p>
        <button @click="restartGame" class="restart-btn">REJOUER</button>
        <button @click="returnToMenu" class="menu-btn">MENU</button>
      </div>
      <div v-if="gameState === 'highscores'" class="highscores">
        <h2>MEILLEURS SCORES</h2>
        <div class="score-list">
          <div v-for="(score, index) in highScores" :key="index" class="score-item">
            {{ index + 1 }}. {{ score }}
          </div>
        </div>
        <button @click="returnToMenu" class="menu-btn">RETOUR</button>
      </div>
    </div>
    
    <!-- HUD pendant le jeu -->
    <div v-if="gameState === 'playing'" class="game-hud">
      <div class="score">Score: {{ score }}</div>
      <div class="progress-container">
        <div class="progress-label">Objectif: {{ score }}/200</div>
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: progressPercentage + '%' }"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from 'vue';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GameEngine } from './GameEngine';
import ScoreManager from '../asteroid-dodge-3d/ScoreManager';

// État du jeu
const gameState = ref('menu'); // menu, playing, gameover, victory, highscores
const score = ref(0);
const gameContainer = ref<HTMLElement | null>(null);
const highScores = ref<number[]>([]);
const scoreManager = new ScoreManager('star-collector-3d-scores');

// Moteur de jeu
let gameEngine: GameEngine | null = null;

// Calcul du pourcentage de progression
const progressPercentage = computed(() => {
  return (score.value / 200) * 100;
});

// Démarrer le jeu
const startGame = () => {
  gameState.value = 'playing';
  score.value = 0;
  
  // Initialiser le moteur de jeu
  if (gameEngine) {
    gameEngine.start();
  }
};

// Afficher les meilleurs scores
const showHighScores = () => {
  highScores.value = scoreManager.getHighScores();
  gameState.value = 'highscores';
};

// Redémarrer le jeu
const restartGame = () => {
  score.value = 0;
  startGame();
};

// Retourner au menu
const returnToMenu = () => {
  gameState.value = 'menu';
  if (gameEngine) {
    gameEngine.reset();
  }
};

// Fin de partie
const endGame = (victory: boolean) => {
  if (gameEngine) {
    gameEngine.stop();
  }
  
  // Enregistrer le score
  scoreManager.addScore(score.value);
  
  // Mettre à jour l'état du jeu
  gameState.value = victory ? 'victory' : 'gameover';
};

// Initialisation
onMounted(() => {
  if (!gameContainer.value) return;
  
  // Charger les meilleurs scores
  highScores.value = scoreManager.getHighScores();
  
  // Créer le moteur de jeu
  gameEngine = new GameEngine(
    gameContainer.value,
    () => score.value,
    (newScore) => score.value = newScore,
    () => endGame(true),
    () => endGame(false)
  );
  
  // Initialiser le moteur de jeu
  gameEngine.initialize();
  
  // Lisez les highscores
  highScores.value = scoreManager.getHighScores();
});

// Nettoyage
onBeforeUnmount(() => {
  if (gameEngine) {
    gameEngine.dispose();
  }
});
</script>

<style scoped>
.game-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background-color: #000;
}

.game-canvas-container {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
}

.game-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background-color: rgba(0, 20, 50, 0.8);
  z-index: 10;
  color: white;
  font-family: 'Orbitron', sans-serif;
}

.menu, .game-over, .victory, .highscores {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 2rem;
  background-color: rgba(0, 10, 30, 0.9);
  border-radius: 1rem;
  border: 2px solid #00d1ff;
  box-shadow: 0 0 20px rgba(0, 209, 255, 0.5);
  max-width: 80%;
  text-align: center;
}

h1, h2 {
  color: #00d1ff;
  text-shadow: 0 0 10px rgba(0, 209, 255, 0.5);
  margin-bottom: 1.5rem;
}

.instructions {
  margin-top: 1.5rem;
  color: #f0f0f0;
}

button {
  font-family: 'Orbitron', sans-serif;
  margin: 0.5rem;
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  color: white;
  background: linear-gradient(45deg, #003a66, #00588f);
  border: 2px solid #00d1ff;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.3s;
}

button:hover {
  background: #00d1ff;
  color: #001428;
  transform: scale(1.05);
}

.score-list {
  width: 100%;
  margin: 1rem 0;
}

.score-item {
  padding: 0.5rem;
  border-bottom: 1px solid rgba(0, 209, 255, 0.3);
}

.game-hud {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  padding: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  pointer-events: none;
  z-index: 5;
  font-family: 'Orbitron', sans-serif;
}

.score {
  background-color: rgba(0, 20, 40, 0.7);
  color: #00d1ff;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  font-size: 1.2rem;
  border: 1px solid #00d1ff;
}

.progress-container {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.progress-label {
  color: white;
  margin-bottom: 0.25rem;
  font-size: 0.9rem;
}

.progress-bar {
  width: 200px;
  height: 15px;
  background-color: rgba(0, 20, 40, 0.7);
  border: 1px solid #00d1ff;
  border-radius: 10px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(to right, #00d1ff, #0077ff);
  width: 0%;
  transition: width 0.3s ease;
}
</style>
