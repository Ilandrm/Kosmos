<template>
  <div class="space-hangman-container">
    <h1>Pendu Spatial</h1>
    
    <div class="game-area">
      <GameInstruction
        v-if="showInstructions"
        :title="gameInstructions.title"
        :players="gameInstructions.players"
        :time="gameInstructions.time"
        :instruction="gameInstructions.instruction"
        @start="onInstructionComplete"
      />
      <!-- Affichage de la planète et de l'astéroïde -->
      <div class="planet-container">
        <!-- Ajout d'une ligne de trajectoire visuelle -->
        <div class="asteroid-trajectory"></div>
        <div v-html="planetSrc" class="planet-image"></div>
        <div v-if="errors > 0" v-html="asteroidSrc" class="asteroid-image" :class="'asteroid-position-' + errors"></div>
      </div>
      <!-- Zone du mot à deviner -->
      <div class="word-display">
        <span v-for="(letter, index) in displayedWord" :key="index" class="letter-box">
          {{ letter }}
        </span>
      </div>
      
      <!-- Message de statut -->
      <div class="status-message" :class="{ 'win': gameWon, 'lose': gameLost, 'time-up': timeUp }">
        {{ statusMessage }}
      </div>
      
      <!-- Compteur de temps -->
      <div v-if="!timeUp && !gameOver" class="time-left">
        Temps restant : {{ timeLeft }} secondes
      </div>
      
      <!-- Clavier virtuel -->
      <div class="keyboard">
        <button 
          v-for="letter in alphabet" 
          :key="letter" 
          @click="tryLetter(letter)"
          :disabled="usedLetters.includes(letter) || gameOver || timeUp"
          :class="{ 'used': usedLetters.includes(letter) }"
          class="key-button"
        >
          {{ letter }}
        </button>
      </div>
      
  
      <!-- Bouton pour continuer -->
      <button v-if="gameOver || timeUp" @click="continueToNextGame" class="continue-btn">
        Continuer
      </button>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { getNextGame, isLastGame } from '@/services/GameFlowService';
import GameInstruction from '@/components/GameInstruction.vue';
import router from "@/router";

export default defineComponent({
  name: 'SpaceHangmanGame',
  components: {
    GameInstruction,
  },
  setup() {
    // Liste des mots spatiaux à deviner
    const words = [
      "Astre", "Comète", "Soleil", "Terre", "Lune", "Etoile"
    ];
    
    // Alphabet français
    const alphabet = 'abcdefghijklmnopqrstuvwxyz'.split('');
    
    // Variables réactives
    const selectedWord = ref('');
    const displayedWord = ref<string[]>([]);
    const usedLetters = ref<string[]>([]);
    const errors = ref(0);
    const maxErrors = 6;
    const gameWon = ref(false);
    const gameLost = ref(false);
    const timeUp = ref(false);
    const statusMessage = ref('Devinez le mot lié à l\'espace !');
    const timeLeft = ref(40); // Set timer to 40 seconds at game start
    const gameStarted = ref(false);
    const gameOverMessageVisible = ref(false);
    const showInstructions = ref(true);
    const gameInstructions = ref({
      title: 'Pendu Spatial',
      players: '1 joueur',
      time: '30 secondes',
      instruction: 'Devinez le mot en utilisant les lettres à votre disposition'
    });
    
    // Propriété calculée pour déterminer si le jeu est terminé
    const gameOver = computed(() => gameWon.value || gameLost.value || timeUp.value);
    
    // Planète avec une couleur fixe
    const planetSrc = computed(() => {
      // Si on a atteint le nombre max d'erreurs, on retourne une explosion
      if (errors.value >= maxErrors) {
        return `<svg width='200' height='200' xmlns='http://www.w3.org/2000/svg'>
          <defs>
            <radialGradient id='explosionGradient' cx='50%' cy='50%' r='50%' fx='30%' fy='30%'>
              <stop offset='0%' stop-color='#ff9500' />
              <stop offset='50%' stop-color='#ff5722' />
              <stop offset='100%' stop-color='#b71c1c' />
            </radialGradient>
          </defs>
          <circle cx='100' cy='100' r='90' fill='url(#explosionGradient)'>
            <animate attributeName='r' values='70;100;90;120;90' dur='0.5s' repeatCount='1'/>
            <animate attributeName='opacity' values='1;0.9;0.8;0.7;0.5' dur='2s' repeatCount='indefinite'/>
          </circle>
          <path d='M60,60 L140,140 M60,140 L140,60 M100,40 L100,160 M40,100 L160,100' stroke='#ffff00' stroke-width='8'>
            <animate attributeName='stroke-width' values='8;12;8;10;8' dur='0.5s' repeatCount='1'/>
          </path>
        </svg>`;
      }
      
      // Planète normale (bleue)
      return `<svg width='200' height='200' xmlns='http://www.w3.org/2000/svg'>
        <defs>
          <radialGradient id='planetGradient' cx='50%' cy='50%' r='50%' fx='30%' fy='30%'>
            <stop offset='0%' stop-color='#64b5f6' />
            <stop offset='85%' stop-color='#1976d2' />
            <stop offset='100%' stop-color='#0d47a1' />
          </radialGradient>
        </defs>
        <circle cx='100' cy='100' r='80' fill='url(#planetGradient)' stroke='#0d47a1' stroke-width='2' />
        <ellipse cx='70' cy='70' rx='25' ry='20' fill='#2196f3' opacity='0.5' />
        <ellipse cx='130' cy='110' rx='30' ry='22' fill='#2196f3' opacity='0.4' />
        <circle cx='50' cy='120' r='15' fill='#2196f3' opacity='0.3' />
      </svg>`;
    });
    
    // Astéroïde qui se rapproche
    const asteroidSrc = computed(() => {
      // Ajouter un effet de traînée si l'erreur est supérieure à 0
      const trail = errors.value > 0 ? `
        <ellipse cx='40' cy='40' rx='45' ry='15' fill='rgba(255, 87, 34, 0.1)' transform='rotate(-25 40 40)'>
          <animate attributeName='rx' values='45;55;45' dur='2s' repeatCount='indefinite' />
        </ellipse>
        <ellipse cx='40' cy='40' rx='35' ry='10' fill='rgba(255, 87, 34, 0.2)' transform='rotate(-25 40 40)'>
          <animate attributeName='rx' values='35;45;35' dur='1.5s' repeatCount='indefinite' />
        </ellipse>
      ` : '';
      
      return `<svg width='100' height='100' xmlns='http://www.w3.org/2000/svg'>
        <defs>
          <radialGradient id='asteroidGradient' cx='50%' cy='50%' r='50%' fx='30%' fy='30%'>
            <stop offset='0%' stop-color='#a1887f' />
            <stop offset='50%' stop-color='#8d6e63' />
            <stop offset='85%' stop-color='#6d4c41' />
            <stop offset='100%' stop-color='#5d4037' />
          </radialGradient>
          <filter id='asteroidGlow' x='-30%' y='-30%' width='160%' height='160%'>
            <feGaussianBlur stdDeviation='3' result='blur' />
            <feComposite in='SourceGraphic' in2='blur' operator='over' />
          </filter>
        </defs>
        ${trail}
        <g filter='url(#asteroidGlow)'>
          <path d='M40,15 L60,25 L70,45 L55,65 L30,70 L15,55 L20,30 Z' fill='url(#asteroidGradient)' stroke='#3e2723' stroke-width='2' />
          <circle cx='30' cy='35' r='6' fill='#5d4037' />
          <circle cx='50' cy='50' r='8' fill='#5d4037' />
          <ellipse cx='45' cy='30' rx='5' ry='4' fill='#5d4037' />
          <path d='M25,25 L35,35 M45,40 L55,50 M30,55 L40,65' stroke='#3e2723' stroke-width='1' />
        </g>
      </svg>`;
    });
    
    // Fonction pour initialiser ou réinitialiser le jeu
    const resetGame = () => {
      selectedWord.value = words[Math.floor(Math.random() * words.length)].toLowerCase();
      displayedWord.value = Array(selectedWord.value.length).fill('_');
      usedLetters.value = [];
      errors.value = 0;
      gameWon.value = false;
      gameLost.value = false;
      timeUp.value = false;
      statusMessage.value = 'Devinez le mot lié à l\'espace !';
      timeLeft.value = 40; // Set timer to 40 seconds at game start
    };
    const onInstructionComplete = () => {
      showInstructions.value = false;
      startGame();
    };
    
    // Fonction pour essayer une lettre
    const tryLetter = (letter: string) => {
      // Si la lettre a déjà été utilisée ou si le jeu est terminé, ne rien faire
      if (usedLetters.value.includes(letter) || gameOver.value) return;
      
      // Marquer la lettre comme utilisée
      usedLetters.value.push(letter);
      
      // Vérifier si la lettre est dans le mot
      if (selectedWord.value.includes(letter)) {
        // Mettre à jour le mot affiché
        for (let i = 0; i < selectedWord.value.length; i++) {
          if (selectedWord.value[i] === letter) {
            displayedWord.value[i] = letter;
          }
        }
        
        // Jouer un son de succès
        
        // Vérifier si le joueur a gagné
        if (!displayedWord.value.includes('_')) {
          gameWon.value = true;
          statusMessage.value = 'Bravo ! Vous avez sauvé la planète de l\'astéroïde !';
        }
      } else {
        // Incrémenter le compteur d'erreurs
        errors.value++;
        
        // Jouer un son d'erreur
        
        // Vérifier si le joueur a perdu
        if (errors.value >= maxErrors) {
          gameLost.value = true;
          displayedWord.value = selectedWord.value.split('');
          statusMessage.value = 'Perdu ! L\'astéroïde a détruit la planète ! Le mot était : ' + selectedWord.value;
        } else {
          statusMessage.value = `Attention ! L'astéroïde se rapproche... (${maxErrors - errors.value} essais restants)`;
        }
      }
    };
    
    
    // Fonction pour continuer au jeu suivant
    const continueToNextGame = () => {
      const nextGame = getNextGame('space-hangman');
      if (nextGame === 'alien-hunt-3d') {
        router.push({name:'alien-hunt-3d'})
      } else if (nextGame === 'completion') {
        window.location.href = '/completion';
      } else if (nextGame) {
        window.location.href = `/games/${nextGame}`;
      } else {
        window.location.href = '/';
      }
    };
    
    let gameTimer;

    onMounted(() => {
      gameTimer = setInterval(() => {
        if (timeLeft.value > 0) {
          timeLeft.value--;
        } else {
          clearInterval(gameTimer);
          endGame();
        }
      }, 1000);
    });

    onUnmounted(() => {
      clearInterval(gameTimer);
    });

    function endGame() {
      timeUp.value = true;
      statusMessage.value = 'Temps écoulé ! L\'astéroïde a détruit la planète ! Le mot était : ' + selectedWord.value;
      errors.value = maxErrors; // Pour afficher l'explosion
    }
    const startGame = () => {
      resetGame();
      gameStarted.value = true;
    };
    
    // Initialiser le jeu au démarrage
    resetGame();
    
    return {
      displayedWord,
      usedLetters,
      alphabet,
      errors,
      maxErrors,
      gameWon,
      gameLost,
      timeUp,
      gameOver,
      statusMessage,
      tryLetter,
      resetGame,
      planetSrc,
      asteroidSrc,
      continueToNextGame,
      timeLeft,
      gameStarted,
      gameOverMessageVisible,
      showInstructions,      // Add this
      gameInstructions,      // Add this
      onInstructionComplete
    };
  }
});
</script>

<style scoped>
.space-hangman-container {
  width: 100%;
  margin: 0 auto;
  padding: 2rem;
  color: #fff;
  background-color: #050a2f;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-sizing: border-box;
  background-image: url('/Kosmos/assets/images/space-hangman/stars-bg.png');
  background-size: cover;
  border-radius: 10px;
  box-shadow: 0 0 20px rgba(0, 0, 255, 0.3);
}

h1 {
  color: #8af7ff;
  font-size: 3rem;
  text-align: center;
  margin-bottom: 2rem;
  text-shadow: 0 0 10px #00ffff, 0 0 20px #0000ff;
  font-family: 'Orbitron', sans-serif;
}

div.game-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}

.planet-container {
  width: 500px;
  height: 300px;
  margin-bottom: 2rem;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  background: linear-gradient(90deg, rgba(0, 0, 50, 0.1), rgba(0, 0, 50, 0.2), rgba(0, 0, 50, 0.1));
  border-radius: 20px;
  overflow: hidden;
}

.planet-image {
  max-width: 200px;
  max-height: 200px;
  transition: all 0.5s ease;
  animation: float 5s ease-in-out infinite;
  position: relative;
  z-index: 1;
}

.asteroid-image {
  position: absolute;
  transition: all 0.8s ease-in-out;
  z-index: 2;
  animation: asteroid-wobble 3s ease-in-out infinite;
}

.asteroid-trajectory {
  position: absolute;
  top: 150px;
  right: 20px;
  width: 380px;
  height: 3px;
  background: linear-gradient(to left, rgba(255, 87, 34, 0.1), rgba(255, 87, 34, 0.4));
  border-radius: 3px;
  transform: rotate(-5deg);
  z-index: 0;
  box-shadow: 0 0 10px rgba(255, 87, 34, 0.3);
}

/* Positions de l'astéroïde en fonction du nombre d'erreurs - alignées sur la trajectoire */
.asteroid-position-1 {
  top: 135px; 
  right: 350px;
  transform: scale(0.6) rotate(15deg);
  animation: rotate 3s linear infinite;
  transition: all 0.8s ease-in-out;
}

.asteroid-position-2 {
  top: 138px;
  right: 290px;
  transform: scale(0.65) rotate(15deg);
  animation: rotate 2.9s linear infinite;
  transition: all 0.8s ease-in-out;
}

.asteroid-position-3 {
  top: 141px;
  right: 230px;
  transform: scale(0.75) rotate(15deg);
  animation: rotate 2.7s linear infinite;
  transition: all 0.8s ease-in-out;
}

.asteroid-position-4 {
  top: 143px;
  right: 170px;
  transform: scale(0.85) rotate(15deg);
  animation: rotate 2.5s linear infinite;
  transition: all 0.8s ease-in-out;
}

.asteroid-position-5 {
  top: 145px;
  right: 110px;
  transform: scale(0.95) rotate(15deg);
  animation: rotate 2.2s linear infinite;
  transition: all 0.8s ease-in-out;
}

.asteroid-position-6 {
  top: 148px;
  right: 50px;
  transform: scale(1.1) rotate(15deg);
  animation: rotate 2s linear infinite, approach 1s ease-in-out;
  transition: all 0.8s ease-in-out;
}

@keyframes float {
  0% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
  100% { transform: translateY(0); }
}

@keyframes rotate {
  0% { transform: rotate(15deg); }
  100% { transform: rotate(375deg); }
}

@keyframes approach {
  0% { transform: scale(1.1) rotate(15deg); right: 50px; }
  50% { transform: scale(1.15) rotate(45deg); right: 45px; }
  100% { transform: scale(1.1) rotate(15deg); right: 50px; }
}

@keyframes impact {
  0% { transform: scale(1.1) rotate(15deg); opacity: 1; }
  30% { transform: scale(1.4) rotate(90deg); opacity: 0.9; }
  60% { transform: scale(1.6) rotate(180deg); opacity: 0.6; }
  100% { transform: scale(0); opacity: 0; }
}

@keyframes asteroid-wobble {
  0% { margin-top: -2px; margin-left: 0px; }
  25% { margin-top: 0px; margin-left: 2px; }
  50% { margin-top: 2px; margin-left: 0px; }
  75% { margin-top: 0px; margin-left: -2px; }
  100% { margin-top: -2px; margin-left: 0px; }
}

.word-display {
  display: flex;
  justify-content: center;
  margin-bottom: 2rem;
  flex-wrap: wrap;
}

.letter-box {
  width: 40px;
  height: 40px;
  border: 2px solid #4287f5;
  margin: 0 5px 10px 5px;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 1.8rem;
  font-weight: bold;
  color: #ffffff;
  background-color: rgba(0, 0, 50, 0.7);
  border-radius: 5px;
  text-transform: uppercase;
  box-shadow: 0 0 10px #3d65a8;
}

.status-message {
  font-size: 1.5rem;
  margin: 1rem 0;
  padding: 10px;
  text-align: center;
  border-radius: 5px;
  transition: all 0.3s ease;
}

.status-message.win {
  color: #00ff00;
  background-color: rgba(0, 100, 0, 0.3);
  border: 1px solid #00ff00;
  animation: pulse 1.5s infinite;
}

.status-message.lose {
  color: #ff0000;
  background-color: rgba(100, 0, 0, 0.3);
  border: 1px solid #ff0000;
}

.status-message.time-up {
  color: #ff9900;
  background-color: rgba(255, 153, 0, 0.3);
  border: 1px solid #ff9900;
}

@keyframes pulse {
  0% { box-shadow: 0 0 0 0 rgba(0, 255, 0, 0.7); }
  70% { box-shadow: 0 0 0 10px rgba(0, 255, 0, 0); }
  100% { box-shadow: 0 0 0 0 rgba(0, 255, 0, 0); }
}

.keyboard {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  margin-top: 1rem;
  max-width: 600px;
}

.key-button {
  width: 45px;
  height: 45px;
  font-size: 1.2rem;
  background-color: #1a237e;
  color: white;
  border: 1px solid #536dfe;
  border-radius: 5px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-transform: uppercase;
}

.key-button:hover:not(:disabled) {
  background-color: #3949ab;
  transform: scale(1.05);
  box-shadow: 0 0 10px #536dfe;
}

.key-button:active:not(:disabled) {
  transform: scale(0.95);
}

.key-button.used {
  opacity: 0.5;
  background-color: #424242;
  border-color: #616161;
}

.key-button:disabled {
  cursor: not-allowed;
}

.reset-button {
  margin-top: 2rem;
  padding: 12px 24px;
  font-size: 1.2rem;
  background-color: #4caf50;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 0 10px rgba(76, 175, 80, 0.5);
}

.reset-button:hover {
  background-color: #388e3c;
  transform: scale(1.05);
  box-shadow: 0 0 15px rgba(76, 175, 80, 0.7);
}

.continue-btn {
  margin-top: 2rem;
  padding: 12px 24px;
  font-size: 1.2rem;
  background-color: #03a9f4;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 0 10px rgba(3, 169, 244, 0.5);
}

.continue-btn:hover {
  background-color: #039be5;
  transform: scale(1.05);
  box-shadow: 0 0 15px rgba(3, 169, 244, 0.7);
}

.back-link {
  margin-top: 2rem;
  padding: 10px 20px;
  background-color: #f44336;
  color: white;
  text-decoration: none;
  border-radius: 5px;
  transition: all 0.2s ease;
  box-shadow: 0 0 10px rgba(244, 67, 54, 0.5);
}

.back-link:hover {
  background-color: #d32f2f;
  transform: scale(1.05);
  box-shadow: 0 0 15px rgba(244, 67, 54, 0.7);
}

.time-left {
  font-size: 1.5rem;
  margin: 1rem 0;
  padding: 10px;
  text-align: center;
  border-radius: 5px;
  transition: all 0.3s ease;
}

@media (max-width: 600px) {
  .letter-box {
    width: 30px;
    height: 30px;
    font-size: 1.2rem;
  }
  
  .key-button {
    width: 35px;
    height: 35px;
    font-size: 1rem;
  }
  
  .planet-container {
    width: 200px;
    height: 200px;
  }
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
</style>
