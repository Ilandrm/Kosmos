<template>
  <div class="telescope-game-container">
    <div class="game-header">
      <div class="score-display">
        Score: {{ score }}
      </div>
      <div class="planet-indicator" v-if="targetPlanet && gameStarted">
        <span>Recherchez la planète: </span>
        <div class="target-color" :style="{ backgroundColor: targetPlanet.color }"></div>
        <span>{{ targetPlanet.name }}</span>
      </div>
      <div class="timer-display" v-if="gameStarted">
        Temps restant: {{ timeLeft }} secondes
      </div>
    </div>
    
    <div class="game-area" ref="gameArea" @mousedown="handleMouseDown">
      <!-- Instruction du jeu -->
      <div class="game-instructions" v-if="!gameStarted && !victoryMessageVisible && !gameOverMessageVisible">
        <h2>Explorateur Spatial</h2>
        <p>Cliquez et glissez pour déplacer votre télescope.</p>
        <p>Trouvez et identifiez les planètes colorées dans l'espace.</p>
        <button class="game-button" @click="startGame">Commencer</button>
      </div>
      
      <!-- Message de victoire (affiché quand toutes les planètes sont trouvées) -->
      <div class="game-instructions" v-if="victoryMessageVisible">
        <h2>Mission Accomplie!</h2>
        <p>Félicitations! Vous avez trouvé toutes les planètes.</p>
        <p>Score final: {{ score }}</p>
        <button class="game-button" @click="startGame">Rejouer</button>
        <button @click="continueToNextGame" class="continue-btn">Continuer</button>
      </div>
      
      <!-- Message de défaite (affiché quand le temps est écoulé) -->
      <div class="game-instructions" v-if="gameOverMessageVisible">
        <h2>Temps écoulé!</h2>
        <p>Vous avez perdu!</p>
        <button class="game-button" @click="startGame">Rejouer</button>
        <button @click="continueToNextGame" class="continue-btn">Continuer</button>
      </div>
      
      <!-- Planètes (générées dynamiquement) -->
      <div v-for="(planet, index) in planets" :key="index" 
           class="planet" 
           :style="{ 
              left: planet.x + 'px', 
              top: planet.y + 'px', 
              width: planet.size + 'px',
              height: planet.size + 'px',
              background: planet.gradient
           }">
        <div v-if="planet.hasRing" 
             class="planet-ring" 
             :style="{ background: planet.ringColor }"></div>
      </div>
      
      <!-- Superposition de l'effet télescope -->
      <div class="telescope-overlay" id="telescope-overlay"></div>
      
      <!-- Vue du télescope -->
      <div class="telescope-view" id="telescope-view"></div>
      
      <!-- La capture se fait automatiquement au clic -->
      
      <!-- Viseur du télescope -->
      <div class="telescope-viewfinder" 
           :style="{ 
              left: position.x + 'px', 
              top: position.y + 'px' 
           }">
        <div class="corner top-left"></div>
        <div class="corner top-right"></div>
        <div class="corner bottom-left"></div>
        <div class="corner bottom-right"></div>
      </div>
      
      <!-- Bouton de validation -->
      <button v-if="gameStarted" class="validate-button" @click="checkPlanetCapture">Capturer</button>
      
      <!-- Messages de feedback -->
      <div v-if="feedbackVisible" 
           :class="['feedback-message', feedbackSuccess ? 'success' : 'error']">
        {{ feedbackMessage }}
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import GameEngine from './GameEngine';
import { getNextGame, isLastGame } from '@/services/GameFlowService';

export default defineComponent({
  name: 'TelescopeGame',
  
  data() {
    return {
      gameEngine: null,
      gameArea: null,
      gameAreaBounds: { width: 0, height: 0 },
      position: { x: 0, y: 0 },
      gameStarted: false,
      score: 0,
      targetPlanet: null,
      planets: [],
      planetsToFind: [],
      feedbackVisible: false,
      feedbackMessage: '',
      feedbackSuccess: false,
      victoryMessageVisible: false,
      gameOverMessageVisible: false,
      timeLeft: 30,
      gameTimer: null,
      isDragging: false
    };
  },
  
  mounted() {
    this.gameArea = this.$refs.gameArea;
    this.gameAreaBounds = this.gameArea.getBoundingClientRect();
    this.position = {
      x: this.gameAreaBounds.width / 2,
      y: this.gameAreaBounds.height / 2
    };
    
    // Initialiser le moteur de jeu
    this.gameEngine = new GameEngine(
      this.gameArea, 
      this.updatePlanets.bind(this),
      this.updateTelescopePosition.bind(this)
    );
    
    // Gérer le redimensionnement de la fenêtre
    window.addEventListener('resize', this.handleResize);
    
    // Gérer la visibilité de la page
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    
    // Initialiser le télescope
    this.updateTelescopePosition();
  },
  
  beforeUnmount() {
    // Nettoyer les écouteurs d'événements
    window.removeEventListener('resize', this.handleResize);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    
    // S'assurer de supprimer les écouteurs de souris s'ils sont toujours actifs
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mouseup', this.handleMouseUp);
    
    // Arrêter le moteur de jeu s'il est en cours d'exécution
    if (this.gameEngine) {
      this.gameEngine.stop();
    }
    
    // Annuler le timer de jeu
    if (this.gameTimer) {
      clearTimeout(this.gameTimer);
    }
  },
  
  methods: {
    startGame() {
      this.gameStarted = true;
      this.score = 0;
      this.victoryMessageVisible = false;
      this.gameOverMessageVisible = false;
      this.timeLeft = 30;
      
      // Mettre à jour les limites de la zone de jeu
      this.gameAreaBounds = this.gameArea.getBoundingClientRect();
      
      // Initialiser la position du télescope
      this.position = {
        x: this.gameAreaBounds.width / 2,
        y: this.gameAreaBounds.height / 2
      };
      
      // Démarrer le moteur de jeu
      if (this.gameEngine) {
        this.gameEngine.start();
      }
      
      // Démarer le timer de jeu
      this.gameTimer = setInterval(() => {
        if (this.timeLeft > 0) {
          this.timeLeft--;
        } else {
          clearInterval(this.gameTimer);
          this.gameOverMessageVisible = true;
          this.gameStarted = false;
        }
      }, 1000);
    },
    
    updatePlanets(planets: any[]) {
      this.planets = planets;
      
      // Si c'est la première mise à jour, configurer les planètes à trouver
      if (this.planets.length > 0 && this.planetsToFind.length === 0) {
        this.planetsToFind = [...this.planets];
        this.selectTargetPlanet();
      }
    },
    
    selectTargetPlanet() {
      if (this.planetsToFind.length === 0) {
        // Toutes les planètes ont été trouvées
        this.showVictoryMessage();
        return;
      }
      
      // Sélectionner la première planète de la liste
      this.targetPlanet = this.planetsToFind[0];
    },
    
    showVictoryMessage() {
      this.victoryMessageVisible = true;
      this.gameStarted = false;
      clearInterval(this.gameTimer);
    },
    
    updateTelescopePosition() {
      if (!this.gameArea) return;
      
      const telescopeView = this.gameArea.querySelector('#telescope-view');
      const telescopeOverlay = this.gameArea.querySelector('#telescope-overlay');
      
      if (telescopeView && telescopeOverlay) {
        (telescopeView as HTMLElement).style.left = `${this.position.x}px`;
        (telescopeView as HTMLElement).style.top = `${this.position.y}px`;
        
        // Créer un masque circulaire
        const maskStyle = `
          radial-gradient(circle at ${this.position.x}px ${this.position.y}px, 
          transparent 0px, 
          transparent 80px, 
          rgba(0, 0, 0, 0.95) 100px)
        `;
        
        (telescopeOverlay as HTMLElement).style.background = maskStyle;
      }
    },
    
    checkPlanetCapture() {
      if (!this.gameStarted || !this.targetPlanet) return;
      
      // Trouver la planète la plus proche du viseur
      let closestPlanet = null;
      let closestDistance = Infinity;
      
      for (const planet of this.planets) {
        const distance = Math.sqrt(
          Math.pow(this.position.x - planet.x, 2) + 
          Math.pow(this.position.y - planet.y, 2)
        );
        
        if (distance < closestDistance && distance < 75) {
          closestDistance = distance;
          closestPlanet = planet;
        }
      }
      
      if (closestPlanet) {
        // Vérifier si c'est la planète cible
        if (closestPlanet.id === this.targetPlanet.id) {
          // Bonne planète
          this.showFeedback('SUCCESS!', true);
          
          // Incrémenter le score
          this.score++;
          
          // Retirer la planète de la liste des planètes à trouver
          this.planetsToFind.shift();
          
          // Sélectionner une nouvelle cible
          this.selectTargetPlanet();
        } else {
          // Mauvaise planète
          this.showFeedback('Erreur - Mauvaise planète', false);
        }
      } else {
        // Aucune planète à proximité
        this.showFeedback('Aucune planète détectée', false);
      }
    },
    
    showFeedback(message: string, isSuccess: boolean) {
      this.feedbackVisible = true;
      this.feedbackMessage = message;
      this.feedbackSuccess = isSuccess;
      
      // Cacher le feedback après un délai
      setTimeout(() => {
        this.feedbackVisible = false;
      }, 1500);
    },
    
    // Variables pour le drag & drop
    handleMouseDown(e: MouseEvent) {
      if (!this.gameStarted || !this.gameArea) return;
      
      this.isDragging = true;
      this.updateTelescopeFromMouse(e);
      document.addEventListener('mousemove', this.handleMouseMove);
      document.addEventListener('mouseup', this.handleMouseUp);
    },
    
    handleMouseMove(e: MouseEvent) {
      if (this.isDragging) {
        this.updateTelescopeFromMouse(e);
      }
    },
    
    handleMouseUp(e: MouseEvent) {
      if (this.isDragging) {
        this.isDragging = false;
        document.removeEventListener('mousemove', this.handleMouseMove);
        document.removeEventListener('mouseup', this.handleMouseUp);
        
        // Vérifier si une planète est capturée au relâchement
        this.checkPlanetCapture();
      }
    },
    
    updateTelescopeFromMouse(e: MouseEvent) {
      if (!this.gameArea) return;
      
      // Calculer la position par rapport à la zone de jeu
      const rect = this.gameArea.getBoundingClientRect();
      const boundaryMargin = 80; // Marge pour éviter de trop coller aux bords
      
      // Limiter la position aux limites de la zone de jeu
      this.position.x = Math.min(
        Math.max(e.clientX - rect.left, boundaryMargin),
        rect.width - boundaryMargin
      );
      
      this.position.y = Math.min(
        Math.max(e.clientY - rect.top, boundaryMargin),
        rect.height - boundaryMargin
      );
      
      this.updateTelescopePosition();
    },
    
    handleVisibilityChange() {
      // Mettre le jeu en pause si l'utilisateur change d'onglet
      if (document.hidden && this.gameStarted && this.gameEngine) {
        this.gameEngine.pause();
      } else if (!document.hidden && this.gameStarted && this.gameEngine) {
        this.gameEngine.resume();
      }
    },
    
    handleResize() {
      if (this.gameArea) {
        this.gameAreaBounds = this.gameArea.getBoundingClientRect();
        this.updateTelescopePosition();
      }
    },
    
    continueToNextGame() {
      const nextGame = getNextGame('telescope');
      this.$router.push({ name: nextGame });
    }
  }
});
</script>

<style scoped>
.telescope-game-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: 
    radial-gradient(circle at 50% 50%, rgba(0, 41, 102, 0.3) 0%, transparent 100%),
    radial-gradient(circle at 20% 30%, rgba(128, 0, 255, 0.4) 0%, transparent 50%),
    radial-gradient(circle at 80% 70%, rgba(0, 209, 255, 0.3) 0%, transparent 50%),
    radial-gradient(circle at 60% 40%, rgba(238, 130, 238, 0.3) 0%, transparent 60%),
    linear-gradient(45deg, #000428 0%, #140028 30%, #1B004B 70%, #002447 100%);
  font-family: 'Orbitron', sans-serif;
  color: white;
}

.game-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 20px;
  height: 60px;
}

.score-display {
  font-size: 24px;
  color: #00d1ff;
  text-shadow: 0 0 10px rgba(0, 209, 255, 0.5);
  font-weight: 700;
  background: rgba(0, 20, 50, 0.8);
  padding: 10px 20px;
  border-radius: 10px;
  border: 2px solid #00d1ff;
}

.planet-indicator {
  background: rgba(0, 20, 50, 0.8);
  padding: 10px;
  border-radius: 10px;
  border: 2px solid #00d1ff;
  display: flex;
  align-items: center;
  gap: 10px;
}

.target-color {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 1px solid white;
}

.timer-display {
  font-size: 24px;
  color: #ff9900;
  text-shadow: 0 0 10px rgba(255, 153, 0, 0.5);
  font-weight: 700;
  background: rgba(0, 20, 50, 0.8);
  padding: 10px 20px;
  border-radius: 10px;
  border: 2px solid #ff9900;
}

.game-area {
  position: relative;
  flex: 1;
  overflow: hidden;
}

.game-button {
  font-family: 'Orbitron', sans-serif;
  background: linear-gradient(45deg, #003a66, #00588f);
  border: 2px solid #00d1ff;
  color: white;
  padding: 1rem 2rem;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1.2rem;
  transition: all 0.3s;
}

.game-button:hover {
  background: #00d1ff;
  color: black;
}

.validate-button {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 20;
  font-family: 'Orbitron', sans-serif;
  background: linear-gradient(45deg, #003a66, #00588f);
  border: 2px solid #00d1ff;
  color: white;
  padding: 0.7rem 1.5rem;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.3s;
}

.validate-button:hover {
  background: #00d1ff;
  color: black;
}

.game-instructions {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 20, 50, 0.9);
  padding: 30px;
  border-radius: 15px;
  border: 2px solid #00d1ff;
  text-align: center;
  max-width: 80%;
  z-index: 15;
}

.planet {
  position: absolute;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
  overflow: hidden;
}

.planet::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0) 70%);
}

.planet-ring {
  position: absolute;
  width: 160%;
  height: 10px;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) rotate(20deg);
  border-radius: 50%;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.7);
  z-index: -1;
  opacity: 0.9;
}

.telescope-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.85);
  z-index: 5;
  pointer-events: none;
}

.telescope-view {
  position: absolute;
  width: 180px;
  height: 180px;
  border-radius: 50%;
  background-color: transparent;
  transform: translate(-50%, -50%);
  z-index: 6;
  pointer-events: none;
  overflow: hidden;
  box-shadow: 0 0 40px 20px rgba(0, 0, 0, 0.9) inset;
}

.telescope-viewfinder {
  position: absolute;
  width: 160px;
  height: 160px;
  border: 2px solid #00d1ff;
  border-radius: 10px;
  transform: translate(-50%, -50%);
  box-shadow: 0 0 10px rgba(0, 209, 255, 0.5);
  pointer-events: none;
  z-index: 8;
}

.corner {
  position: absolute;
  width: 20px;
  height: 20px;
  border-color: #00d1ff;
}

.top-left {
  top: 0;
  left: 0;
  border-top: 3px solid;
  border-left: 3px solid;
}

.top-right {
  top: 0;
  right: 0;
  border-top: 3px solid;
  border-right: 3px solid;
}

.bottom-left {
  bottom: 0;
  left: 0;
  border-bottom: 3px solid;
  border-left: 3px solid;
}

.bottom-right {
  bottom: 0;
  right: 0;
  border-bottom: 3px solid;
  border-right: 3px solid;
}

.feedback-message {
  position: absolute;
  top: 100px;
  left: 50%;
  transform: translateX(-50%);
  padding: 10px 20px;
  border-radius: 5px;
  z-index: 30;
  animation: fadeInOut 1.5s forwards;
  font-size: 18px;
  font-weight: bold;
}

.feedback-message.success {
  background-color: rgba(0, 180, 0, 0.8);
  color: white;
}

.feedback-message.error {
  background-color: rgba(200, 0, 0, 0.8);
  color: white;
}

.continue-btn {
  font-family: 'Orbitron', sans-serif;
  background: linear-gradient(45deg, #003a66, #00588f);
  border: 2px solid #00d1ff;
  color: white;
  padding: 1rem 2rem;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1.2rem;
  transition: all 0.3s;
}

.continue-btn:hover {
  background: #00d1ff;
  color: black;
}

@keyframes fadeInOut {
  0% { opacity: 0; transform: translate(-50%, -20px); }
  20% { opacity: 1; transform: translate(-50%, 0); }
  80% { opacity: 1; transform: translate(-50%, 0); }
  100% { opacity: 0; transform: translate(-50%, 20px); }
}

</style>
