<template>
  <div class="quiz-game-container">
    <div class="stars" ref="starsContainer"></div>
    <div class="game-instruction-background" v-if="showInstructions">
      <GameInstruction
        :title="gameInstructions.title"
        :players="gameInstructions.players"
        :time="gameInstructions.time"
        :instruction="gameInstructions.instruction"
        @start="onInstructionComplete"
      />
    </div>
    <div id="quiz-container" v-else>
      <div class="timer-display" v-if="!gameOver">
        Temps restant: {{ timeRemaining }} secondes
      </div>
      <template v-if="!gameOver">
        <div class="quiz-content-wrapper">
          <div class="quiz-question">
            <h2>Question {{ currentQuestion + 1 }}/{{ questions.length }}</h2>
            <p>{{ currentQuestionData.question }}</p>
            <div class="quiz-options">
              <button 
                v-for="(option, index) in currentQuestionData.options" 
                :key="index"
                class="quiz-option"
                :class="{ 'correct': answered && index === currentQuestionData.correctAnswer, 
                          'incorrect': answered && answerSelected === index && index !== currentQuestionData.correctAnswer }"
                :disabled="answered"
                @click="checkAnswer(index)"
              >
                {{ String.fromCharCode(97 + index) }}) {{ option }}
              </button>
            </div>
          </div>
        </div>
      </template>
      
      <div v-else class="victory-message">
        <h2>Félicitations !</h2>
        <p>Vous avez terminé le quiz avec succès !</p>
        <button class="quiz-option" @click="restartGame">Recommencer</button>
        <button class="quiz-option continue-btn" @click="continueToNextGame">Continuer</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { getNextGame } from '@/services/GameFlowService'
import GameInstruction from '../../components/GameInstruction.vue';

// Questions du quiz
const questions = [
  {
    question: "Quel est le slogan de Koesio ?",
    options: [
      "Koesio : votre partenaire pour une transformation digitale réussie",
      "Koesio : des solutions innovantes pour les entreprises de toutes tailles",
      "Koesio : ensemble, construisons l'avenir numérique de votre entreprise",
      "Koesio : au cœur de votre transformation numérique"
    ],
    correctAnswer: 3
  },
  {
    question: "En quelle année Koesio a-t-elle été fondée ?",
    options: ["1991", "2002", "2011", "2021"],
    correctAnswer: 0
  },
  {
    question: "Quel est le rôle du centre de reconditionnement EOLE de Koesio ?",
    options: [
      "Un centre de formation aux métiers du numérique",
      "Un centre de logistique et de reconditionnement des matériels d'impression",
      "Un espace de coworking et d'innovation",
      "Un showroom présentant les dernières technologies de l'entreprise"
    ],
    correctAnswer: 1
  },
  {
    question: "Comment Koesio encourage-t-il la formation et le développement de ses collaborateurs ?",
    options: [
      "En proposant un catalogue de formations en ligne",
      "En mettant en place des parcours de carrière personnalisés",
      "En offrant des opportunités de mobilité interne",
      "Toutes ces réponses"
    ],
    correctAnswer: 3
  },
  {
    question: "Je suis la planète rouge, mais je ne suis pas en colère. Qui suis-je ?",
    options: ["La Terre", "Saturne", "Jupiter", "Mars"],
    correctAnswer: 3
  },
  {
    question: "Koesio propose des contrats de maintenance pour ses photocopieurs. Un contrat coûte 150 € par an et par photocopieur. Si Koesio a 1500 clients et que chaque client possède en moyenne 2 photocopieurs, quel est le chiffre d'affaires potentiel de Koesio avec les contrats de maintenance ?",
    options: ["450 000 €", "583 200 €", "600 000 €", "750 000 €"],
    correctAnswer: 1
  }
]

const shuffledQuestions = ref<typeof questions>([])
const currentQuestion = ref(0)
const gameOver = ref(false)
const answered = ref(false)
const answerSelected = ref(-1)
const starsContainer = ref<HTMLElement | null>(null)
const router = useRouter()
const timeRemaining = ref(0)
const showInstructions = ref(true)
const gameInstructions =  {
  title: "Quizz",
  players: "1 joueurs",
  time: "50 secondes",
  instruction: "Donnez la bonne réponse parmi les 4 propositions"
}
const currentQuestionData = computed(() => {
  // S'assurer qu'une question existe avant de l'accéder
  if (shuffledQuestions.value && shuffledQuestions.value.length > 0 && 
      currentQuestion.value < shuffledQuestions.value.length) {
    return shuffledQuestions.value[currentQuestion.value];
  }
  // Retourner une question par défaut pour éviter les erreurs
  return {
    question: "Chargement de la question...",
    options: ["Chargement..."],
    correctAnswer: 0
  };
})

let timerInterval = null; // Déclaration en haut du script

function shuffleArray(array: any[]) {
  const newArray = [...array]
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]]
  }
  return newArray
}
function onInstructionComplete() {
      showInstructions.value = false;
      startGame();
    }
  
function startGame() {
  // S'assurer que questions est bien défini
  if (questions && questions.length > 0) {
    shuffledQuestions.value = shuffleArray(questions)
    currentQuestion.value = 0
    gameOver.value = false
    answered.value = false
    answerSelected.value = -1
    timeRemaining.value = 50; // Set timer to 50 seconds at game start

    // Nettoyer l'ancien intervalle s'il existe
    if (timerInterval) {
      clearInterval(timerInterval);
    }
    // Démarrer le timer
    timerInterval = setInterval(() => {
      if (timeRemaining.value > 0) {
        timeRemaining.value--;
      } else {
        clearInterval(timerInterval);
        gameOver.value = true; // Fin du jeu lorsque le temps est écoulé
      }
    }, 1000);
  } else {
  }
}

function checkAnswer(selectedIndex: number) {
  answered.value = true
  answerSelected.value = selectedIndex

  setTimeout(() => {
    if (selectedIndex === currentQuestionData.value.correctAnswer) {
      goToNextQuestion()
    } else {
      // Pour une mauvaise réponse, on passe aussi à la question suivante
      goToNextQuestion()
    }
  }, 1000)
}

function goToNextQuestion() {
  currentQuestion.value++
  answered.value = false
  answerSelected.value = -1
  
  if (currentQuestion.value >= shuffledQuestions.value.length) {
    gameOver.value = true
  }
}

function restartGame() {
  startGame()
}

function continueToNextGame() {
  const nextGame = getNextGame('koesio-quiz')
  if (nextGame === 'maze-3d') {
    router.push('/games/maze-3d')
  } else if (nextGame === 'completion') {
    router.push('/completion')
  } else if (nextGame) {
    router.push(`/games/${nextGame}`)
  } else {
    router.push('/')
  }
}

function createStars() {
  if (!starsContainer.value) return
  
  const starCount = 400
  
  for (let i = 0; i < starCount; i++) {
    const star = document.createElement('div')
    star.classList.add('star')
    
    const size = 0.5 + Math.random() * 3
    const opacity = 0.4 + Math.random() * 0.6
    
    star.style.width = `${size}px`
    star.style.height = `${size}px`
    star.style.left = `${Math.random() * 100}%`
    star.style.top = `${Math.random() * 100}%`
    star.style.opacity = String(opacity)
    star.style.animationDelay = `-${Math.random() * 10}s`
    
    starsContainer.value.appendChild(star)
  }
}

function createShootingStars() {
  if (!starsContainer.value) return
  
  const addShootingStar = () => {
    const shootingStar = document.createElement('div')
    shootingStar.classList.add('shooting-star')
    
    shootingStar.style.left = `${Math.random() * 100}%`
    shootingStar.style.top = `${Math.random() * 100}%`
    
    shootingStar.style.animation = 'shooting-star 5s linear infinite'
    
    starsContainer.value?.appendChild(shootingStar)
    
    setTimeout(() => {
      starsContainer.value?.removeChild(shootingStar)
    }, 5000)
  }
  
  setInterval(addShootingStar, 3000)
  setInterval(addShootingStar, 4500)
}

onMounted(() => {
  // Initialiser le jeu avec un léger délai pour s'assurer que tout est chargé
  setTimeout(() => {
    startGame()
  }, 100)
  createStars()
  createShootingStars()
})
</script>

<style scoped>
.quiz-game-container {
  height: 100vh;
  width: 100%;
  margin: 0;
  font-family: 'Orbitron', sans-serif;
  color: white;
  background: 
    radial-gradient(circle at 50% 50%, rgba(0, 41, 102, 0.3) 0%, transparent 100%),
    radial-gradient(circle at 20% 30%, rgba(128, 0, 255, 0.4) 0%, transparent 50%),
    radial-gradient(circle at 80% 70%, rgba(0, 209, 255, 0.3) 0%, transparent 50%),
    radial-gradient(circle at 60% 40%, rgba(238, 130, 238, 0.3) 0%, transparent 60%),
    linear-gradient(45deg, #000428 0%, #140028 30%, #1B004B 70%, #002447 100%);
  position: relative;
  overflow: hidden;
}

.stars {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
}

.star {
  position: absolute;
  background-color: white;
  border-radius: 50%;
  opacity: 0;
  animation: twinkle 3s infinite;
}
.game-instruction-background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: black;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 15;
}
.game-instructions {
  position: relative;
  background: rgba(0, 20, 50, 0.9);
  padding: 30px;
  border-radius: 15px;
  border: 2px solid #00d1ff;
  text-align: center;
  max-width: 80%;
}
.shooting-star {
  position: fixed;
  width: 2px;
  height: 200px;
  background: linear-gradient(to right, rgba(255,255,255,0) 0%, rgba(255,255,255,0.8) 50%, rgba(255,255,255,0) 100%);
  transform: rotate(-45deg);
  opacity: 0;
  z-index: 1;
}

@keyframes twinkle {
  0%, 100% { opacity: 0; }
  50% { opacity: 1; }
}

@keyframes shooting-star {
  0% {
    transform: translateX(-100vw) translateY(100vh) rotate(-45deg);
    opacity: 0;
  }
  50% {
    opacity: 1;
  }
  100% {
    transform: translateX(100vw) translateY(-100vh) rotate(-45deg);
    opacity: 0;
  }
}

#quiz-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 2;
}

.quiz-content-wrapper {
  width: 100%;
  padding: 20px;
}

.quiz-question {
  width: 80%;
  max-width: 1200px;
  margin: 0 auto;
  background: rgba(0, 20, 50, 0.8);
  padding: 20px;
  border-radius: 10px;
  border: 2px solid #00d1ff;
}

.quiz-options {
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;
  margin-top: 20px;
}

.quiz-option {
  font-family: 'Orbitron', sans-serif;
  font-size: 1.2rem;
  padding: 1rem;
  width: 100%;
  text-align: center;
  background: linear-gradient(45deg, #003a66, #00588f);
  border: 2px solid #00d1ff;
  color: white;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
}

.quiz-option:hover:not(:disabled) {
  background: #00d1ff;
  color: black;
}

.quiz-option.correct {
  background: #00ff00;
  color: black;
}

.quiz-option.incorrect {
  background: #ff0000;
  color: white;
}

.timer-display {
  font-size: 1.5rem;
  font-weight: bold;
  color: #00d1ff;
  margin-bottom: 20px;
}

.victory-message {
  text-align: center;
  padding: 30px;
  background: rgba(0, 20, 50, 0.8);
  border-radius: 10px;
  min-width: 300px;
  border: 2px solid #00d1ff;
}

h2 {
  color: #00d1ff;
  margin-bottom: 20px;
}
</style>
