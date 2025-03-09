<template>
  <div class="space-hangman-container">
    <h1>Pendu Spatial</h1>
    
    <div class="game-area">
      <!-- Affichage de la planète -->
      <div class="planet-container">
        <div v-html="planetSrc" class="planet-image"></div>
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
      
      <!-- Bouton pour recommencer -->
      <button v-if="gameOver || timeUp" @click="resetGame" class="reset-button">
        Nouvelle Partie
      </button>
      
      <!-- Bouton pour continuer -->
      <button v-if="gameOver || timeUp" @click="continueToNextGame" class="continue-btn">
        Continuer
      </button>
    </div>
    
    <!-- Lien de retour -->
    <router-link to="/" class="back-link">Retour à l'accueil</router-link>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { getNextGame, isLastGame } from '@/services/GameFlowService';

export default defineComponent({
  name: 'SpaceHangmanGame',
  setup() {
    // Liste des mots spatiaux à deviner
    const words = [
      'planète', 'étoile', 'galaxie', 'comète', 'astéroïde', 
      'nébuleuse', 'satellite', 'astronaute', 'cosmos', 'univers',
      'espace', 'jupiter', 'saturne', 'mars', 'mercure', 'vénus', 
      'soleil', 'lune', 'terre', 'uranus', 'neptune', 'pluton',
      'navette', 'station', 'voielactée', 'orbite', 'télescope'
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
    const timeLeft = ref(30);
    const gameStarted = ref(false);
    const gameOverMessageVisible = ref(false);
    const score = ref(0);
    const victoryMessageVisible = ref(false);
    
    // Propriété calculée pour déterminer si le jeu est terminé
    const gameOver = computed(() => gameWon.value || gameLost.value || timeUp.value);
    
    const planetSrc = computed(() => {
      const index = Math.min(errors.value, 5);
      switch (index) {
        case 0: return `<svg width='200' height='200' xmlns='http://www.w3.org/2000/svg'>\n  <defs>\n    <radialGradient id='planetGradient0' cx='50%' cy='50%' r='50%' fx='30%' fy='30%'>\n      <stop offset='0%' stop-color='#64b5f6' />\n      <stop offset='85%' stop-color='#1976d2' />\n      <stop offset='100%' stop-color='#0d47a1' />\n    </radialGradient>\n  </defs>\n  <circle cx='100' cy='100' r='80' fill='url(#planetGradient0)' stroke='#0d47a1' stroke-width='2' />\n  <ellipse cx='70' cy='70' rx='25' ry='20' fill='#2196f3' opacity='0.5' />\n  <ellipse cx='130' cy='110' rx='30' ry='22' fill='#2196f3' opacity='0.4' />\n  <circle cx='50' cy='120' r='15' fill='#2196f3' opacity='0.3' />\n</svg>`;
        case 1: return `<svg width='200' height='200' xmlns='http://www.w3.org/2000/svg'>\n  <defs>\n    <radialGradient id='planetGradient1' cx='50%' cy='50%' r='50%' fx='30%' fy='30%'>\n      <stop offset='0%' stop-color='#4dd0e1' />\n      <stop offset='85%' stop-color='#0097a7' />\n      <stop offset='100%' stop-color='#006064' />\n    </radialGradient>\n  </defs>\n  <circle cx='100' cy='100' r='80' fill='url(#planetGradient1)' stroke='#006064' stroke-width='2' />\n  <ellipse cx='70' cy='70' rx='25' ry='20' fill='#26c6da' opacity='0.5' />\n  <ellipse cx='130' cy='110' rx='30' ry='22' fill='#26c6da' opacity='0.4' />\n  <circle cx='50' cy='120' r='15' fill='#26c6da' opacity='0.3' />\n</svg>`;
        case 2: return `<svg width='200' height='200' xmlns='http://www.w3.org/2000/svg'>\n  <defs>\n    <radialGradient id='planetGradient2' cx='50%' cy='50%' r='50%' fx='30%' fy='30%'>\n      <stop offset='0%' stop-color='#81c784' />\n      <stop offset='85%' stop-color='#388e3c' />\n      <stop offset='100%' stop-color='#1b5e20' />\n    </radialGradient>\n  </defs>\n  <circle cx='100' cy='100' r='80' fill='url(#planetGradient2)' stroke='#1b5e20' stroke-width='2' />\n  <ellipse cx='70' cy='70' rx='25' ry='20' fill='#4caf50' opacity='0.5' />\n  <ellipse cx='130' cy='110' rx='30' ry='22' fill='#4caf50' opacity='0.4' />\n  <circle cx='50' cy='120' r='15' fill='#4caf50' opacity='0.3' />\n</svg>`;
        case 3: return `<svg width='200' height='200' xmlns='http://www.w3.org/2000/svg'>\n  <defs>\n    <radialGradient id='planetGradient3' cx='50%' cy='50%' r='50%' fx='30%' fy='30%'>\n      <stop offset='0%' stop-color='#ffb74d' />\n      <stop offset='85%' stop-color='#f57c00' />\n      <stop offset='100%' stop-color='#e65100' />\n    </radialGradient>\n  </defs>\n  <circle cx='100' cy='100' r='80' fill='url(#planetGradient3)' stroke='#e65100' stroke-width='2' />\n  <ellipse cx='70' cy='70' rx='25' ry='20' fill='#ff9800' opacity='0.5' />\n  <ellipse cx='130' cy='110' rx='30' ry='22' fill='#ff9800' opacity='0.4' />\n  <circle cx='50' cy='120' r='15' fill='#ff9800' opacity='0.3' />\n</svg>`;
        case 4: return `<svg width='200' height='200' xmlns='http://www.w3.org/2000/svg'>\n  <defs>\n    <radialGradient id='planetGradient4' cx='50%' cy='50%' r='50%' fx='30%' fy='30%'>\n      <stop offset='0%' stop-color='#ef5350' />\n      <stop offset='85%' stop-color='#d32f2f' />\n      <stop offset='100%' stop-color='#b71c1c' />\n    </radialGradient>\n  </defs>\n  <circle cx='100' cy='100' r='80' fill='url(#planetGradient4)' stroke='#b71c1c' stroke-width='2' />\n</svg>`;
        case 5: return `<svg width='200' height='200' xmlns='http://www.w3.org/2000/svg'>\n  <defs>\n    <radialGradient id='planetGradient5' cx='50%' cy='50%' r='50%' fx='30%' fy='30%'>\n      <stop offset='0%' stop-color='#b71c1c' />\n      <stop offset='85%' stop-color='#7f0000' />\n      <stop offset='100%' stop-color='#5f0000' />\n    </radialGradient>\n  </defs>\n  <circle cx='100' cy='100' r='80' fill='url(#planetGradient5)' stroke='#5f0000' stroke-width='2' />\n</svg>`;
      }
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
      timeLeft.value = 30;
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
        playSound('success');
        
        // Vérifier si le joueur a gagné
        if (!displayedWord.value.includes('_')) {
          gameWon.value = true;
          statusMessage.value = 'Bravo ! Vous avez sauvé la planète !';
          playSound('victory');
        }
      } else {
        // Incrémenter le compteur d'erreurs
        errors.value++;
        console.log(errors.value); // Log the number of errors
        
        // Jouer un son d'erreur
        playSound('error');
        
        // Vérifier si le joueur a perdu
        if (errors.value >= maxErrors) {
          gameLost.value = true;
          displayedWord.value = selectedWord.value.split('');
          statusMessage.value = 'Perdu ! La planète a été détruite ! Le mot était : ' + selectedWord.value;
          playSound('defeat');
        }
      }
    };
    
    // Fonction pour jouer des sons
    const playSound = (type: 'success' | 'error' | 'victory' | 'defeat') => {
      const audio = new Audio(`/assets/sounds/${type}.mp3`);
      audio.play().catch(e => console.warn('Audio playback failed:', e));
    };
    
    // Fonction pour continuer au jeu suivant
    const continueToNextGame = () => {
      const nextGame = getNextGame('space-hangman');
      if (nextGame === 'alien-hunt') {
        window.location.href = '/games/alien-hunt-3d';
      } else if (nextGame) {
        window.location.href = `/${nextGame}`;
      } else if (isLastGame('space-hangman')) {
        window.location.href = '/completion';
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
      statusMessage.value = 'Temps écoulé ! La planète a été détruite ! Le mot était : ' + selectedWord.value;
      playSound('defeat');
    }
    
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
      continueToNextGame,
      timeLeft,
      gameStarted,
      gameOverMessageVisible,
      score,
      victoryMessageVisible
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
  background-image: url('/assets/images/space-hangman/stars-bg.png');
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
  width: 250px;
  height: 250px;
  margin-bottom: 2rem;
  display: flex;
  justify-content: center;
  align-items: center;
}

.planet-image {
  max-width: 100%;
  max-height: 100%;
  transition: all 0.5s ease;
  animation: float 5s ease-in-out infinite;
}

@keyframes float {
  0% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
  100% { transform: translateY(0); }
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
</style>
