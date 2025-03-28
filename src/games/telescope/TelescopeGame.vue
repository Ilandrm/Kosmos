<template>
  <div class="telescope-game-container">
    <div class="game-header">
      <div class="timer-display" v-if="gameStarted">
        Temps restant: {{ timeLeft }} secondes
      </div>
      <div class="planet-indicator" v-if="targetPlanet && gameStarted">
        <span>Recherchez la planète: </span>
        <div class="target-color" :style="{ backgroundColor: targetPlanet.color }"></div>
      </div>
    </div>
    
    <div class="game-area" ref="gameArea">
      <!-- Game Instructions Overlay -->
      <GameInstruction
        v-if="showInstructions"
        :title="gameInstructions.title"
        :players="gameInstructions.players"
        :time="gameInstructions.time"
        :instruction="gameInstructions.instruction"
        @start="onInstructionComplete"
      />
      
      <!-- Message de victoire (affiché quand toutes les planètes sont trouvées) -->
      <div class="game-instructions" v-if="victoryMessageVisible">
        <h2>Mission Accomplie!</h2>
        <p>Félicitations! Vous avez trouvé toutes les planètes.</p>
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
      
      <!-- Vue du télescope pour le joueur 1 -->
      <div class="telescope-view telescope-view-1" id="telescope-view-1"
           :style="{ 
              left: position.x + 'px', 
              top: position.y + 'px' 
           }"></div>
      
      <!-- Vue du télescope pour le joueur 2 -->
      <div class="telescope-view telescope-view-2" id="telescope-view-2"
           :style="{ 
              left: position2.x + 'px', 
              top: position2.y + 'px' 
           }"></div>
      
      <!-- La capture se fait automatiquement au clic -->
      
      <!-- Viseur du télescope pour le premier joueur -->
      <!-- Pour le télescope 1 -->
<div class="telescope-viewfinder" 
     :style="{ left: position.x + 'px', top: position.y + 'px' }"
     @mousedown.stop="startDragging(1, $event)"
     @touchstart.stop="handleTouchStart($event, 1)">
  <!-- ... -->
</div>

<!-- Pour le télescope 2 -->
<div class="telescope-viewfinder player2" 
     :style="{ left: position2.x + 'px', top: position2.y + 'px' }"
     @mousedown.stop="startDragging(2, $event)"
     @touchstart.stop="handleTouchStart($event, 2)">
  <!-- ... -->
</div>
      
      <!-- Bouton de validation -->
      
      <!-- Controls information -->
    
      
      <!-- Messages de feedback -->
      <div v-if="feedbackVisible" 
           :class="['feedback-message', feedbackSuccess ? 'success' : 'error']">
        {{ feedbackMessage }}
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import GameEngine from './GameEngine';
import { getNextGame, isLastGame, getGameInstructions } from '@/services/GameFlowService';
import GameInstruction from '@/components/GameInstruction.vue';

export default defineComponent({
  name: 'TelescopeGame',
  components: {
    GameInstruction
  },
  
  data() {
    return {
      gameEngine: null as GameEngine | null,
      gameArea: null as HTMLElement | null,
      gameAreaBounds: { width: 0, height: 0 },
      position: { x: 0, y: 0 },
      position2: { x: 0, y: 0 }, // Initialize second player's position
      isDragging2: false, // Track dragging state for second player
      gameStarted: false,
      targetPlanet: null,
      planets: [],
      planetsToFind: [],
      feedbackVisible: false,
      feedbackMessage: '',
      feedbackSuccess: false,
      victoryMessageVisible: false,
      gameOverMessageVisible: false,
      timeLeft: 30,
      gameTimer: null as NodeJS.Timeout | null,
      isDragging: false,
      showInstructions: true,
      gameInstructions: getGameInstructions('telescope') || {
        title: "Explorateur Spatial",
        players: "1-2 joueurs",
        time: "30 secondes",
        instruction: "Déplacez les 2 viseurs pour trouver les planètes"
      },
      lastPosition: null as { x1: number, y1: number, x2: number, y2: number } | null,
      touches: ref([]),
      telescope1: { position: { x: 0, y: 0 } },
      telescope2: { position: { x: 0, y: 0 } },
      touchIdentifiers: ref({
        telescope1: null,
        telescope2: null
      }),
    };
  },
  
  mounted() {
    this.gameArea = this.$refs.gameArea as HTMLElement;
    if (!this.gameArea) return;
    
    this.gameAreaBounds = this.gameArea.getBoundingClientRect();
    this.position = {
      x: this.gameAreaBounds.width / 2,
      y: this.gameAreaBounds.height / 2
    };
    
    // Initialize second telescope position
    this.position2 = {
      x: this.gameAreaBounds.width / 3,
      y: this.gameAreaBounds.height / 3
    };
    
    // Avoid the 'bind' issue by using arrow functions
    const updatePlanetsHandler = (planets: any[]) => {
      this.updatePlanets(planets);
    };
    
    const updateTelescopeHandler = () => {
      this.updateTelescopePosition();
    };
    
    // Initialize game engine with arrow functions instead of binding
    this.gameEngine = new GameEngine(
      this.gameArea,
      updatePlanetsHandler,
      updateTelescopeHandler
    );
    
    // Add event listeners (sans les contrôles clavier)
    window.addEventListener('visibilitychange', this.handleVisibilityChange);
    window.addEventListener('resize', this.handleResize);
    document.addEventListener('touchmove', this.handleTouchMove);
    document.addEventListener('touchend', this.handleTouchEnd);
  },
  
  methods: {
    updatePlanets(planets: any[]) {
      this.planets = planets;
      
      // If it's the first update, configure the planets to find
      if (this.planets.length > 0 && this.planetsToFind.length === 0) {
        this.planetsToFind = [...this.planets];
        this.selectTargetPlanet();
      }
    },
    
    selectTargetPlanet() {
      if (this.planetsToFind.length === 0) {
        // All planets have been found
        this.showVictoryMessage();
        return;
      }
      
      // Select the first planet in the list
      this.targetPlanet = this.planetsToFind[0];
    },
    
    showVictoryMessage() {
      this.victoryMessageVisible = true;
      this.gameStarted = false;
      if (this.gameTimer) clearInterval(this.gameTimer);
      
      // Play victory sound if available
      const victorySound = new Audio('/assets/sounds/victory.mp3');
      victorySound.play();
    },
    updateTelescopePosition() {
  if (!this.gameArea) return;
  
  const telescopeOverlay = this.gameArea.querySelector('#telescope-overlay');
  
  if (telescopeOverlay) {
    // Calculer les dimensions
    const rect = this.gameArea.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    
    // Créer un SVG avec deux cercles comme "découpes"
    const svgMask = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
        <defs>
          <mask id="telescopeMask">
            <rect width="100%" height="100%" fill="white"/>
            <circle cx="${this.position.x}" cy="${this.position.y}" r="80" fill="black"/>
            <circle cx="${this.position2.x}" cy="${this.position2.y}" r="80" fill="black"/>
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgba(0,0,0,0.95)" mask="url(#telescopeMask)"/>
      </svg>
    `;
    
    // Convertir le SVG en Data URI
    const dataURI = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgMask);
    
    // Appliquer comme arrière-plan
    (telescopeOverlay as HTMLElement).style.background = `url('${dataURI}')`;
    (telescopeOverlay as HTMLElement).style.backgroundSize = '100% 100%';
  }
},
    
    // Gestion des événements tactiles et souris
    startDragging(playerNum: number, e: MouseEvent | TouchEvent) {
      if (!this.gameStarted) return;
      
      if (playerNum === 1) {
        this.isDragging = true;
      } else if (playerNum === 2) {
        this.isDragging2 = true;
      }
      
      if (e.type === 'mousedown') {
        this.updatePositionFromEvent(playerNum, e);
        document.addEventListener('mousemove', this.handleMouseMove);
        document.addEventListener('mouseup', this.handleMouseUp);
      } else if (e.type === 'touchstart') {
        const touch = (e as TouchEvent).touches[0];
        this.touches.push({
          id: touch.identifier,
          x: touch.clientX - this.gameAreaBounds.left,
          y: touch.clientY - this.gameAreaBounds.top
        });
        document.addEventListener('touchmove', this.handleTouchMove);
        document.addEventListener('touchend', this.handleTouchEnd);
        e.preventDefault();
      }
    },
    
    handleMouseMove(e: MouseEvent) {
      // Ne mettre à jour que si le joueur est en train de déplacer un télescope
      if (this.isDragging) {
        this.updatePositionFromEvent(1, e);
      } else if (this.isDragging2) {
        this.updatePositionFromEvent(2, e);
      }
    },
    
   
    handleMouseUp() {
      if (this.isDragging) {
        // Vérifier si le joueur 1 a capturé une planète
        this.checkPlanetCapture(1);
        this.isDragging = false;
      } else if (this.isDragging2) {
        // Vérifier si le joueur 2 a capturé une planète
        this.checkPlanetCapture(2);
        this.isDragging2 = false;
      }
      
      document.removeEventListener('mousemove', this.handleMouseMove);
      document.removeEventListener('mouseup', this.handleMouseUp);
    },
    
    
    
    updatePositionFromEvent(playerNum: number, e: MouseEvent | TouchEvent) {
      if (!this.gameArea) return;
      
      // Obtenir les coordonnées de l'événement
      let clientX, clientY;
      
      if ('touches' in e) {
        // C'est un événement tactile
        if (e.touches.length === 0) return;
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        // C'est un événement souris
        clientX = e.clientX;
        clientY = e.clientY;
      }
      
      // Calculer la position relative à la zone de jeu
      const rect = this.gameArea.getBoundingClientRect();
      const boundaryMargin = 80; // Marge pour éviter de coller aux bords
      
      // Limiter la position aux limites de la zone de jeu
      const newX = Math.min(
        Math.max(clientX - rect.left, boundaryMargin),
        rect.width - boundaryMargin
      );
      
      const newY = Math.min(
        Math.max(clientY - rect.top, boundaryMargin),
        rect.height - boundaryMargin
      );
      
      requestAnimationFrame(() => {
        if (playerNum === 1) {
          this.position.x = newX;
          this.position.y = newY;
        } else {
          this.position2.x = newX;
          this.position2.y = newY;
        }
        this.updateTelescopePosition();
      });
    },
    
    // Cette méthode n'est plus utilisée car on utilise startDragging à la place
    handleKeyDown(e: KeyboardEvent) {
      // Garde cette méthode vide mais conservée pour la compatibilité
    },
    
    checkPlanetCapture(playerNum = 1) {
      if (!this.gameStarted || !this.targetPlanet) return;
      
      // Determine which player's position to use
      const position = playerNum === 1 ? this.position : this.position2;
      const playerText = playerNum === 1 ? "Joueur 1" : "Joueur 2";
      
      // Find the closest planet to the viewfinder
      let closestPlanet = null;
      let closestDistance = Infinity;
      
      for (const planet of this.planets) {
        const distance = Math.sqrt(
          Math.pow(position.x - planet.x, 2) + 
          Math.pow(position.y - planet.y, 2)
        );
        
        if (distance < closestDistance && distance < 75) {
          closestDistance = distance;
          closestPlanet = planet;
        }
      }
      
      if (closestPlanet) {
        // Check if it's the target planet
        if (closestPlanet.id === this.targetPlanet.id) {
          // Correct planet!
          this.showFeedback(`${playerText} SUCCESS!`, true);
          
          // Play success sound if available
          const successSound = new Audio('/assets/sounds/success.mp3');
          successSound.play();
          
          // Remove the planet from the list of planets to find
          this.planetsToFind.shift();
          
          // Add some time bonus
          this.timeLeft = Math.min(this.timeLeft + 5, 30);
          
          // Select a new target
          this.selectTargetPlanet();
        } else {
          // Wrong planet
          this.showFeedback(`${playerText} - Mauvaise planète`, false);
          
          // Play error sound if available
          const errorSound = new Audio('/assets/sounds/error.mp3');
          errorSound.play();
        }
      } else {
        // No planet nearby
        this.showFeedback(`${playerText} - Aucune planète détectée`, false);
      }
    },
    
    showFeedback(message: string, isSuccess: boolean) {
      this.feedbackVisible = true;
      this.feedbackMessage = message;
      this.feedbackSuccess = isSuccess;
      
      // Hide the feedback after a delay
      setTimeout(() => {
        this.feedbackVisible = false;
      }, 1500);
    },
    
    // Ces méthodes sont remplacées par startDragging, handleMouseMove et handleTouchMove
    
    // Method to start the game
    startGame() {
      // Reset game state
      this.gameStarted = true;
      this.victoryMessageVisible = false;
      this.gameOverMessageVisible = false;
      this.feedbackVisible = false;
      this.timeLeft = 30;
      
      // Update the game area bounds
      if (this.gameArea) {
        this.gameAreaBounds = this.gameArea.getBoundingClientRect();
      }
      
      // Initialize telescope positions
      this.position = {
        x: this.gameAreaBounds.width / 2,
        y: this.gameAreaBounds.height / 2
      };
      
      this.position2 = {
        x: this.gameAreaBounds.width / 3,
        y: this.gameAreaBounds.height / 3
      };
      
      // Start the game engine
      if (this.gameEngine) {
        this.gameEngine.start();
      }
      
      // Start the game timer
      if (this.gameTimer) {
        clearInterval(this.gameTimer);
      }
      
      this.gameTimer = setInterval(() => {
        if (this.timeLeft > 0) {
          this.timeLeft--;
        } else {
          if (this.gameTimer) clearInterval(this.gameTimer);
          this.gameOverMessageVisible = true;
          this.gameStarted = false;
          
          // Play defeat sound if available
          const defeatSound = new Audio('/assets/sounds/defeat.mp3');
          defeatSound.play();
        }
      }, 1000);
    },
    
    onInstructionComplete() {
      this.showInstructions = false;
      this.startGame();
    },
    
    // Cette méthode a été supprimée car nous utilisons uniquement le drag maintenant
    
    handleVisibilityChange() {
      // Pause the game if the user changes tabs
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
    },
    
    // Cleanup on component unmount
    beforeUnmount() {
      // Stop the game engine
      if (this.gameEngine) {
        this.gameEngine.stop();
      }
      
      // Clear timer
      if (this.gameTimer) {
        clearInterval(this.gameTimer);
      }
      
      // Remove event listeners
      document.removeEventListener('mousemove', this.handleMouseMove);
      document.removeEventListener('mouseup', this.handleMouseUp);
      document.removeEventListener('touchmove', this.handleTouchMove);
      document.removeEventListener('touchend', this.handleTouchEnd);
      window.removeEventListener('visibilitychange', this.handleVisibilityChange);
      window.removeEventListener('resize', this.handleResize);
      
      // Nettoyer le game engine si existant
      if (this.gameEngine) {
        this.gameEngine.cleanup();
      }
    },
    
    // Remplacer la méthode handleTouchStart
    handleTouchStart(e: TouchEvent, telescopeNum?: number) {
  if (!this.gameStarted) return;
  e.preventDefault();
  
  // Utiliser le touch le plus récent
  const touch = e.touches[e.touches.length - 1];
  
  // Si un numéro de télescope est spécifié explicitement (depuis le template)
  if (telescopeNum) {
    if (telescopeNum === 1 && this.touchIdentifiers.telescope1 === null) {
      this.touchIdentifiers.telescope1 = touch.identifier;
      this.isDragging = true;
    } else if (telescopeNum === 2 && this.touchIdentifiers.telescope2 === null) {
      this.touchIdentifiers.telescope2 = touch.identifier;
      this.isDragging2 = true;
    }
  } else {
    // Fallback au cas où telescopeNum n'est pas fourni (ne devrait pas arriver)
    const touchX = touch.clientX - this.gameAreaBounds.left;
    const touchY = touch.clientY - this.gameAreaBounds.top;
    
    const dist1 = Math.hypot(touchX - this.position.x, touchY - this.position.y);
    const dist2 = Math.hypot(touchX - this.position2.x, touchY - this.position2.y);
    
    if (dist1 <= dist2 && this.touchIdentifiers.telescope1 === null) {
      this.touchIdentifiers.telescope1 = touch.identifier;
      this.isDragging = true;
    } else if (this.touchIdentifiers.telescope2 === null) {
      this.touchIdentifiers.telescope2 = touch.identifier;
      this.isDragging2 = true;
    }
  }
},

// Corriger handleTouchMove pour utiliser ces identifiants
handleTouchMove(e: TouchEvent) {
  e.preventDefault();
  
  // Parcourir tous les points de contact actifs
  for (let i = 0; i < e.touches.length; i++) {
    const touch = e.touches[i];
    
    // Mise à jour du télescope 1
    if (touch.identifier === this.touchIdentifiers.telescope1) {
      this.position.x = touch.clientX - this.gameAreaBounds.left;
      this.position.y = touch.clientY - this.gameAreaBounds.top;
    }
    
    // Mise à jour du télescope 2
    if (touch.identifier === this.touchIdentifiers.telescope2) {
      this.position2.x = touch.clientX - this.gameAreaBounds.left;
      this.position2.y = touch.clientY - this.gameAreaBounds.top;
    }
  }
  
  // Mettre à jour l'affichage des télescopes
  this.updateTelescopePosition();
},

// Corriger handleTouchEnd pour libérer correctement les identifiants
handleTouchEnd(e: TouchEvent) {
  // Vérifier les points de contact qui ont été relâchés
  for (let i = 0; i < e.changedTouches.length; i++) {
    const touch = e.changedTouches[i];
    
    // Si c'était le télescope 1
    if (touch.identifier === this.touchIdentifiers.telescope1) {
      this.checkPlanetCapture(1);
      this.touchIdentifiers.telescope1 = null;
      this.isDragging = false;
    }
    
    // Si c'était le télescope 2
    if (touch.identifier === this.touchIdentifiers.telescope2) {
      this.checkPlanetCapture(2);
      this.touchIdentifiers.telescope2 = null;
      this.isDragging2 = false;
    }
  }
},
    updateTelescopePositionFromTouch(touch: Touch, playerNum: number) {
      if (!this.gameArea) return;
      
      const rect = this.gameArea.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      
      if (playerNum === 1) {
        this.position.x = x;
        this.position.y = y;
      } else {
        this.position2.x = x;
        this.position2.y = y;
      }
      this.updateTelescopePosition();
    },
    
  
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
  z-index: 5;
  pointer-events: none;
}
.telescope-hole {
  position: absolute;
  width: 160px;
  height: 160px;
  border-radius: 50%;
  background-color: transparent;
  box-shadow: 0 0 0 1000px rgba(0, 0, 0, 0.95);
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

.telescope-view-1 {
  border: 3px solid rgba(0, 209, 255, 0.7);
  box-shadow: 0 0 20px rgba(0, 209, 255, 0.5), 0 0 40px 20px rgba(0, 0, 0, 0.9) inset;
}

.telescope-view-2 {
  border: 3px solid rgba(255, 153, 0, 0.7);
  box-shadow: 0 0 20px rgba(255, 153, 0, 0.5), 0 0 40px 20px rgba(0, 0, 0, 0.9) inset;
}

.telescope-viewfinder {
  position: absolute;
  width: 160px;
  height: 160px;
  border: 2px solid #00d1ff;
  border-radius: 10px;
  transform: translate(-50%, -50%);
  box-shadow: 0 0 10px rgba(0, 209, 255, 0.5);
  cursor: move;
  z-index: 8;
}

.telescope-viewfinder.player2 {
  border: 2px solid #ff9900;
  box-shadow: 0 0 10px rgba(255, 153, 0, 0.5);
}

.corner {
  position: absolute;
  width: 20px;
  height: 20px;
  border-color: #00d1ff;
}

.player2 .corner {
  border-color: #ff9900;
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

.controls-info {
  position: absolute;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  background: rgba(0, 20, 50, 0.7);
  padding: 10px;
  border-radius: 10px;
  border: 1px solid rgba(0, 209, 255, 0.5);
  color: white;
  font-size: 14px;
}

@keyframes fadeInOut {
  0% { opacity: 0; transform: translate(-50%, -20px); }
  20% { opacity: 1; transform: translate(-50%, 0); }
  80% { opacity: 1; transform: translate(-50%, 0); }
  100% { opacity: 0; transform: translate(-50%, 20px); }
}
</style>