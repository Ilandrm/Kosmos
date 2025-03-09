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
        <button @click="continueToNextGame" class="continue-btn">Continuer</button>
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
import { useRouter } from 'vue-router';
import { getNextGame, isLastGame } from '../../services/GameFlowService';

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
      timeRemaining.value = time;
    };
    
    const livesUpdated = (remainingLives: number) => {
      lives.value = remainingLives;
    };
    
    const gameOver = (score: number) => {
      finalScore.value = score;
      gameState.value = 'game-over';
      
      // S'assurer que le score final est correctement enregistré dans le ScoreManager
      scoreManager.updateCurrentScore(score);
      
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
          gameOver,
          scoreManager // Passage du ScoreManager au moteur de jeu
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
        // Sécurité supplémentaire: réinitialiser l'entrée utilisateur
        if (nameInput.value) {
          nameInput.value.blur();
        }
        
        // Délai plus long avant de démarrer le jeu pour s'assurer que tout est prêt
        // et éviter le plantage à 1 seconde
        setTimeout(() => {
          try {
            console.log('Démarrage du jeu...');
            gameEngine.start();
          } catch (error) {
            console.error('Erreur au démarrage du jeu:', error);
            // Tenter de réinitialiser en cas d'erreur
            setTimeout(() => {
              initGame();
              // Réessayer avec un délai plus long
              setTimeout(() => {
                try {
                  console.log('Seconde tentative de démarrage...');
                  gameEngine?.start();
                } catch (e) {
                  console.error('Erreur critique, impossible de démarrer le jeu:', e);
                  alert('Erreur au chargement du jeu. Veuillez rafraîchir la page.');
                }
              }, 500);
            }, 500);
          }
        }, 800); // Délai plus long pour s'assurer que tout est bien initialisé
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
      const nextGame = getNextGame('asteroid-dodge');
      router.push({ name: nextGame });
    };
    
    // Gestion des touches du clavier (uniquement pour Escape/Pause)
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && gameState.value === 'playing') {
        pauseGame();
      } else if (event.key === 'Escape' && gameState.value === 'paused') {
        resumeGame();
      }
    };
    
    // SYSTÈME DE CONTRÔLE: Glisser-déposer UNIQUEMENT avec le vaisseau
    // Variables pour le drag & drop
    let isDragging = false;
    let dragStartX = 0; // Position X du vaisseau au début du drag
    let dragStartY = 0; // Position Y du vaisseau au début du drag
    let mouseStartX = 0; // Position X de la souris au début du drag
    let mouseStartY = 0; // Position Y de la souris au début du drag
    
    // Gestion du début du glisser-déposer
    const handleMouseDown = (event: MouseEvent) => {
      if (gameEngine && gameState.value === 'playing') {
        // Réinitialiser l'état du drag
        isDragging = false;
        
        // Empêcher le comportement par défaut
        event.preventDefault();
        
        // Vérifier si le clic est sur le vaisseau
        if (isClickOnShip(event)) {
          const shipPos = gameEngine.getShipWorldPosition();
          if (!shipPos) return;
          
          // Enregistrer les positions initiales
          dragStartX = shipPos.x;
          dragStartY = shipPos.y;
          mouseStartX = event.clientX;
          mouseStartY = event.clientY;
          
          // Activer le mode glisser-déposer
          isDragging = true;
          
          if (DEBUG_MODE) {
            console.log('Début du glisser-déposer');
            console.log(`Position initiale du vaisseau: ${dragStartX}`);
            console.log(`Position initiale de la souris: ${mouseStartX}`);
          }
        } else if (DEBUG_MODE) {
          console.log('Clic en dehors du vaisseau - ignoré');
        }
      }
    };
    
    // Vérification si le clic est sur le vaisseau
    const isClickOnShip = (event: MouseEvent): boolean => {
      if (!gameEngine) return false;
      
      const shipPosition = gameEngine.getShipScreenPosition();
      if (!shipPosition) return false;
      
      // Zone de clic élargie pour faciliter la sélection du vaisseau
      const clickRadius = 60; // Rayon plus large pour une meilleure détection
      
      const dx = event.clientX - shipPosition.x;
      const dy = event.clientY - shipPosition.y;
      const distance = Math.sqrt(dx*dx + dy*dy);
      
      if (DEBUG_MODE) {
        console.log(`Click at (${event.clientX}, ${event.clientY})`);
        console.log(`Ship at (${shipPosition.x}, ${shipPosition.y})`);
        console.log(`Distance: ${distance}, Threshold: ${clickRadius}`);
      }
      
      return distance <= clickRadius;
    };
    
    // Variable pour stocker le dernier timestamp de mise à jour
    let lastMoveTimestamp = 0;
    // Intervalle minimum entre les mises à jour (en ms) pour éviter le lag
    const updateInterval = 8; // ~120 FPS

    // Gestion du mouvement de la souris avec optimisation pour réduire le lag
    const handleMouseMove = (event: MouseEvent) => {
      if (isDragging && gameEngine && gameState.value === 'playing') {
        // Limiter la fréquence des mises à jour pour éviter le lag
        const now = performance.now();
        if (now - lastMoveTimestamp < updateInterval) {
          return; // Ignorer les mouvements trop fréquents
        }
        lastMoveTimestamp = now;
        
        // Calculer le déplacement de la souris par rapport à sa position initiale
        const mouseDeltaX = event.clientX - mouseStartX;
        const mouseDeltaY = mouseStartY - event.clientY; // Inversion car Y va de haut en bas dans le DOM
        
        // Calculer le facteur d'échelle pour convertir les pixels en unités du monde
        const rect = gameContainer.value?.getBoundingClientRect();
        if (!rect) return;
        
        // Augmenter légèrement la sensibilité pour un déplacement plus rapide
        const scaleFactorX = 50 / rect.width;
        const scaleFactorY = 50 / rect.height;
        
        // Calculer la nouvelle position du vaisseau
        const newShipX = dragStartX + (mouseDeltaX * scaleFactorX);
        const newShipY = dragStartY + (mouseDeltaY * scaleFactorY);
        
        // Limiter la position aux bornes du jeu
        const clampedX = Math.max(-20, Math.min(20, newShipX));
        const clampedY = Math.max(-15, Math.min(0, newShipY)); // Limites verticales
        
        // Appliquer la position au vaisseau avec les deux coordonnées
        gameEngine.setMousePosition(clampedX, clampedY, true);
        
        if (DEBUG_MODE && mouseDeltaX % 40 === 0) { // Limiter les logs pour éviter le spam
          console.log(`Mouse delta: ${mouseDeltaX}px, New ship position: ${clampedX}`);
        }
      }
    };
    
    // Gestion de la fin du glisser-déposer
    const handleMouseUp = () => {
      if (isDragging && DEBUG_MODE) {
        console.log('Fin du glisser-déposer');
      }
      isDragging = false;
    };
    
    // Détection de l'appareil mobile pour optimiser les contrôles
    const isMobileDevice = (): boolean => {
      return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    };
    
    // Convertit les coordonnées d'écran en coordonnées de monde 3D
    const screenToWorld = (screenX: number, screenY: number, rect: DOMRect): {x: number, y: number} => {
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      const offsetX = screenX - centerX;
      const offsetY = centerY - screenY; // Inversé car Y va de haut en bas dans le DOM
      
      const worldX = (offsetX / rect.width) * 40; // Échelle horizontale (-20 à 20)
      const worldY = (offsetY / rect.height) * 15; // Échelle verticale (-15 à 0)
      
      return {
        x: worldX,
        y: worldY
      };
    };
    
    // Vérifie si le point touché est sur le vaisseau
    const isTouchOnShip = (touchX: number, touchY: number, rect: DOMRect): boolean => {
      if (!gameEngine || !gameEngine.ship) return false;
      
      // Coordonnées du vaisseau dans le monde 3D
      const shipX = gameEngine.ship.position.x;
      const shipY = gameEngine.ship.position.y;
      
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
    
    // Gestion du début d'interaction tactile
    const handleTouchStart = (event: TouchEvent) => {
      if (gameEngine && gameState.value === 'playing') {
        // Empêcher le scroll par défaut
        event.preventDefault();
        
        // Utiliser le premier point de contact
        if (event.touches.length > 0) {
          const touch = event.touches[0];
          const rect = gameContainer.value?.getBoundingClientRect();
          
          if (rect) {
            const touchX = touch.clientX;
            const touchY = touch.clientY;
            
            // Vérifier si le toucher est sur le vaisseau
            if (isTouchOnShip(touchX, touchY, rect)) {
              // Enregistrer la position initiale du toucher
              mouseStartX = touchX;
              mouseStartY = touchY;
              
              // Enregistrer la position actuelle du vaisseau
              if (gameEngine.ship) {
                dragStartX = gameEngine.ship.position.x;
                dragStartY = gameEngine.ship.position.y;
              }
              
              isDragging = true;
              
              if (DEBUG_MODE) {
                console.log('Début du toucher sur le vaisseau');
              }
            }
          } else {
            // Si on n'a pas le rectangle, on ne peut pas déterminer si le toucher est sur le vaisseau
            // Ne rien faire
          }
        }
      }
    };
    
    // Gestion du mouvement tactile
    const handleTouchMove = (event: TouchEvent) => {
      if (isDragging && gameEngine && gameState.value === 'playing') {
        // Empêcher le scroll par défaut
        event.preventDefault();
        
        // Limiter la fréquence des mises à jour pour éviter le lag
        const now = performance.now();
        if (now - lastMoveTimestamp < updateInterval) {
          return; // Ignorer les mouvements trop fréquents
        }
        lastMoveTimestamp = now;
        
        // Utiliser le premier point de contact
        if (event.touches.length > 0) {
          const touch = event.touches[0];
          
          // Calculer le déplacement du doigt par rapport à sa position initiale
          const touchDeltaX = touch.clientX - mouseStartX;
          const touchDeltaY = mouseStartY - touch.clientY; // Inversion car Y va de haut en bas dans le DOM
          
          // Calculer le facteur d'échelle pour convertir les pixels en unités du monde
          const rect = gameContainer.value?.getBoundingClientRect();
          if (!rect) return;
          
          // Augmenter davantage la sensibilité pour les appareils tactiles
          // pour des mouvements plus réactifs avec moins d'effort
          const scaleFactorX = 80 / rect.width;
          const scaleFactorY = 50 / rect.height;
          
          // Calculer la nouvelle position du vaisseau (X et Y)
          const newShipX = dragStartX + (touchDeltaX * scaleFactorX);
          const newShipY = dragStartY + (touchDeltaY * scaleFactorY);
          
          // Limiter la position aux bornes du jeu
          const clampedX = Math.max(-20, Math.min(20, newShipX));
          const clampedY = Math.max(-15, Math.min(0, newShipY)); // Limites verticales
          
          // Appliquer la position au vaisseau (X et Y variables)
          gameEngine.setMousePosition(clampedX, clampedY, true);
          
          if (DEBUG_MODE && touchDeltaX % 40 === 0) {
            console.log(`Touch delta: ${touchDeltaX}px, New ship position: ${clampedX}`);
          }
        }
      }
    };
    
    // Gestion de la fin d'interaction tactile
    const handleTouchEnd = (event: TouchEvent) => {
      // Fin du drag tactile
      if (isDragging && DEBUG_MODE) {
        console.log('Fin du toucher tactile');
      }
      isDragging = false;
      
      // Empêcher le scroll par défaut sur l'événement de fin de toucher
      event.preventDefault();
    };
    
    // Gestion de la visibilité de la page (mettre en pause si l'onglet est inactif)
    const handleVisibilityChange = () => {
      if (document.hidden && gameState.value === 'playing') {
        pauseGame();
      }
    };
    
    // Fonction pour empêcher le défilement sur les appareils mobiles
    const preventDefaultTouchMove = (e: TouchEvent) => {
      if (gameState.value === 'playing') {
        e.preventDefault();
      }
    };
    
    // Nous ajouterons cet écouteur d'événements dans onMounted
    
    // Cycle de vie du composant
    const gameTimer = ref<number | null>(null);
    
    onMounted(() => {
      // Initialiser le jeu
      initGame();
      
      // Empêcher le zoom et le défilement sur les appareils mobiles
      document.addEventListener('touchmove', preventDefaultTouchMove, { passive: false });
      
      // Ajouter les écouteurs d'événements
      window.addEventListener('keydown', handleKeyDown);
      if (gameContainer.value) {
        // Ajouter les écouteurs d'événements mouse uniquement sur le container du jeu
        gameContainer.value.addEventListener('mousedown', handleMouseDown);
        gameContainer.value.addEventListener('mousemove', handleMouseMove);
        gameContainer.value.addEventListener('mouseup', handleMouseUp);
        gameContainer.value.addEventListener('mouseleave', handleMouseUp); // Arrêter le drag si on sort du conteneur
        
        // Ajouter les écouteurs d'événements tactiles
        gameContainer.value.addEventListener('touchstart', handleTouchStart);
        gameContainer.value.addEventListener('touchmove', handleTouchMove);
        gameContainer.value.addEventListener('touchend', handleTouchEnd);
        gameContainer.value.addEventListener('touchcancel', handleTouchEnd);
      }
      document.addEventListener('visibilitychange', handleVisibilityChange);
      
      gameTimer.value = setTimeout(() => {
        endGame();
      }, 30000);
    });
    
    onUnmounted(() => {
      // Retirer les écouteurs d'événements
      document.removeEventListener('touchmove', preventDefaultTouchMove);
      window.removeEventListener('keydown', handleKeyDown);
      if (gameContainer.value) {
        gameContainer.value.removeEventListener('mousedown', handleMouseDown);
        gameContainer.value.removeEventListener('mousemove', handleMouseMove);
        gameContainer.value.removeEventListener('mouseup', handleMouseUp);
        gameContainer.value.removeEventListener('mouseleave', handleMouseUp);
        
        // Retirer les écouteurs d'événements tactiles
        gameContainer.value.removeEventListener('touchstart', handleTouchStart);
        gameContainer.value.removeEventListener('touchmove', handleTouchMove);
        gameContainer.value.removeEventListener('touchend', handleTouchEnd);
        gameContainer.value.removeEventListener('touchcancel', handleTouchEnd);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      if (gameEngine) {
        gameEngine.dispose();
      }
      
      clearTimeout(gameTimer.value);
    });
    
    // Surveiller les changements d'état pour effectuer des actions supplémentaires
    watch(gameState, (newState) => {
      if (newState === 'game-over') {
        // Animations ou sons pour la fin de jeu pourraient être ajoutés ici
      }
    });
    
    function endGame() {
      gameState.value = 'game-over';
      // Optionally call continueToNextGame() here
    }
    
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
      saveHighScore,
      continueToNextGame
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
