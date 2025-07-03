<template>
  <GameInstruction
        v-if="showInstructions"
        :title="gameInstructions.title"
        :players="gameInstructions.players"
        :time="gameInstructions.time"
        :instruction="gameInstructions.instruction"
        @start="onInstructionComplete"
      />
      
  <div class="decryption-game-container">
    <div class="decryption-game">
      <h2>Déchiffrage</h2>
      
      <p v-if="!showInstructions">Un message important a été crypté. Chaque lettre a été remplacée par un chiffre selon sa position dans l'alphabet.</p>
      <p v-if="!showInstructions" class="encrypted-message">Déchiffrez : <strong>22-4-24-25-18-16-22 15-4 19-15-4-16-8-23-8 14</strong></p>
      
      <div v-if="!showInstructions" class="word-display">
        <span v-for="(letter, index) in currentInput" :key="index" class="letter-box">
          {{ letter }}
        </span>
      </div>
      
      <p v-if="message" :class="isCorrect ? 'success-message' : 'error-message'">{{ message }}</p>
      
      <div v-if="!showInstructions" class="timer">
        Temps écoulé: {{ formattedTime }}
      </div>
      
      <!-- Clavier virtuel -->
      <div v-if="!showInstructions" class="keyboard">
        <button 
          v-for="letter in alphabet" 
          :key="letter" 
          @click="addLetter(letter)"
          class="key-button"
        >
          {{ letter }}
        </button>
        <button 
          @click="deleteLetter" 
          class="key-button special-key"
        >
          ⌫
        </button>
        <button 
          @click="addSpace" 
          class="key-button special-key space-key"
        >
          Espace
        </button>
        <button 
          @click="checkAnswer" 
          class="key-button special-key check-key"
        >
          Vérifier
        </button>
      </div>
      
      <button v-if="isCorrect" @click="continueToNextGame" class="continue-btn">Continuer</button>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import GameInstruction from '../../components/GameInstruction.vue';

export default defineComponent({
  name: 'DecryptionMiniGame',
  components: { GameInstruction },
  setup() {
    const router = useRouter();
    const userInput = ref('');
    const currentInput = ref<string[]>([]);
    const isCorrect = ref(false);
    const message = ref('');
    const startTime = ref(Date.now());
    const elapsedTime = ref(0);
    const timer = ref<number | null>(null);
    const showInstructions = ref(true);
    
    // Alphabet français
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    
    const gameInstructions = {
      title: "Déchiffrage",
      players: "1 joueur",
      time: "Illimité",
      instruction: "Décryptez le message en utilisant le code de substitution"
    };
    
    // La solution
    const correctAnswer = "SAUVONS LA PLANETE K";
    
    const formattedTime = computed(() => {
      const minutes = Math.floor(elapsedTime.value / 60000);
      const seconds = Math.floor((elapsedTime.value % 60000) / 1000);
      return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    });
    
    const addLetter = (letter: string) => {
      currentInput.value.push(letter);
      userInput.value = currentInput.value.join('');
    };
    
    const deleteLetter = () => {
      if (currentInput.value.length > 0) {
        currentInput.value.pop();
        userInput.value = currentInput.value.join('');
      }
    };
    
    const addSpace = () => {
      currentInput.value.push(' ');
      userInput.value = currentInput.value.join('');
    };
    
    const checkAnswer = () => {
      if (userInput.value.toUpperCase() === correctAnswer) {
        isCorrect.value = true;
        message.value = "Bravo ! Vous avez déchiffré le message.";
      } else {
        message.value = "Mauvaise réponse, pensez à la clé de décalage et réessayez à nouveau !";
      }
    };
    
    const continueToNextGame = () => {
      router.push({ name: 'completion' });
    };
    
    function startGame() {
      startTime.value = Date.now();
      elapsedTime.value = 0;
      currentInput.value = [];
      userInput.value = '';
      
      timer.value = setInterval(() => {
        elapsedTime.value = Date.now() - startTime.value;
      }, 1000);
    }
    
    function onInstructionComplete() {
      showInstructions.value = false;
      startGame();
    }
    
    onUnmounted(() => {
      if (timer.value) {
        clearInterval(timer.value);
      }
    });
    
    return {
      userInput,
      currentInput,
      isCorrect,
      message,
      formattedTime,
      checkAnswer,
      continueToNextGame,
      showInstructions,
      gameInstructions,
      onInstructionComplete,
      alphabet,
      addLetter,
      deleteLetter,
      addSpace
    };
  }
});
</script>

<style scoped>
.decryption-game-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: #0a0a2a;
  color: white;
  padding: 20px;
}

.decryption-game {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  width: 100%;
  height: 100vh;
}

@media (max-width: 768px) {
  .decryption-game {
    padding: 10px;
  }
}

h2 {
  color: #00d1ff;
  margin-bottom: 20px;
}

.encrypted-message {
  font-size: 1.2em;
  margin: 20px 0;
}

.word-display {
  margin: 20px 0;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 5px;
}

.letter-box {
  display: inline-block;
  width: 30px;
  height: 40px;
  line-height: 40px;
  text-align: center;
  background-color: rgba(0, 209, 255, 0.2);
  border: 1px solid #00d1ff;
  border-radius: 5px;
  font-size: 1.2em;
  margin: 0 2px;
}

.keyboard {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  margin: 20px 0;
  max-width: 700px;
}

.key-button {
  width: 40px;
  height: 40px;
  background-color: rgba(0, 209, 255, 0.3);
  border: 1px solid #00d1ff;
  color: white;
  border-radius: 5px;
  font-size: 1.1em;
  cursor: pointer;
  transition: all 0.2s;
}

.key-button:hover {
  background-color: rgba(0, 209, 255, 0.5);
  transform: translateY(-2px);
}

.key-button:active {
  transform: translateY(1px);
}

.special-key {
  background-color: rgba(255, 165, 0, 0.3);
  border: 1px solid orange;
}

.space-key {
  width: 120px;
}

.check-key {
  width: 100px;
  background-color: rgba(0, 255, 0, 0.3);
  border: 1px solid #00ff00;
}

.success-message {
  color: #4CAF50;
  font-size: 1.2em;
  margin: 15px 0;
}

.error-message {
  color: #f44336;
  font-size: 1.2em;
  margin: 15px 0;
}

.timer {
  margin: 20px 0;
  font-size: 1.2em;
  color: #00d1ff;
}

.continue-btn {
  margin-top: 20px;
  padding: 10px 20px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 5px;
  font-size: 1.1em;
  cursor: pointer;
}

.continue-btn:hover {
  background-color: #45a049;
}
</style>