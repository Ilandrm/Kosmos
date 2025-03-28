<template>
  <div class="game-container">
    <div ref="gameContainer" class="game-canvas-container"></div>
    <!-- Game Instructions Overlay -->
    <GameInstruction
      v-if="showInstructions"
      :title="gameInstructions.title"
      :players="gameInstructions.players"
      :time="gameInstructions.time"
      :instruction="gameInstructions.instruction"
      @start="onInstructionComplete"
    />

    <!-- UI overlay - This must show when game is over -->
    <div v-if="(gameState !== 'playing' && !showInstructions) || gameState === 'game-over'" class="game-overlay">
      <!-- Debug information -->
      <div class="debug-info" style="position: absolute; top: 5px; left: 5px; font-size: 12px; color: white; z-index: 100;">
        Game State: {{ gameState }} | Time: {{ timeRemaining }}
      </div>
      <!-- Show game-over UI when state is game-over -->
      <div v-if="gameState === 'game-over'" class="game-over">
        <h1>{{gameCount > 1 ? "MISSION TERMINÉE" :"SECOND JOUEUR"}}</h1>
        
        <button @click="continueToNextGame" class="continue-btn">{{gameCount > 1 ? "Continuer la mission" :"Commencer"}} </button>
      </div>
      
      <div v-if="gameState === 'paused'" class="paused">
        <h1>PAUSED</h1>
        <button @click="resumeGame" class="resume-btn">RESUME</button>
      </div>
    </div>
    
    <!-- HUD overlay for displaying score and lives during gameplay -->
    <div v-if="gameState === 'playing'" class="game-hud">
      <div class="time">TEMPS: {{ timeRemaining }}s</div>
      <div class="lives">
        VIES: 
        <span v-for="n in lives" :key="n" class="life-icon">▲</span>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onUnmounted, watch } from 'vue';
import GameEngine3D from './GameEngine3D';
import ScoreManager from './ScoreManager'; // Utiliser le nouveau ScoreManager
import { useRouter } from 'vue-router';
import { getNextGame, isLastGame, getGameInstructions, handleHighScore } from '@/services/GameFlowService';
import GameInstruction from '../../components/GameInstruction.vue'; // Importing GameInstruction component
import TurnPopup from '@/components/TurnPopup.vue';

export default defineComponent({
  name: 'AsteroidDodge3DGame',
  components: { GameInstruction, TurnPopup }, // Registering GameInstruction and TurnPopup components
  
  setup() {
    const showTurnPopup = ref(false); // Track visibility of the turn popup
    const turnMessage = ref(''); // Message to display in the turn popup
    const totalRounds = 2; // Total rounds to play
    let currentRound = ref(0); // Track the current round
    let isPlayerTurn = ref(true); // Track whose turn it is
    const gameContainer = ref<HTMLElement | null>(null);
      const currentScore = ref<number>(0);
    let finalScore = ref<number>(0);
    let timeRemaining = ref<number>(30); // Set to 30 seconds for the game duration
    const lives = ref<number>(3);
    const isHighScore = ref<boolean>(false);
    let playerName = ref<string>('');
    const nameInput = ref<HTMLInputElement | null>(null);
    let highScores = ref<any[]>([]);
    const showInstructions = ref<boolean>(true); // Defining showInstructions property
    const gameInstructions = ref(getGameInstructions('asteroid-dodge-3d') || {
      title: 'Évitement d\'Astéroïdes',
      players: '2 joueurs',
      time: '30 secondes',
      instruction: 'Les joueurs jouent à tour de rôle pour éviter les astéroïdes.'
    });
    let gameCount = ref(0); // Track the number of games played
    
    // Désactiver les logs de débogage pour de meilleures performances
    const DEBUG_MODE = false;
    
    let gameEngine: GameEngine3D | null = null;
    const scoreManager = new ScoreManager();
    const router = useRouter();
  
    // Callbacks du moteur de jeu
    const scoreUpdated = (score: number) => {
      currentScore.value = score;
      // Mettre à jour le ScoreManager directement pour plus de fiabilité
      scoreManager.updateCurrentScore(score);
    };
    
    const timeUpdated = (time: number) => {
      // Ensure proper type and value checking
      if (typeof time === 'number' && !isNaN(time)) {
        // Directly assign the time to the reactive variable
        timeRemaining.value = time;
      } else {
        // Keep current value if new value is invalid
      }
    };

    const livesUpdated = (remainingLives: number) => {
      lives.value = remainingLives;
    };
    
    const gameOver = async (score: number) => {
  console.log('📢 GAME OVER DÉCLENCHÉ');
  
  // S'assurer que cette fonction n'est pas appelée plusieurs fois
  if (gameState.value === 'game-over') {
    console.log('⚠️ Jeu déjà terminé, appel ignoré');
    return;
  }
  
  

  console.log('📱 Mise à jour de l\'interface utilisateur');
  gameState.value = 'game-over';
  finalScore.value = score;
  timeRemaining.value = 0;
  gameCount.value++;
}

    // Function to initialize the game engine
    const initGame = () => {
      if (gameContainer.value) {
        gameEngine = new GameEngine3D(
          gameContainer.value,
          scoreUpdated,
          timeUpdated,
          livesUpdated,
          gameOver,
          scoreManager // Passage du ScoreManager au moteur de jeu
        );
      }
    };
    
    const screenToWorld = (x: number, y: number, rect: DOMRect) => {
      const worldX = (x / rect.width) * 40 - 20; // Assuming the world width is 40
      const worldY = -(y / rect.height) * 30; // Assuming the world height is 30
      return { x: worldX, y: worldY };
    };

    const isTouchOnShip = (touchX: number, touchY: number, rect: DOMRect): boolean => {
      const ship = gameEngine.getShip(); // Use the public method to access the ship
      if (!gameEngine || !ship) return false;
      
      // Coordonnées du vaisseau dans le monde 3D
      const shipInstance = gameEngine.getShip(); // Use the public method to access the ship
      if (!gameEngine || !shipInstance) return false;
      const shipX = shipInstance.position.x;
      const shipY = shipInstance.position.y;
      
      // Convertir les coordonnées d'écran en coordonnées de monde
      const worldCoords = screenToWorld(touchX, touchY, rect);
      
      // Calcul de la distance entre le point touché et le vaisseau
      const distanceX = Math.abs(worldCoords.x - shipX);
      const distanceY = Math.abs(worldCoords.y - shipY);
      
      // Taille approximative du vaisseau dans l'espace de jeu
      const shipSizeX = 3;
      const shipSizeY = 2;
      
      // Vérifier si le point est sur le vaisseau (avec une marge de tolérance pour faciliter le toucher)
      return distanceX < shipSizeX && distanceY < shipSizeY;
    };

    const handleHighScore = () => {
      if (isHighScore.value) {
        setTimeout(() => {
          if (nameInput.value) {
            nameInput.value.focus();
          }
        }, 100);
      }
    };

    const onInstructionComplete = () => {
      showInstructions.value = false;
      startGame();
    };

    // Player actions
    const startGame = () => {
      gameState.value = 'playing';
      scoreManager.resetCurrentScore();
      timeRemaining.value = 30; // Set timer to 30 seconds at game start

      if (!gameEngine && gameContainer.value) {
        initGame();
      }

      if (gameEngine) {
        gameEngine.start();
      } else {
        // Game engine is not initialized.
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
    
    const continueToNextGame = () => {
      const nextGame = getNextGame('asteroid-dodge-3d');
      if(gameCount.value > 1 ){
      router.push({ name: nextGame });
      }else{
        startGame();
      }
    };
    
    // Keyboard event handling (only for Escape/Pause)
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && gameState.value === 'playing') {
        pauseGame();
      } else if (event.key === 'Escape' && gameState.value === 'paused') {
        resumeGame();
      }
    };
    
    // Drag & drop system ONLY with the ship
    let isDragging = false;
    let dragStartX = 0; // Ship's X position at the start of drag
    let dragStartY = 0; // Ship's Y position at the start of drag
    let mouseStartX = 0; // Mouse's X position at the start of drag
    let mouseStartY = 0; // Mouse's Y position at the start of drag
    
    // Handle the start of drag-and-drop
    const handleMouseDown = (event: MouseEvent) => {
      if (gameEngine && gameState.value === 'playing') {
        isDragging = false;
        event.preventDefault();
        
        if (isClickOnShip(event)) {
          const shipPos = gameEngine.getShipWorldPosition();
          if (!shipPos) return;
          
          dragStartX = shipPos.x;
          dragStartY = shipPos.y;
          mouseStartX = event.clientX;
          mouseStartY = event.clientY;
          
          isDragging = true;
        }
      }
    };
    
    const isClickOnShip = (event: MouseEvent): boolean => {
      if (!gameEngine) return false;
      
      const shipPosition = gameEngine.getShipScreenPosition();
      if (!shipPosition) return false;
      
      const clickRadius = 60; // Wider click area for easier selection
      
      const dx = event.clientX - shipPosition.x;
      const dy = event.clientY - shipPosition.y;
      const distance = Math.sqrt(dx*dx + dy*dy);
      
      return distance <= clickRadius;
    };
    
    let lastMoveTimestamp = 0;
    const updateInterval = 8; // ~120 FPS

    const handleMouseMove = (event: MouseEvent) => {
      if (isDragging && gameEngine && gameState.value === 'playing') {
        const now = performance.now();
        if (now - lastMoveTimestamp < updateInterval) {
          return; // Ignore too frequent movements
        }
        lastMoveTimestamp = now;
        
        const mouseDeltaX = event.clientX - mouseStartX;
        const mouseDeltaY = mouseStartY - event.clientY; // Inverted because Y goes top to bottom in the DOM
        
        const rect = gameContainer.value?.getBoundingClientRect();
        if (!rect) return;
        
        const scaleFactorX = 50 / rect.width;
        const scaleFactorY = 50 / rect.height;
        
        const newShipX = dragStartX + (mouseDeltaX * scaleFactorX);
        const newShipY = dragStartY + (mouseDeltaY * scaleFactorY);
        
        const clampedX = Math.max(-20, Math.min(20, newShipX));
        const clampedY = Math.max(-15, Math.min(15, newShipY)); // Vertical limits
        
        gameEngine.setMousePosition(clampedX, clampedY, true);
      }
    };
    
    const handleMouseUp = () => {
      isDragging = false;
    };
    
    const handleTouchStart = (event: TouchEvent) => {
      event.preventDefault();
      const touch = event.touches[0];
      
      if (gameEngine && gameState.value === 'playing') {
        isDragging = true;
        
        const rect = gameContainer.value.getBoundingClientRect();
        mouseStartX = touch.clientX;
        mouseStartY = touch.clientY;
        
        // Obtenir la position actuelle du vaisseau
        const shipPos = gameEngine.getShipWorldPosition();
        if (shipPos) {
          dragStartX = shipPos.x;
          dragStartY = shipPos.y;
        }
      }
    };

    const handleTouchMove = (event: TouchEvent) => {
      event.preventDefault();
      
      if (isDragging && gameEngine && gameState.value === 'playing') {
        const touch = event.touches[0];
        const now = performance.now();
        
        if (now - lastMoveTimestamp < updateInterval) {
          return; // Ignore les mouvements trop fréquents
        }
        lastMoveTimestamp = now;
        
        const rect = gameContainer.value?.getBoundingClientRect();
        if (!rect) return;
        
        const touchDeltaX = touch.clientX - mouseStartX;
        const touchDeltaY = mouseStartY - touch.clientY;
        
        const scaleFactorX = 50 / rect.width;
        const scaleFactorY = 50 / rect.height;
        
        const newShipX = dragStartX + (touchDeltaX * scaleFactorX);
        const newShipY = dragStartY + (touchDeltaY * scaleFactorY);
        
        const clampedX = Math.max(-20, Math.min(20, newShipX));
        const clampedY = Math.max(-15, Math.min(15, newShipY));
        
        gameEngine.setMousePosition(clampedX, clampedY, true);
      }
    };

    const handleTouchEnd = () => {
      // Logique pour quand le toucher se termine
      isDragging = false;
    };

    const preventDefaultTouchMove = (event: TouchEvent) => {
      if (gameState.value === 'playing') {
        event.preventDefault();
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden && gameState.value === 'playing') {
        pauseGame();
      }
    };

    const gameState = ref('menu'); // Valeurs possibles: 'menu', 'playing', 'paused', 'game-over', 'high-scores'

    // Ajoutez les écouteurs d'événements
    onMounted(() => {
      initGame();
      
      document.addEventListener('touchmove', preventDefaultTouchMove, { passive: false });
      
      window.addEventListener('keydown', handleKeyDown);
      if (gameContainer.value) {
        gameContainer.value.addEventListener('mousedown', handleMouseDown);
        gameContainer.value.addEventListener('mousemove', handleMouseMove);
        gameContainer.value.addEventListener('mouseup', handleMouseUp);
        gameContainer.value.addEventListener('mouseleave', handleMouseUp);
        
        gameContainer.value.addEventListener('touchstart', handleTouchStart);
        gameContainer.value.addEventListener('touchmove', handleTouchMove);
        gameContainer.value.addEventListener('touchend', handleTouchEnd);
        gameContainer.value.addEventListener('touchcancel', handleTouchEnd);
      }
      document.addEventListener('visibilitychange', handleVisibilityChange);
    });

    onUnmounted(() => {
      document.removeEventListener('touchmove', preventDefaultTouchMove);
      window.removeEventListener('keydown', handleKeyDown);
      if (gameContainer.value) {
        gameContainer.value.removeEventListener('mousedown', handleMouseDown);
        gameContainer.value.removeEventListener('mousemove', handleMouseMove);
        gameContainer.value.removeEventListener('mouseup', handleMouseUp);
        gameContainer.value.removeEventListener('mouseleave', handleMouseUp);
        
        gameContainer.value.removeEventListener('touchstart', handleTouchStart);
        gameContainer.value.removeEventListener('touchmove', handleTouchMove);
        gameContainer.value.removeEventListener('touchend', handleTouchEnd);
        gameContainer.value.removeEventListener('touchcancel', handleTouchEnd);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      if (gameEngine) {
        gameEngine.dispose();
      }
    });
    
    watch(gameState, (newState) => {
      if (newState === 'game-over') {
        // Animations ou sons pour la fin de jeu pourraient être ajoutés ici
      }
    });
    
    // Optimize the rendering loop to reduce lag
    function render() {
      if (!isRunning) return;

      // Update game objects
      updateGameObjects();

      // Clear the canvas
      renderer.clear();

      // Render the scene
      renderer.render(scene, camera);

      // Request the next frame
      requestAnimationFrame(render);
    }

    // Use a more efficient method to check for collisions
    function checkCollisions() {
      const shipBox = this.ship.getBoundingBox();
      for (let i = 0; i < this.asteroids.length; i++) {
        const asteroidBox = this.asteroids[i].getBoundingBox();
        if (shipBox.intersectsBox(asteroidBox)) {
          this.handleCollision(this.asteroids[i]);
          this.asteroids.splice(i, 1); // Remove asteroid after collision
          i--; // Adjust index after removal
        }
      }
    }

    // Limit the number of asteroids rendered based on the game state
    function updateGameObjects() {
      if (asteroids.length > MAX_ASTEROIDS) {
        asteroids = asteroids.slice(0, MAX_ASTEROIDS);
      }
      for (const asteroid of asteroids) {
        asteroid.update();
      }
    }
    
    return {
      gameCount,
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
      saveHighScore,
      continueToNextGame,
      showInstructions,
      gameInstructions,
      onInstructionComplete,
      handleHighScore // Added to return statement
    };
  }
});
</script>

<style scoped>
.game-container {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  width: 100%;
  height: 100vh;
  background-color: #000;
}

@media (max-width: 768px) {
  .game-container {
    padding: 10px;
  }
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
  color: white;
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
