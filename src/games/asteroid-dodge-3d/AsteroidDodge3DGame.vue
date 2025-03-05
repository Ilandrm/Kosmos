<template>
  <div class="game-container">
    <div ref="gameContainer" class="game-canvas-container"></div>
    
    <!-- UI overlay -->
    <div v-if="gameState !== 'playing'" class="game-overlay">
      <div v-if="gameState === 'menu'" class="menu">
        <h1>ASTEROID DODGE 3D</h1>
        <button @click="startGame" class="start-btn">START GAME</button>
        <button @click="showHighScores" class="highscores-btn">HIGH SCORES</button>
        <div class="instructions">
          <h2>Instructions</h2>
          <p>Cliquez et glissez pour déplacer votre vaisseau.</p>
          <p>Évitez les collisions avec les astéroïdes pour survivre!</p>
          <p>Collectez les bonus pour des points supplémentaires.</p>
        </div>
      </div>
      
      <div v-if="gameState === 'game-over'" class="game-over">
        <h1>GAME OVER</h1>
        <h2>Score: {{ finalScore }}</h2>
        
        <div v-if="isHighScore" class="new-highscore">
          <h3>NEW HIGH SCORE!</h3>
          <input 
            v-model="playerName" 
            placeholder="Enter your name" 
            maxlength="10"
            ref="nameInput"
          />
          <button @click="saveHighScore" :disabled="!playerName.trim()">
            SAVE
          </button>
        </div>
        
        <button @click="restartGame" class="restart-btn">PLAY AGAIN</button>
        <button @click="returnToMenu" class="menu-btn">MAIN MENU</button>
      </div>
      
      <div v-if="gameState === 'high-scores'" class="high-scores">
        <h1>HIGH SCORES</h1>
        <div class="scores-list">
          <div v-for="(score, index) in highScores" :key="index" class="score-entry">
            <span class="rank">{{ index + 1 }}</span>
            <span class="name">{{ score.name }}</span>
            <span class="score">{{ score.score }}</span>
            <span class="date">{{ score.date }}</span>
          </div>
        </div>
        <button @click="returnToMenu" class="back-btn">BACK</button>
      </div>
      
      <div v-if="gameState === 'paused'" class="paused">
        <h1>PAUSED</h1>
        <button @click="resumeGame" class="resume-btn">RESUME</button>
        <button @click="returnToMenu" class="menu-btn">MAIN MENU</button>
      </div>
    </div>
    
    <!-- HUD overlay for displaying score and lives during gameplay -->
    <div v-if="gameState === 'playing'" class="game-hud">
      <div class="score">SCORE: {{ currentScore }}</div>
      <div class="time">TIME: {{ Math.ceil(timeRemaining) }}s</div>
      <div class="lives">
        LIVES: 
        <span v-for="n in lives" :key="n" class="life-icon">▲</span>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onUnmounted, watch } from 'vue';
import GameEngine3D from './GameEngine3D';
import ScoreManager from './ScoreManager'; // Utiliser le nouveau ScoreManager

export default defineComponent({
  name: 'AsteroidDodge3DGame',
  
  setup() {
    const gameContainer = ref<HTMLElement | null>(null);
    const gameState = ref<'menu' | 'playing' | 'paused' | 'game-over' | 'high-scores'>('menu');
    const currentScore = ref<number>(0);
    const finalScore = ref<number>(0);
    const timeRemaining = ref<number>(60);
    const lives = ref<number>(3);
    const isHighScore = ref<boolean>(false);
    const playerName = ref<string>('');
    const nameInput = ref<HTMLInputElement | null>(null);
    const highScores = ref<any[]>([]);
    
    let gameEngine: GameEngine3D | null = null;
    const scoreManager = new ScoreManager();
    
    // Callbacks du moteur de jeu
    const scoreUpdated = (score: number) => {
      currentScore.value = score;
    };
    
    const timeUpdated = (time: number) => {
      timeRemaining.value = time;
    };
    
    const livesUpdated = (remainingLives: number) => {
      lives.value = remainingLives;
    };
    
    const gameOver = (score: number) => {
      finalScore.value = score;
      gameState.value = 'game-over';
      
      // Vérifier si c'est un meilleur score
      isHighScore.value = scoreManager.isHighScore(score);
      
      // Gérer l'affichage du formulaire de high score
      handleHighScore();
    };
    
    // Fonction pour initialiser le moteur de jeu
    const initGame = () => {
      if (gameContainer.value) {
        gameEngine = new GameEngine3D(
          gameContainer.value,
          scoreUpdated,
          timeUpdated,
          livesUpdated,
          gameOver
        );
      }
    };
    
    // Gérer les meilleurs scores
    const handleHighScore = () => {
      if (isHighScore.value) {
        setTimeout(() => {
          if (nameInput.value) {
            nameInput.value.focus();
          }
        }, 100);
      }
    };
    
    // Actions du joueur
    const startGame = () => {
      gameState.value = 'playing';
      scoreManager.resetCurrentScore();
      
      if (!gameEngine && gameContainer.value) {
        initGame();
      }
      
      if (gameEngine) {
        gameEngine.start();
      }
    };
    
    const pauseGame = () => {
      if (gameState.value === 'playing' && gameEngine) {
        gameEngine.pause();
        gameState.value = 'paused';
      }
    };
    
    const resumeGame = () => {
      if (gameState.value === 'paused' && gameEngine) {
        gameEngine.resume();
        gameState.value = 'playing';
      }
    };
    
    const restartGame = () => {
      if (gameEngine) {
        gameEngine.reset();
        startGame();
      }
    };
    
    const returnToMenu = () => {
      if (gameEngine) {
        gameEngine.stop();
      }
      gameState.value = 'menu';
    };
    
    const showHighScores = () => {
      highScores.value = scoreManager.getHighScores();
      gameState.value = 'high-scores';
    };
    
    const saveHighScore = () => {
      if (playerName.value.trim()) {
        scoreManager.addHighScore(playerName.value.trim());
        showHighScores();
      }
    };
    
    // Gestion des touches du clavier (uniquement pour Escape/Pause)
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && gameState.value === 'playing') {
        pauseGame();
      } else if (event.key === 'Escape' && gameState.value === 'paused') {
        resumeGame();
      }
    };
    
    // Variables pour le drag & drop
    let isDragging = false;
    
    // Gestion du début du glisser-déposer
    const handleMouseDown = (event: MouseEvent) => {
      if (gameEngine && gameState.value === 'playing') {
        isDragging = true;
        updateShipPosition(event);
      }
    };
    
    // Gestion du déplacement pendant le glisser-déposer
    const handleMouseMove = (event: MouseEvent) => {
      if (isDragging && gameEngine && gameState.value === 'playing') {
        updateShipPosition(event);
      }
    };
    
    // Gestion de la fin du glisser-déposer
    const handleMouseUp = () => {
      isDragging = false;
    };
    
    // Mise à jour de la position du vaisseau
    const updateShipPosition = (event: MouseEvent) => {
      if (gameContainer.value) {
        const rect = gameContainer.value.getBoundingClientRect();
        
        // Calculer la position X relative au conteneur de jeu
        const mouseX = event.clientX - rect.left;
        
        // Convertir en coordonnées monde (-20 à 20)
        const normalizedX = mouseX / rect.width; // 0 à 1
        const worldX = -20 + (normalizedX * 40); // -20 à 20
        
        // Envoyer la position au moteur de jeu
        gameEngine.setMousePosition(worldX);
      }
    };
    
    // Gestion de la visibilité de la page (mettre en pause si l'onglet est inactif)
    const handleVisibilityChange = () => {
      if (document.hidden && gameState.value === 'playing') {
        pauseGame();
      }
    };
    
    // Cycle de vie du composant
    onMounted(() => {
      // Initialiser le jeu
      initGame();
      
      // Ajouter les écouteurs d'événements
      window.addEventListener('keydown', handleKeyDown);
      if (gameContainer.value) {
        gameContainer.value.addEventListener('mousedown', handleMouseDown);
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
      }
      document.addEventListener('visibilitychange', handleVisibilityChange);
    });
    
    onUnmounted(() => {
      // Retirer les écouteurs d'événements
      window.removeEventListener('keydown', handleKeyDown);
      if (gameContainer.value) {
        gameContainer.value.removeEventListener('mousedown', handleMouseDown);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      if (gameEngine) {
        gameEngine.dispose();
      }
    });
    
    // Surveiller les changements d'état pour effectuer des actions supplémentaires
    watch(gameState, (newState) => {
      if (newState === 'game-over') {
        // Animations ou sons pour la fin de jeu pourraient être ajoutés ici
      }
    });
    
    return {
      gameContainer,
      gameState,
      currentScore,
      finalScore,
      timeRemaining,
      lives,
      isHighScore,
      playerName,
      nameInput,
      highScores,
      startGame,
      pauseGame,
      resumeGame,
      restartGame,
      returnToMenu,
      showHighScores,
      saveHighScore
    };
  }
});
</script>

<style scoped>
.game-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background-color: #000;
  color: #fff;
  font-family: 'Arial', sans-serif;
}

.game-canvas-container {
  width: 100%;
  height: 100%;
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
  background-color: rgba(0, 0, 0, 0.8);
  z-index: 10;
}

.game-hud {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  padding: 20px;
  box-sizing: border-box;
  z-index: 5;
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  background-color: rgba(0, 0, 0, 0.5);
}

.score, .time, .lives {
  font-size: 1.5rem;
  font-weight: bold;
  color: #fff;
  text-shadow: 0 0 5px rgba(0, 0, 255, 0.8);
}

.life-icon {
  color: #ff3d7a;
  margin-right: 8px;
}

h1 {
  font-size: 3rem;
  color: #ff3d7a;
  text-shadow: 0 0 10px rgba(255, 61, 122, 0.8);
  margin-bottom: 30px;
}

h2 {
  font-size: 2rem;
  margin-bottom: 20px;
}

.menu, .game-over, .paused, .high-scores {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 80%;
  max-width: 600px;
}

.instructions {
  margin-top: 30px;
  text-align: center;
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  background-color: rgba(0, 0, 50, 0.3);
}

button {
  background-color: #ff3d7a;
  color: white;
  border: none;
  border-radius: 5px;
  padding: 12px 30px;
  margin: 10px 0;
  font-size: 1.2rem;
  cursor: pointer;
  transition: all 0.2s;
  width: 200px;
  text-transform: uppercase;
  font-weight: bold;
}

button:hover {
  background-color: #ff5e8f;
  transform: scale(1.05);
}

button:disabled {
  background-color: #999;
  cursor: not-allowed;
  transform: none;
}

.new-highscore {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 20px 0;
  padding: 20px;
  background-color: rgba(255, 215, 0, 0.2);
  border-radius: 10px;
  border: 1px solid rgba(255, 215, 0, 0.5);
}

.new-highscore h3 {
  color: gold;
  margin-bottom: 10px;
}

input {
  width: 100%;
  max-width: 300px;
  padding: 12px;
  margin: 10px 0;
  border: 2px solid #ff3d7a;
  border-radius: 5px;
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  font-size: 1.2rem;
  text-align: center;
}

.scores-list {
  width: 100%;
  max-height: 300px;
  overflow-y: auto;
  margin: 20px 0;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  background-color: rgba(0, 0, 50, 0.3);
  padding: 10px;
}

.score-entry {
  display: flex;
  justify-content: space-between;
  padding: 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.score-entry:last-child {
  border-bottom: none;
}

.rank {
  width: 30px;
  text-align: center;
  font-weight: bold;
}

.name {
  flex: 1;
  margin: 0 10px;
}

.score {
  min-width: 80px;
  text-align: right;
  font-weight: bold;
  color: #ff3d7a;
}

.date {
  min-width: 100px;
  text-align: right;
  color: rgba(255, 255, 255, 0.7);
}
</style>
