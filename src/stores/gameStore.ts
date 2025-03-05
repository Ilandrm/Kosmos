import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

export const useGameStore = defineStore('game', () => {
  // État
  const score = ref(0)
  const highScore = ref(0)
  const isGameActive = ref(false)
  const timeRemaining = ref(30) // 30 secondes par défaut
  const gameTimer = ref<number | null>(null)
  const bonusCollected = ref(0)
  const collisions = ref(0)
  const maxCollisions = 3 // Nombre maximum de collisions avant game over

  // Getters
  const formattedTime = computed(() => {
    const seconds = Math.floor(timeRemaining.value)
    const milliseconds = Math.floor((timeRemaining.value - seconds) * 100)
    return `${seconds}.${milliseconds.toString().padStart(2, '0')}`
  })

  const lives = computed(() => {
    return maxCollisions - collisions.value
  })

  // Actions
  function startGame() {
    resetGame()
    isGameActive.value = true
    
    // Démarrer le compte à rebours
    gameTimer.value = window.setInterval(() => {
      timeRemaining.value -= 0.1 // Mise à jour 10 fois par seconde pour plus de précision
      
      if (timeRemaining.value <= 0) {
        endGame()
      }
    }, 100)
  }
  
  function endGame() {
    isGameActive.value = false
    
    if (gameTimer.value !== null) {
      clearInterval(gameTimer.value)
      gameTimer.value = null
    }
    
    // Mise à jour du high score si nécessaire
    if (score.value > highScore.value) {
      highScore.value = score.value
    }
  }
  
  function resetGame() {
    score.value = 0
    timeRemaining.value = 30
    bonusCollected.value = 0
    collisions.value = 0
    
    if (gameTimer.value !== null) {
      clearInterval(gameTimer.value)
      gameTimer.value = null
    }
  }
  
  function incrementScore(points: number) {
    score.value += points
  }
  
  function collectBonus() {
    bonusCollected.value++
    incrementScore(50) // Une étoile filante vaut 50 points
  }

  function incrementCollisions() {
    collisions.value++
    return collisions.value >= maxCollisions // Retourne true si game over
  }

  return { 
    score, 
    highScore, 
    isGameActive, 
    timeRemaining, 
    bonusCollected,
    collisions,
    lives,
    formattedTime,
    startGame,
    endGame,
    resetGame,
    incrementScore,
    collectBonus,
    incrementCollisions
  }
})
